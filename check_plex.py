try:
    import plexapi
    print('PlexAPI version:', plexapi.__version__)
except ImportError:
    print('PlexAPI NOT installed')