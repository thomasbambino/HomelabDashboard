import { Service, GameServer } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { services, gameServers } from "@shared/schema";

// Cache to store the last known status of each service
const statusCache = new Map<number, { status: boolean; lastCheck: number }>();

async function checkHttpService(url: string): Promise<{ status: boolean; responseTime?: number }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const startTime = Date.now();
    const response = await fetch(url, {
      method: 'HEAD',  // Use HEAD request to minimize data transfer
      signal: controller.signal
    });
    const endTime = Date.now();

    clearTimeout(timeout);
    return {
      status: response.ok,
      responseTime: endTime - startTime
    };
  } catch (error) {
    console.log(`Service check failed for URL ${url}:`, error);
    return {
      status: false,
      responseTime: undefined
    };
  }
}

async function updateServiceStatus(service: Service) {
  console.log(`Checking service ${service.name} (${service.url})`);

  // Skip check if service was checked recently based on its refreshInterval
  const cachedStatus = statusCache.get(service.id);
  const now = Date.now();
  if (cachedStatus && 
      (now - cachedStatus.lastCheck) < (service.refreshInterval * 1000)) {
    return;
  }

  const { status, responseTime } = await checkHttpService(service.url);
  console.log(`Service ${service.name} status: ${status}, response time: ${responseTime}ms`);

  // Only update database and create log if status has changed
  const hasStatusChanged = !cachedStatus || cachedStatus.status !== status;

  if (hasStatusChanged) {
    try {
      await storage.createServiceStatusLog(service.id, status, responseTime);
      console.log(`Status logged for service ${service.name}: ${status ? 'Online' : 'Offline'}, Response time: ${responseTime}ms`);
    } catch (error) {
      console.error('Error logging status:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          serviceId: service.id,
          serviceName: service.name,
          status,
          responseTime
        });
      }
    }

    // Update service status in database
    try {
      await db
        .update(services)
        .set({ 
          status, 
          lastChecked: new Date().toISOString() 
        })
        .where(eq(services.id, service.id));

      console.log(`Service status updated in database for ${service.name}`);
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  }

  // Update cache
  statusCache.set(service.id, {
    status,
    lastCheck: now
  });
}

// Rate limit concurrent service checks
async function checkServicesWithRateLimit(services: Service[], batchSize: number = 3) {
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
    console.log(`Found ${allServices.length} services to check`);
    await checkServicesWithRateLimit(allServices);
  } catch (error) {
    console.error('Error in initial service check:', error);
  }

  // Check services at their specified intervals
  setInterval(async () => {
    try {
      const allServices = await db.select().from(services);
      await checkServicesWithRateLimit(allServices);
    } catch (error) {
      console.error('Error checking services:', error);
    }
  }, 10000); // Base interval of 10 seconds, individual service checks controlled by refreshInterval
}