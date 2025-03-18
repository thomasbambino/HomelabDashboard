import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { User, Film, Tv, Pause, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { PLEX_QUERY_KEY, prefetchPlexData, refreshPlexData } from "../lib/plexCache";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

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

export function PlexStreams() {
  const { user } = useAuth();
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [localStreams, setLocalStreams] = useState<PlexStream[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [isFetching, setIsFetching] = useState(false);
  
  // Directly fetch data when component mounts or auth changes
  useEffect(() => {
    if (!user) return; // Don't fetch if not authenticated
    
    const fetchPlexData = async () => {
      setIsFetching(true);
      try {
        const response = await apiRequest("GET", PLEX_QUERY_KEY);
        if (response.ok) {
          const data = await response.json();
          // Log success to debug
          console.log("Plex data direct fetch successful:", data?.activeStreamCount || 0, "streams");
          
          if (data.streams && Array.isArray(data.streams)) {
            setLocalStreams(data.streams);
            setLastUpdateTime(Date.now());
          }
        }
      } catch (error) {
        console.error("Error fetching Plex data:", error);
      } finally {
        setIsFetching(false);
      }
    };
    
    // Initial fetch
    fetchPlexData();
    
    // Set up refresh interval for direct fetch
    const interval = setInterval(() => {
      if (autoRefresh && user) {
        fetchPlexData();
      }
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [user, autoRefresh, refreshInterval]);

  const {
    data: plexInfo,
    isLoading,
    error,
    refetch,
  } = useQuery<PlexServerInfo>({
    queryKey: [PLEX_QUERY_KEY],
    enabled: !!user, // Only run query if authenticated
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // 30 seconds before data is considered stale
    // Use placeholders for initial data to avoid loading state
    placeholderData: {
      status: true,
      streams: [],
      libraries: [
        { title: "Movies", type: "movie", count: 0 },
        { title: "TV Shows", type: "show", count: 0 }
      ],
      activeStreamCount: 0,
      version: "Loading...",
      uptime: "Connecting..."
    }
  });

  // Update local streams whenever the server data changes
  useEffect(() => {
    if (plexInfo?.streams && plexInfo.streams.length > 0) {
      setLocalStreams(plexInfo.streams);
      setLastUpdateTime(Date.now());
    }
  }, [plexInfo]);

  // Continuously update progress for active streams
  useEffect(() => {
    if (!localStreams.length || !lastUpdateTime) return;

    const progressInterval = setInterval(() => {
      setLocalStreams(prevStreams => 
        prevStreams.map(stream => {
          // Only update progress for playing streams
          if (stream.state === 'playing') {
            const elapsedMs = Date.now() - lastUpdateTime;
            const elapsedSec = elapsedMs / 1000;
            
            // Calculate how much progress to add
            // 1000ms duration = 100% progress
            const progressIncrement = (elapsedSec / (stream.duration / 1000)) * 100;
            
            // Cap at 100% and ensure we don't go backwards
            return {
              ...stream,
              progress: Math.min(100, stream.progress + progressIncrement)
            };
          }
          return stream;
        })
      );
      
      // Update the last time we calculated
      setLastUpdateTime(Date.now());
    }, 1000); // Update every second
    
    return () => clearInterval(progressInterval);
  }, [localStreams, lastUpdateTime]);

  // Auto refresh handling
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  // Only show loading skeleton if we're still loading/fetching AND don't have any data yet
  if ((isLoading || isFetching) && !plexInfo && localStreams.length === 0) {
    return <PlexStreamsSkeleton />;
  }

  // If we have error but we have localStreams, show those instead of error
  if (error && !plexInfo && localStreams.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-muted/30">
        <div className="text-destructive">
          Failed to load Plex server information
        </div>
      </div>
    );
  }

  // Use either plexInfo from query or construct a dynamic one based on local data
  const displayInfo = plexInfo || {
    status: true,
    streams: localStreams,
    libraries: [],
    activeStreamCount: localStreams.length,
    version: "Unknown",
    uptime: "Unknown"
  };

  if (!displayInfo.status) {
    return (
      <div className="p-4 border rounded-md bg-muted/30">
        <div className="text-amber-500">Plex server is offline</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          <span className="text-primary">
            {displayInfo.activeStreamCount} active {displayInfo.activeStreamCount === 1 ? "stream" : "streams"}
          </span>
        </div>
      </div>

      {localStreams.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground text-sm border rounded-md bg-muted/20">
          No active streams
        </div>
      ) : (
        <div className="space-y-3">
          {localStreams.map((stream, index) => (
            <div
              key={index}
              className="p-3 border rounded-md bg-card"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mr-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{stream.user}</div>
                    <div className="text-xs text-muted-foreground">
                      {stream.device} • {stream.quality}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  {stream.type === "movie" ? (
                    <Film className="h-4 w-4 text-muted-foreground mr-1" />
                  ) : (
                    <Tv className="h-4 w-4 text-muted-foreground mr-1" />
                  )}
                  {stream.state === "paused" ? (
                    <Pause className="h-4 w-4 text-amber-500" />
                  ) : (
                    <Play className="h-4 w-4 text-green-500" />
                  )}
                </div>
              </div>
              <div className="mb-1 text-sm">{stream.title}</div>
              <div className="relative pt-1">
                <Progress value={stream.progress} className="h-1.5" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <div>
                    {formatTime(
                      Math.floor((stream.duration / 1000) * (stream.progress / 100))
                    )}
                  </div>
                  <div>{formatTime(Math.floor(stream.duration / 1000))}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {displayInfo.libraries && displayInfo.libraries.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Libraries</h4>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {displayInfo.libraries.map((library, index) => (
              <div
                key={index}
                className="p-3 border rounded-md bg-card text-center"
              >
                <div className="text-sm font-medium">{library.title}</div>
                <div className="text-xl font-semibold">{library.count}</div>
                <div className="text-xs text-muted-foreground">
                  {library.type === "movie" ? "Movies" : library.type === "show" ? "Shows" : library.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlexStreamsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 border rounded-md">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <Skeleton className="h-8 w-8 rounded-full mr-2" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-10" />
            </div>
            <Skeleton className="h-4 w-full max-w-[200px] mb-2" />
            <Skeleton className="h-1.5 w-full mb-1" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-10" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}