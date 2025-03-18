import { queryClient } from "./queryClient";
import { PlexServerInfo } from "../components/plex-streams";

// The query key for Plex server data
export const PLEX_QUERY_KEY = "/api/services/plex/details";

// Initial placeholder values for immediate loading
const initialPlexData: PlexServerInfo = {
  status: true,
  streams: [],
  libraries: [
    { title: "Movies", type: "movie", count: 0 },
    { title: "TV Shows", type: "show", count: 0 }
  ],
  activeStreamCount: 0,
  version: "Loading...",
  uptime: "Connecting..."
};

// Initialize cache with placeholder data immediately on module load
// This ensures data shows up instantly when components load
queryClient.setQueryData([PLEX_QUERY_KEY], initialPlexData);

// Immediately start fetching data when module loads
// Don't wait for component mount
(async function loadInitialPlexData() {
  try {
    await queryClient.prefetchQuery({
      queryKey: [PLEX_QUERY_KEY],
      staleTime: 30000, // 30 seconds
    });
    console.log("Initial Plex data loaded on module import");
  } catch (error) {
    console.error("Failed to load initial Plex data", error);
  }
})();

/**
 * Prefetch and cache Plex data
 * This can be called on app start to ensure Plex data is ready
 */
export async function prefetchPlexData(): Promise<void> {
  // First set initial data to avoid loading states if cache is empty
  if (!queryClient.getQueryData([PLEX_QUERY_KEY])) {
    queryClient.setQueryData([PLEX_QUERY_KEY], initialPlexData);
  }
  
  // Then fetch the real data
  try {
    await queryClient.prefetchQuery({
      queryKey: [PLEX_QUERY_KEY],
      staleTime: 30000, // 30 seconds
    });
    console.log("Plex data prefetched successfully");
  } catch (error) {
    console.error("Failed to prefetch Plex data", error);
  }
}

/**
 * Manually refresh the Plex data
 */
export async function refreshPlexData(): Promise<void> {
  try {
    await queryClient.invalidateQueries({ queryKey: [PLEX_QUERY_KEY] });
    console.log("Plex data refreshed");
  } catch (error) {
    console.error("Failed to refresh Plex data", error);
  }
}