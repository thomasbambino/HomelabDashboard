from plexapi.myplex import MyPlexAccount
import sys
import json
import time

# Capture any output for debugging
print("Starting Plex connection test...")

try:
    # Get token from environment or use a provided one
    token = 'r8EuFgdvNHSonbwdT4SA'  # This is the token from your previous process
    
    print(f"Using Plex token: {token[:4]}...{token[-4:]}")
    
    # Connect via Plex.tv account using token
    print("Connecting to Plex.tv account...")
    start_time = time.time()
    account = MyPlexAccount(token=token)
    connect_time = time.time() - start_time
    print(f"Connected to Plex.tv account in {connect_time:.2f} seconds")
    
    # Get the first available server from the account
    print("Retrieving resources...")
    start_time = time.time()
    resources = account.resources()
    resources_time = time.time() - start_time
    print(f"Retrieved {len(resources)} resources in {resources_time:.2f} seconds")
    
    # Filter for servers
    servers = [r for r in resources if r.provides == 'server']
    print(f"Found {len(servers)} servers")
    
    if not servers:
        print(json.dumps({
            'status': False,
            'error': 'No Plex servers found in account',
            'streams': [],
            'activeStreamCount': 0
        }))
        sys.exit(1)
    
    # Detailed information about the server
    server = servers[0]
    print(f"Selected server: {server.name} (Version: {server.product} {server.productVersion})")
    print(f"Connection details: {server.connections[0].protocol}://{server.connections[0].address}:{server.connections[0].port}")
    
    # Connect to the first server with timeout
    print("Connecting to server...")
    start_time = time.time()
    try:
        # Try with a timeout to avoid hanging
        plex = server.connect(timeout=10)  # 10 second timeout
        connect_time = time.time() - start_time
        print(f"Connected to server in {connect_time:.2f} seconds")
    except Exception as connection_error:
        print(f"Failed to connect to server: {str(connection_error)}")
        print("Trying alternative connection methods...")
        
        # Try each available connection
        for i, connection in enumerate(server.connections):
            try:
                print(f"Trying connection {i+1}/{len(server.connections)}: {connection.protocol}://{connection.address}:{connection.port}")
                plex = connection.connect(timeout=10)
                connect_time = time.time() - start_time
                print(f"Connected via alternative method in {connect_time:.2f} seconds")
                break
            except Exception as alt_error:
                print(f"  Failed: {str(alt_error)}")
        else:
            # If we get here, all connection attempts failed
            raise Exception("All connection attempts failed")
    
    # Get server version
    print(f"Server version: {plex.version}")
    
    # Report success
    print(json.dumps({
        'status': True, 
        'server_name': server.name,
        'version': plex.version,
        'connect_time': connect_time
    }, indent=2))

except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    print(json.dumps({
        'status': False,
        'error': str(e),
        'exception_type': type(e).__name__
    }, indent=2))