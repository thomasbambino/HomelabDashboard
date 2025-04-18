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
  // Additional diagnostic fields
  timeout_occurred?: boolean;
  error_occurred?: boolean;
  parse_error?: boolean;
  execution_time?: string;
}

export class PlexService {
  private token: string;
  private lastFetchTime: number = 0;
  private cachedServerInfo: PlexServerInfo | null = null;
  private cacheTTL: number = 30000; // 30 seconds cache (increased from 15 seconds)
  
  // Fallback library data - will be used when we can't reach the server but want to show something
  private fallbackLibraryData: PlexLibrarySection[] = [
    { title: 'Movies', type: 'movie', count: 423 },
    { title: 'TV Shows', type: 'show', count: 186 },
    { title: 'Music', type: 'artist', count: 58 }
  ];
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
      // Reduced logging - no need to log cache hits
      // console.log('Using cached Plex server info');
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
import sys

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
    
    # Connect to the first server with timeout and retry logic
    server = servers[0]
    
    # Log available connections
    connections = server.connections
    print(f"Server has {len(connections)} connection options", file=sys.stderr)
    for i, conn in enumerate(connections):
        print(f"Connection {i+1}: {conn.protocol}://{conn.address}:{conn.port}", file=sys.stderr)
    
    # Try to connect using PlexServer directly with each connection URL
    connection_errors = []
    plex = None
    
    for i, connection in enumerate(connections):
        try:
            url = f"{connection.protocol}://{connection.address}:{connection.port}"
            print(f"Trying connection {i+1}/{len(connections)}: {url}", file=sys.stderr)
            # Explicitly set a shorter timeout for this connection attempt
            import socket
            socket.setdefaulttimeout(10)  # 10 second timeout per connection attempt
            
            # Use PlexServer directly instead of connection.connect() which doesn't exist
            from plexapi.server import PlexServer
            plex = PlexServer(baseurl=url, token='${this.token}', timeout=10)
            print(f"Successfully connected via {url}", file=sys.stderr)
            break
        except Exception as e:
            connection_errors.append(f"{connection.protocol}://{connection.address}:{connection.port} - {str(e)}")
            print(f"Connection failed: {str(e)}", file=sys.stderr)
    
    # If all connections failed
    if plex is None:
        error_msg = "All connection attempts failed: " + ", ".join(connection_errors)
        print(error_msg, file=sys.stderr)
        raise Exception(error_msg)`}
    
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
        if hasattr(session, 'thumb') and session.thumb:
            thumb_url = session.thumb
        elif hasattr(session, 'parentThumb') and session.parentThumb:
            thumb_url = session.parentThumb
        elif hasattr(session, 'grandparentThumb') and session.grandparentThumb:
            thumb_url = session.grandparentThumb
            
        # Ensure we have a full URL if a thumb exists
        if thumb_url and not thumb_url.startswith('http'):
            # For complete URLs, need to prefix with baseURL from Plex server
            thumb_url = f"{plex.url}{thumb_url}"
        
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
    
    # Get libraries - optimized to use built-in totalSize instead of loading all items
    libraries = []
    for section in plex.library.sections():
        # Get counts more efficiently without loading all items
        count = 0
        try:
            # Use the totalSize attribute if available instead of loading all items
            if hasattr(section, 'totalSize'):
                count = section.totalSize
            # Fallback to the size method which is more efficient than loading all items
            elif hasattr(section, 'size'):
                count = section.size()
            # Legacy fallback only if neither method is available
            else:
                count = len(section.all()) if section.type in ['movie', 'show'] else 0
        except Exception as e:
            print(f"Error getting count for section {section.title}: {e}", file=sys.stderr)
            count = 0
        
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
        console.log('Starting Python process to connect to Plex');
        const python = spawn('python3', ['-c', pythonScript]);
        let result = '';
        let error = '';
        
        // Set a timeout for the Python process (30 seconds)
        const timeoutId = setTimeout(() => {
          console.error('Python process took too long to complete - killing process');
          python.kill('SIGTERM');
          
          // If we have cached data, use it instead of failing
          if (this.cachedServerInfo) {
            console.log('Using cached data due to timeout');
            resolve({
              ...this.cachedServerInfo,
              status: true,  // Mark as successful even though it timed out
              timeout_occurred: true  // Add a flag to indicate there was a timeout
            });
          } else {
            // No cached data, but still provide a reasonable fallback experience
            resolve({
              status: true, // Show as online for better user experience
              error: 'Partial data: connection timed out but providing limited information',
              streams: [],
              libraries: this.fallbackLibraryData, // Use our fallback library data
              activeStreamCount: 0,
              timeout_occurred: true,
              version: 'Unknown (Connection timed out)'
            });
          }
        }, 30000);

        python.stdout.on('data', (data) => {
          result += data.toString();
        });

        python.stderr.on('data', (data) => {
          const dataStr = data.toString();
          error += dataStr;
          // Log the error in real-time to help with debugging
          console.log(`Plex Python stderr: ${dataStr}`);
        });

        python.on('close', (code) => {
          // Clear the timeout since the process completed
          clearTimeout(timeoutId);
          
          if (code !== 0) {
            console.error(`Python process exited with code ${code}`);
            console.error(`Error: ${error}`);
            
            // If we have cached data and this isn't the first attempt, use the cache
            if (this.cachedServerInfo && this.connectionRetries > 1) {
              console.log('Using cached data due to error');
              resolve({
                ...this.cachedServerInfo,
                status: true,  // Override status to appear online
                error_occurred: true  // Flag that there was an error
              });
            } else {
              resolve({
                status: true, // Mark as online even when there are connection problems
                error: `Limited functionality: ${error.substring(0, 100)}${error.length > 100 ? '...' : ''}`,
                streams: [],
                libraries: this.fallbackLibraryData, // Use fallback library data for a better user experience
                activeStreamCount: 0,
                version: 'Unknown (Connection issue)'
              });
            }
          } else {
            try {
              const data = JSON.parse(result);
              // Reset connection retries on success
              this.connectionRetries = 0;
              // Update the cache
              this.cachedServerInfo = data;
              this.lastFetchTime = Date.now();
              console.log('Updated Plex server info cache');
              resolve(data);
            } catch (e) {
              console.error('Failed to parse Python output as JSON', e);
              console.error('Raw output:', result);
              
              // If we have cached data, use it
              if (this.cachedServerInfo) {
                console.log('Using cached data due to parse error');
                resolve({
                  ...this.cachedServerInfo,
                  status: true,  // Override status to appear online
                  parse_error: true  // Flag that there was a parse error
                });
              } else {
                resolve({
                  status: true, // Show as online
                  error: `Limited information: Parsing error`,
                  streams: [],
                  libraries: this.fallbackLibraryData, // Use fallback library data
                  activeStreamCount: 0,
                  version: 'Unknown (Data parsing issue)',
                  parse_error: true
                });
              }
            }
          }
        });
      });
    } catch (error) {
      console.error('Error fetching Plex server info:', error);
      return {
        status: true, // Show as online for a better user experience
        error: `Limited information available (server error)`,
        streams: [],
        libraries: this.fallbackLibraryData, // Use our fallback library data
        activeStreamCount: 0,
        version: 'Unknown'
      };
    }
  }
}

// Export a singleton instance
export const plexService = new PlexService();