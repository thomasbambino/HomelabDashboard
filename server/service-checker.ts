import { Service, GameServer } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { services, gameServers } from "@shared/schema";

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
    return {
      status: false,
      responseTime: undefined
    };
  }
}

async function updateServiceStatus(service: Service) {
  console.log(`Checking service ${service.name} (${service.url})`);
  const { status, responseTime } = await checkHttpService(service.url);

  console.log(`Service ${service.name} status: ${status}, response time: ${responseTime}ms`);

  // Update service status
  await db
    .update(services)
    .set({ 
      status, 
      lastChecked: new Date().toISOString() 
    })
    .where(eq(services.id, service.id));

  // Record health history
  try {
    await storage.createServiceHealthRecord({
      serviceId: service.id,
      status,
      responseTime,
      timestamp: new Date()
    });
    console.log(`Health record created for service ${service.name}`);
  } catch (error) {
    console.error('Error creating health record:', error);
  }
}

export async function startServiceChecker() {
  console.log('Starting service checker...');

  // Initial check
  try {
    const allServices = await db.select().from(services);
    console.log(`Found ${allServices.length} services to check`);
    await Promise.all(allServices.map(updateServiceStatus));
  } catch (error) {
    console.error('Error in initial service check:', error);
  }

  // Check services every 30 seconds
  setInterval(async () => {
    try {
      const allServices = await db.select().from(services);
      await Promise.all(allServices.map(updateServiceStatus));
    } catch (error) {
      console.error('Error checking services:', error);
    }
  }, 30000);
}