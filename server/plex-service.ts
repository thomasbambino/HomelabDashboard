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
}

export class PlexService {
  private token: string;
  private lastFetchTime: number = 0;
  private cachedServerInfo: PlexServerInfo | null = null;
  private cacheTTL: number = 30000; // 30 seconds cache
  private connectionRetries: number = 0;
  private maxRetries: number = 3;
  private baseUrl: string;

  constructor() {
    // We need both the token for Plex.tv API and the server URL
    this.token = process.env.PLEX_TOKEN || '';
    this.baseUrl = process.env.PLEX_URL || '';

    if (!this.token) {
      console.warn('Plex token not configured in environment variables');
    }
    
    if (!this.baseUrl) {
      console.warn('Plex server URL not configured in environment variables');
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
      // Use Python and plexapi to get the server info via Plex.tv API
      const pythonScript = `
from plexapi.myplex import MyPlexAccount
import json
import time

try:
    # Connect via Plex.tv account using token
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
    plex = servers[0].connect()
    
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
        streams: [],
        activeStreamCount: 0
      };
    }
  }
}

// Export a singleton instance
export const plexService = new PlexService();