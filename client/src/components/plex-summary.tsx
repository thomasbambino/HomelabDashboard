import { useQuery } from "@tanstack/react-query";
import { Film, Tv, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlexServerInfo } from "./plex-streams";
import { PLEX_QUERY_KEY, prefetchPlexData, refreshPlexData } from "../lib/plexCache";
import { useEffect, useState } from "react";
import { apiRequest } from "../lib/queryClient";

export function PlexSummary() {
  const [isFetching, setIsFetching] = useState(false);
  
  // Fetch data directly when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setIsFetching(true);
      try {
        await prefetchPlexData();
      } finally {
        setIsFetching(false);
      }
    };
    
    fetchData();
    
    // Set up a refresh interval
    const interval = setInterval(() => {
      refreshPlexData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Get data from the cache via query
  const {
    data: plexInfo,
    isLoading,
    error,
  } = useQuery<PlexServerInfo>({
    queryKey: [PLEX_QUERY_KEY],
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

  // Only show skeleton if both are true: 
  // 1. We're loading the query AND 
  // 2. We're directly fetching AND
  // 3. We don't have any data
  if ((isLoading || isFetching) && !plexInfo) {
    return <PlexSummarySkeleton />;
  }

  // Handle truly empty state (should never happen due to placeholderData)
  if (!plexInfo) {
    return <PlexSummarySkeleton />;
  }

  // Handle error state
  if (error) {
    return (
      <div className="text-destructive text-sm">
        Failed to load Plex info
      </div>
    );
  }

  // Handle offline state
  if (!plexInfo.status) {
    return (
      <div className="text-amber-500 text-sm">
        Plex server is offline
      </div>
    );
  }

  // Get movie and show counts
  const movieLibrary = plexInfo.libraries?.find(lib => lib.type === "movie");
  const showLibrary = plexInfo.libraries?.find(lib => lib.type === "show");
  const movieCount = movieLibrary?.count || 0;
  const showCount = showLibrary?.count || 0;

  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex space-x-4">
        <div className="flex items-center">
          <User className="h-4 w-4 mr-1 text-primary" />
          <span className="text-sm font-medium">
            {plexInfo.activeStreamCount} {plexInfo.activeStreamCount === 1 ? "stream" : "streams"}
          </span>
        </div>
        
        <div className="flex items-center">
          <Film className="h-4 w-4 mr-1 text-primary" />
          <span className="text-sm font-medium">
            {movieCount.toLocaleString()} movies
          </span>
        </div>
        
        <div className="flex items-center">
          <Tv className="h-4 w-4 mr-1 text-primary" />
          <span className="text-sm font-medium">
            {showCount.toLocaleString()} shows
          </span>
        </div>
      </div>
    </div>
  );
}

function PlexSummarySkeleton() {
  return (
    <div className="flex justify-between items-center w-full">
      <div className="flex space-x-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-24" />
      </div>
    </div>
  );
}