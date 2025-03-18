import { spawn } from 'child_process';

export interface PlexStream {
  user: string;
  title: string;
  type: string;
  device: string;
  progress: number;
  duration: number;
  quality: string;
  state: string;
}

export interface PlexLibrarySection {
  title: string;
  type: string;
  count: number;
}

export interface PlexServerInfo {
  status: boolean;
  version?: string;
  streams: PlexStream[];
  libraries?: PlexLibrarySection[];
  activeStreamCount: number;
  uptime?: string;
  error?: string; // Add error field for better diagnostics
}

export class PlexService {
  private token: string;
  private lastFetchTime: number = 0;
  private cachedServerInfo: PlexServerInfo | null = null;
  private cacheTTL: number = 15000; // 15 seconds cache for faster refreshes
  private connectionRetries: number = 0;
  private maxRetries: number = 3;
  private baseUrl: string;

  constructor() {
    // We need both the token for Plex.tv API and the server URL
    this.token = process.env.PLEX_TOKEN || '';
    this.baseUrl = process.env.PLEX_URL || '';

    if (!this.token) {
      console.warn('Plex token not configured in environment variables');
    } else {
      console.log('Plex token configured successfully');
    }
    
    if (!this.baseUrl) {
      console.log('No direct Plex server URL configured, will connect via plex.tv account');
    } else {
      console.log(`Using direct Plex server URL: ${this.baseUrl}`);
    }
  }

  async getServerInfo(): Promise<PlexServerInfo> {
    // For debugging purposes - reset retry counter
    this.connectionRetries = 0;
    
    // Check if we have the required credentials
    if (!this.token) {
      console.error('Plex token not provided');
      return {
        status: false,
        error: 'Plex token not configured',
        streams: [],
        activeStreamCount: 0
      };
    }

    // Skip cache for debugging
    console.log('Forcing refresh of Plex server info for debugging');
    
    // Reset retry counter if it's been over 5 minutes since last attempt
    const now = Date.now();
    if (now - this.lastFetchTime > 300000) { // 5 minutes
      this.connectionRetries = 0;
    }
    
    // Don't keep retrying too frequently if failing
    if (this.connectionRetries >= this.maxRetries) {
      // If we have cached data despite exceeding retries, return the cached data
      if (this.cachedServerInfo) {
        console.log('Using cached Plex server info (hit retry limit)');
        return this.cachedServerInfo;
      }
      
      // Otherwise return error state
      return {
        status: false,
        error: 'Failed to connect to Plex server after multiple attempts',
        streams: [],
        activeStreamCount: 0
      };
    }
    
    // Increment the retry counter
    this.connectionRetries++;

    try {
      // Use Python and plexapi to get the server info
      const directServer = this.baseUrl ? true : false;
      
      const pythonScript = `
from plexapi.myplex import MyPlexAccount
from plexapi.server import PlexServer
import json
import time

try:
    # Determine connection method based on available credentials
    ${directServer ? 
      `# Connect directly to server using URL and token
    plex = PlexServer('${this.baseUrl}', '${this.token}')` 
      : 
      `# Connect via Plex.tv account using token
    account = MyPlexAccount(token='${this.token}')
    
    # Get the first available server from the account
    resources = account.resources()
    servers = [r for r in resources if r.provides == 'server']
    
    if not servers:
        print(json.dumps({
            'status': False,
            'error': 'No Plex servers found in account',
            'streams': [],
            'activeStreamCount': 0
        }))
        exit()
    
    # Connect to the first server
    plex = servers[0].connect()`}
    
    # Get current streams
    sessions = plex.sessions()
    streams = []
    
    for session in sessions:
        user = session.usernames[0] if session.usernames else 'Unknown'
        title = session.title
        media_type = session.type
        
        # Get device info
        device = session.players[0].product if session.players else 'Unknown'
        state = session.players[0].state if session.players else 'unknown'
        
        # Calculate progress
        duration = session.duration if hasattr(session, 'duration') else 0
        view_offset = session.viewOffset if hasattr(session, 'viewOffset') else 0
        progress = (view_offset / duration * 100) if duration > 0 else 0
        
        # Get quality
        quality = session.media[0].videoResolution if session.media else 'Unknown'
        
        # Get thumbnail URL - prefer the specific item's thumb, but fall back to parent/grandparent
        thumb_url = None
        
        # Debug available session attributes
        print("Session attributes for debugging thumbnails:")
        for attr in dir(session):
            if not attr.startswith('_') and attr not in ['TYPE', 'TAG', 'METADATA_TYPE']:
                try:
                    value = getattr(session, attr)
                    if 'thumb' in attr.lower() or 'image' in attr.lower() or 'poster' in attr.lower() or 'art' in attr.lower():
                        print(f"  {attr}: {value}")
                except:
                    pass
                    
        # Try to get thumbnails in order of preference
        if hasattr(session, 'thumb') and session.thumb:
            thumb_url = session.thumb
            print(f"Using thumb: {thumb_url}")
        elif hasattr(session, 'parentThumb') and session.parentThumb:
            thumb_url = session.parentThumb
            print(f"Using parentThumb: {thumb_url}")
        elif hasattr(session, 'grandparentThumb') and session.grandparentThumb:
            thumb_url = session.grandparentThumb
            print(f"Using grandparentThumb: {thumb_url}")
        elif hasattr(session, 'art') and session.art:
            thumb_url = session.art
            print(f"Using art: {thumb_url}")
        elif hasattr(session, 'parentArt') and session.parentArt:
            thumb_url = session.parentArt
            print(f"Using parentArt: {thumb_url}")
        elif hasattr(session, 'grandparentArt') and session.grandparentArt:
            thumb_url = session.grandparentArt
            print(f"Using grandparentArt: {thumb_url}")
            
        # Ensure we have a full URL if a thumb exists
        if thumb_url and not thumb_url.startswith('http'):
            # For complete URLs, need to prefix with baseURL from Plex server
            server_url = str(plex.url)
            # Remove any trailing slash from server_url
            if server_url.endswith('/'):
                server_url = server_url[:-1]
            # Make sure thumb_url starts with a single slash
            if thumb_url.startswith('/'):
                thumb_url = thumb_url
            else:
                thumb_url = '/' + thumb_url
                
            thumb_url = f"{server_url}{thumb_url}"
            print(f"Final thumbnail URL: {thumb_url}")
        
        streams.append({
            'user': user,
            'title': title,
            'type': media_type,
            'device': device,
            'progress': progress,
            'duration': duration,
            'quality': quality,
            'state': state,
            'thumb': thumb_url
        })
    
    # Get libraries
    libraries = []
    for section in plex.library.sections():
        count = 0
        if section.type == 'movie':
            count = len(section.all())
        elif section.type == 'show':
            count = len(section.all())
        
        libraries.append({
            'title': section.title,
            'type': section.type,
            'count': count
        })
    
    # Format the server version
    version = plex.version
    
    # Calculate uptime if available
    uptime = "Unknown"
    if hasattr(plex, "startTime"):
        uptime_seconds = int(time.time() - plex.startTime)
        days, remainder = divmod(uptime_seconds, 86400)
        hours, remainder = divmod(remainder, 3600)
        minutes, seconds = divmod(remainder, 60)
        uptime = f"{days}d {hours}h {minutes}m"
    
    # Output JSON
    result = {
        'status': True,
        'version': version,
        'streams': streams,
        'libraries': libraries,
        'activeStreamCount': len(streams),
        'uptime': uptime
    }
    
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({
        'status': False,
        'error': str(e),
        'streams': [],
        'activeStreamCount': 0
    }))
`;

      return new Promise((resolve, reject) => {
        const python = spawn('python3', ['-c', pythonScript]);
        let result = '';
        let error = '';

        python.stdout.on('data', (data) => {
          result += data.toString();
        });

        python.stderr.on('data', (data) => {
          error += data.toString();
        });

        python.on('close', (code) => {
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            console.error(`Error: ${error}`);
            resolve({
              status: false,
              error: `Failed to communicate with Plex server (Exit code: ${code}). Error: ${error.substring(0, 200)}${error.length > 200 ? '...' : ''}`,
              streams: [],
              activeStreamCount: 0
            });
          } else {
            try {
              const data = JSON.parse(result);
              // Update the cache
              this.cachedServerInfo = data;
              this.lastFetchTime = Date.now();
              console.log('Updated Plex server info cache');
              resolve(data);
            } catch (e) {
              console.error('Failed to parse Python output as JSON', e);
              console.error('Raw output:', result);
              resolve({
                status: false,
                error: `Failed to parse Plex server response: ${e instanceof Error ? e.message : 'Unknown error'}`,
                streams: [],
                activeStreamCount: 0
              });
            }
          }
        });
      });
    } catch (error) {
      console.error('Error fetching Plex server info:', error);
      return {
        status: false,
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        streams: [],
        activeStreamCount: 0
      };
    }
  }
}

// Export a singleton instance
export const plexService = new PlexService();