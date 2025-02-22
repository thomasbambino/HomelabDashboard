import { Service, GameServer } from "@shared/schema";
import { storage } from "./storage";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { services, gameServers } from "@shared/schema";

async function checkHttpService(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',  // Use HEAD request to minimize data transfer
      signal: controller.signal
    });

    clearTimeout(timeout);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function updateServiceStatus(service: Service) {
  const status = await checkHttpService(service.url);
  await db
    .update(services)
    .set({ 
      status, 
      lastChecked: new Date().toISOString() 
    })
    .where(eq(services.id, service.id));
}

export async function startServiceChecker() {
  // Check services every 30 seconds
  setInterval(async () => {
    try {
      const allServices = await storage.getAllServices();
      await Promise.all(allServices.map(updateServiceStatus));
    } catch (error) {
      console.error('Error checking services:', error);
    }
  }, 30000);
}
