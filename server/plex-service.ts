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
  private cacheTTL: number = 5000; // 5 seconds cache for faster refreshes (reduced from 15s)
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

    // Use cached data if it's still valid
    const now = Date.now();
    if (this.cachedServerInfo && now - this.lastFetchTime < this.cacheTTL) {
      console.log('Using cached Plex server info');
      return this.cachedServerInfo;
    }
    
    // Reset retry counter if it's been over 5 minutes since last attempt
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
    try:
        # First try using direct sessions method
        sessions = plex.sessions()
        print(f"Found {len(sessions)} active sessions using plex.sessions()")
        
        # Debugging: Print out raw session data 
        for i, session in enumerate(sessions):
            print(f"Session {i+1} details: {vars(session)}")
            
        # As a backup, also try getting active sessions via activity
        activity = None
        try:
            activity = plex.activities()
            print(f"Activity data available: {bool(activity)}")
            if activity:
                print(f"Activity types: {[a.type for a in activity]}")
        except Exception as act_err:
            print(f"Error getting activities: {str(act_err)}")
            
        streams = []
        
        for session in sessions:
            try:
                user = session.usernames[0] if hasattr(session, 'usernames') and session.usernames else 'Unknown'
                title = session.title
                media_type = session.type
                
                # Get device info with error handling
                device = 'Unknown'
                state = 'unknown'
                if hasattr(session, 'players') and session.players:
                    device = session.players[0].product if hasattr(session.players[0], 'product') else 'Unknown'
                    state = session.players[0].state if hasattr(session.players[0], 'state') else 'unknown'
                
                # Calculate progress with better error handling
                duration = 0
                view_offset = 0
                if hasattr(session, 'duration'):
                    duration = session.duration
                if hasattr(session, 'viewOffset'):
                    view_offset = session.viewOffset
                
                progress = 0
                if duration > 0 and view_offset >= 0:
                    progress = (view_offset / duration * 100)
                
                # Get quality with error handling
                quality = 'Unknown'
                if hasattr(session, 'media') and session.media:
                    quality = session.media[0].videoResolution if hasattr(session.media[0], 'videoResolution') else 'Unknown'
                
                streams.append({
                    'user': user,
                    'title': title,
                    'type': media_type,
                    'device': device,
                    'progress': progress,
                    'duration': duration,
                    'quality': quality,
                    'state': state
                })
                print(f"Added stream: {title} for user {user}")
            except Exception as session_err:
                print(f"Error processing session: {str(session_err)}")
                # Try to extract minimal information
                try:
                    fallback_title = session.title if hasattr(session, 'title') else 'Unknown Title'
                    fallback_user = session.usernames[0] if hasattr(session, 'usernames') and session.usernames else 'Unknown User'
                    fallback_type = session.type if hasattr(session, 'type') else 'Unknown Type'
                    
                    streams.append({
                        'user': fallback_user,
                        'title': fallback_title,
                        'type': fallback_type,
                        'device': 'Error retrieving device',
                        'progress': 0,
                        'duration': 0,
                        'quality': 'Unknown',
                        'state': 'unknown'
                    })
                    print(f"Added fallback stream: {fallback_title}")
                except:
                    print("Failed to extract even fallback data for this session")
                
        # Verify the streams data
        print(f"Found a total of {len(streams)} streams")
        print(f"Streams data: {streams}")
    except Exception as e:
        print(f"Error getting sessions: {str(e)}")
        streams = []
    
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
        console.log('Spawning Python to fetch Plex data');
        const python = spawn('python3', ['-c', pythonScript]);
        let result = '';
        let error = '';

        python.stdout.on('data', (data) => {
          const chunk = data.toString();
          console.log('Python stdout:', chunk);
          result += chunk;
        });

        python.stderr.on('data', (data) => {
          const chunk = data.toString();
          console.error('Python stderr:', chunk);
          error += chunk;
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