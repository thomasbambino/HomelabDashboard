import { spawn } from 'child_process';
import { storage } from './storage.js';

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

  constructor() {
    // We only need the token for Plex.tv API
    this.token = process.env.PLEX_TOKEN || '';

    if (!this.token) {
      console.warn('Plex token not configured in environment variables');
    }
  }

  async getServerInfo(): Promise<PlexServerInfo> {
    if (!this.token) {
      return {
        status: false,
        streams: [],
        activeStreamCount: 0
      };
    }

    // First check memory cache
    const now = Date.now();
    if (this.cachedServerInfo && now - this.lastFetchTime < this.cacheTTL) {
      console.log('Using memory-cached Plex server info');
      return this.cachedServerInfo;
    }

    // Then check database cache
    const cachedData = await storage.getCachedPlexData();
    const lastUpdateTime = await storage.getPlexDataUpdateTime();

    // Check if the cache is still valid (less than 5 minutes old)
    const dbCacheValid = lastUpdateTime && (now - lastUpdateTime.getTime() < 300000);

    // If we have valid DB cached data, use it
    if (cachedData && dbCacheValid) {
      try {
        console.log('Using database-cached Plex server info');
        const parsedData = JSON.parse(cachedData) as PlexServerInfo;
        
        // Update the memory cache too
        this.cachedServerInfo = parsedData;
        this.lastFetchTime = now;
        
        return parsedData;
      } catch (e) {
        console.error('Failed to parse cached Plex data from database:', e);
        // Continue with fresh fetch if cache parsing fails
      }
    }

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
              // Update the memory cache
              this.cachedServerInfo = data;
              this.lastFetchTime = Date.now();
              console.log('Updated Plex server info memory cache');
              
              // Also save to database for persistence
              storage.saveCachedPlexData(JSON.stringify(data))
                .then(() => {
                  console.log('Updated Plex server info database cache');
                })
                .catch(dbError => {
                  console.error('Failed to save Plex data to database:', dbError);
                  // Continue even if DB save fails
                });
              
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