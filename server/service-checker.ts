import { Service, GameServer } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { services, gameServers } from "@shared/schema";

// Cache to store the last known status of each service
const statusCache = new Map<number, { status: boolean; lastCheck: number; consecutiveFailures: number }>();

async function checkHttpService(url: string): Promise<{ status: boolean; responseTime?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'GET',  // Using GET instead of HEAD as it's more widely supported
      signal: controller.signal,
      headers: {
        'User-Agent': 'ServiceHealthChecker/1.0'
      }
    });
    const endTime = Date.now();

    clearTimeout(timeout);
    return {
      status: response.ok,
      responseTime: endTime - startTime
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log(`Service check failed for URL ${url}:`, errorMessage);

    // Categorize the error
    const isNetworkError = errorMessage.includes('fetch failed') || 
                          errorMessage.includes('network') ||
                          errorMessage.includes('ECONNREFUSED') ||
                          errorMessage.includes('ETIMEDOUT');

    return {
      status: false,
      responseTime: undefined,
      error: isNetworkError ? 'network_error' : 'service_error'
    };
  }
}

async function updateServiceStatus(service: Service) {
  console.log(`Checking service ${service.name} (${service.url})`);

  // Get cached status
  const cachedStatus = statusCache.get(service.id) || { 
    status: false, 
    lastCheck: 0,
    consecutiveFailures: 0 
  };

  const now = Date.now();

  // Skip check if service was checked recently based on its refreshInterval
  if (service.refreshInterval && 
      (now - cachedStatus.lastCheck) < (service.refreshInterval * 1000)) {
    return;
  }

  // Perform the service check
  const { status, responseTime, error } = await checkHttpService(service.url);
  console.log(`Service ${service.name} status check:`, { status, responseTime, error });

  // Update consecutive failures count
  if (!status) {
    cachedStatus.consecutiveFailures++;
  } else {
    cachedStatus.consecutiveFailures = 0;
  }

  // Only consider a service truly offline after 2 consecutive failures
  // This helps prevent false offline notifications due to temporary issues
  const isOffline = !status && cachedStatus.consecutiveFailures >= 2;

  // Only update database and create log if status has significantly changed
  const hasStatusChanged = cachedStatus.status !== !isOffline;

  if (hasStatusChanged) {
    try {
      // Log the status change
      await storage.createServiceStatusLog(service.id, !isOffline, responseTime);
      console.log(`Status change logged for service ${service.name}: ${!isOffline ? 'Online' : 'Offline'}, Response time: ${responseTime}ms`);

      // Update service status in database
      await db
        .update(services)
        .set({ 
          status: !isOffline, 
          lastChecked: new Date().toISOString(),
          lastError: error ? `${error} at ${new Date().toISOString()}` : null
        })
        .where(eq(services.id, service.id));

      console.log(`Service status updated in database for ${service.name}`);
    } catch (error) {
      console.error('Error updating service status:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          serviceId: service.id,
          serviceName: service.name,
          status: !isOffline,
          responseTime
        });
      }
    }
  } else {
    // Even if status hasn't changed, update the lastChecked timestamp
    try {
      await db
        .update(services)
        .set({ 
          lastChecked: new Date().toISOString(),
          lastError: error ? `${error} at ${new Date().toISOString()}` : null
        })
        .where(eq(services.id, service.id));
    } catch (error) {
      console.error('Error updating lastChecked timestamp:', error);
    }
  }

  // Update cache
  statusCache.set(service.id, {
    status: !isOffline,
    lastCheck: now,
    consecutiveFailures: cachedStatus.consecutiveFailures
  });
}

async function updateGameServerMetrics(gameServers: GameServer[]) {
  for (const server of gameServers) {
    if (!server.hidden) {
      try {
        // Update metrics every time this is called (every 10 seconds)
        await storage.updateGameServer({
          id: server.id,
          lastStatusCheck: new Date()
        });
        console.log(`Updated metrics for game server ${server.name}`);
      } catch (error) {
        console.error(`Error updating game server ${server.name} metrics:`, error);
      }
    }
  }
}

async function checkServicesWithRateLimit(services: Service[], gameServers: GameServer[], batchSize: number = 3) {
  // First check game servers as they need more frequent updates
  for (const server of gameServers) {
    if (!server.hidden && (!server.lastStatusCheck || 
        Date.now() - server.lastStatusCheck.getTime() >= (server.refreshInterval || 30) * 1000)) {  // Status check interval
      try {
        await storage.updateGameServer({
          id: server.id,
          lastStatusCheck: new Date()
        });
      } catch (error) {
        console.error(`Error updating game server ${server.name}:`, error);
      }
    }
  }

  // Then check other services
  for (let i = 0; i < services.length; i += batchSize) {
    const batch = services.slice(i, i + batchSize);
    await Promise.all(batch.map(updateServiceStatus));
    if (i + batchSize < services.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
    }
  }
}

export async function startServiceChecker() {
  console.log('Starting service checker...');

  // Initial check
  try {
    const allServices = await db.select().from(services);
    const allGameServers = await db.select().from(gameServers);
    console.log(`Found ${allServices.length} services and ${allGameServers.length} game servers to check`);
    await checkServicesWithRateLimit(allServices, allGameServers);
  } catch (error) {
    console.error('Error in initial service check:', error);
  }

  // Check game server metrics every 10 seconds
  setInterval(async () => {
    try {
      const allGameServers = await db.select().from(gameServers);
      await updateGameServerMetrics(allGameServers);
    } catch (error) {
      console.error('Error updating game server metrics:', error);
    }
  }, 10000); // Exactly 10 seconds for metrics updates

  // Check services and server status
  setInterval(async () => {
    try {
      const allServices = await db.select().from(services);
      const allGameServers = await db.select().from(gameServers);
      await checkServicesWithRateLimit(allServices, allGameServers);
    } catch (error) {
      console.error('Error checking services:', error);
    }
  }, 3000); // General status check interval
}