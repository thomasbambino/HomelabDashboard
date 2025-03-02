from plexapi.server import PlexServer
import sys
import json

try:
    baseurl = sys.argv[1]
    token = sys.argv[2]

    print(f"Connecting to Plex server at {baseurl}", file=sys.stderr)

    # Create server instance and get sessions
    server = PlexServer(baseurl, token)
    sessions = server.sessions()

    print(f"Found {len(sessions)} active sessions", file=sys.stderr)

    # Get detailed information about each session
    session_details = []
    for s in sessions:
        detail = {
            "type": s.type,
            "title": s.title if hasattr(s, 'title') else "Unknown",
            "user": s.usernames[0] if s.usernames else "Unknown",
            "player": s.players[0].title if s.players else "Unknown",
            "state": s.players[0].state if s.players else "unknown"
        }
        print(f"Session detail: {json.dumps(detail)}", file=sys.stderr)
        session_details.append(detail)

    result = {
        "activeStreams": len(sessions),
        "sessionDetails": session_details
    }

    print(json.dumps(result))
except Exception as e:
    print(f"Error in Plex script: {str(e)}", file=sys.stderr)
    print(json.dumps({"error": str(e)}))