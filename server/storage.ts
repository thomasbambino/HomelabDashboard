import { Service, GameServer, User, InsertUser, InsertService, InsertGameServer, UpdateService, UpdateGameServer, UpdateUser, users, services, gameServers, settings as settingsTable, Settings, InsertSettings, serviceStatusLogs, ServiceStatusLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(user: UpdateUser): Promise<User | undefined>;
  getAllServices(): Promise<Service[]>;
  getAllGameServers(): Promise<GameServer[]>;
  createService(service: InsertService): Promise<Service>;
  createGameServer(server: InsertGameServer): Promise<GameServer>;
  updateService(service: UpdateService): Promise<Service | undefined>;
  updateGameServer(server: UpdateGameServer): Promise<GameServer | undefined>;
  deleteService(id: number): Promise<Service | undefined>;
  deleteGameServer(id: number): Promise<GameServer | undefined>;
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  sessionStore: session.Store;
  createServiceStatusLog(serviceId: number, status: boolean): Promise<ServiceStatusLog>;
  getServiceStatusLogs(filters?: { 
    serviceId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: boolean;
  }): Promise<ServiceStatusLog[]>;
  getService(id: number): Promise<Service | undefined>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [settings] = await db.select().from(settingsTable);
    const [user] = await db.insert(users).values({
      ...insertUser,
      role: settings?.defaultRole ?? 'pending',
      approved: settings?.defaultRole === 'pending' ? false : true,
    }).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(user: UpdateUser): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, user.id))
      .returning();
    return updatedUser;
  }

  async getAllServices(): Promise<Service[]> {
    return await db.select().from(services);
  }

  async getAllGameServers(): Promise<GameServer[]> {
    return await db.select().from(gameServers);
  }

  async createService(service: InsertService): Promise<Service> {
    const [newService] = await db.insert(services).values(service).returning();
    return newService;
  }

  async createGameServer(server: InsertGameServer): Promise<GameServer> {
    const [newServer] = await db.insert(gameServers).values(server).returning();
    return newServer;
  }

  async updateService(service: UpdateService): Promise<Service | undefined> {
    const [updatedService] = await db
      .update(services)
      .set(service)
      .where(eq(services.id, service.id))
      .returning();
    return updatedService;
  }

  async updateGameServer(server: UpdateGameServer): Promise<GameServer | undefined> {
    const [updatedServer] = await db
      .update(gameServers)
      .set(server)
      .where(eq(gameServers.id, server.id))
      .returning();
    return updatedServer;
  }

  async deleteService(id: number): Promise<Service | undefined> {
    const [deletedService] = await db
      .delete(services)
      .where(eq(services.id, id))
      .returning();
    return deletedService;
  }

  async deleteGameServer(id: number): Promise<GameServer | undefined> {
    const [deletedServer] = await db
      .delete(gameServers)
      .where(eq(gameServers.id, id))
      .returning();
    return deletedServer;
  }

  async getSettings(): Promise<Settings> {
    const [existingSettings] = await db.select().from(settingsTable);
    if (!existingSettings) {
      const [newSettings] = await db.insert(settingsTable).values({}).returning();
      return newSettings;
    }
    return existingSettings;
  }

  async updateSettings(settingsData: Partial<Settings>): Promise<Settings> {
    const [existingSettings] = await db.select().from(settingsTable);
    if (!existingSettings) {
      const [newSettings] = await db.insert(settingsTable).values(settingsData).returning();
      return newSettings;
    }
    const [updatedSettings] = await db
      .update(settingsTable)
      .set(settingsData)
      .where(eq(settingsTable.id, existingSettings.id))
      .returning();
    return updatedSettings;
  }

  async createServiceStatusLog(serviceId: number, status: boolean): Promise<ServiceStatusLog> {
    console.log('Creating service status log:', { serviceId, status, timestamp: new Date() });
    try {
      const [newLog] = await db.insert(serviceStatusLogs)
        .values({
          serviceId,
          status,
          timestamp: new Date(),
        })
        .returning();
      console.log('Created service status log:', newLog);
      return newLog;
    } catch (error) {
      console.error('Error in createServiceStatusLog:', error);
      throw error;
    }
  }

  async getServiceStatusLogs(filters?: {
    serviceId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: boolean;
  }): Promise<ServiceStatusLog[]> {
    console.log('Getting service status logs with filters:', filters);

    // Base query to get all logs with their previous status
    let query = db.select()
      .from(serviceStatusLogs)
      .orderBy(desc(serviceStatusLogs.timestamp));

    // Apply filters
    if (filters?.serviceId !== undefined) {
      query = query.where(eq(serviceStatusLogs.serviceId, filters.serviceId));
    }

    if (filters?.status !== undefined) {
      query = query.where(eq(serviceStatusLogs.status, filters.status));
    }

    if (filters?.startDate) {
      query = query.where(
        and(
          gte(serviceStatusLogs.timestamp, filters.startDate),
          lte(serviceStatusLogs.timestamp, filters.endDate || new Date())
        )
      );
    }

    // Execute the query
    const logs = await query;

    // Filter to only include status changes
    const statusChanges = logs.reduce<ServiceStatusLog[]>((changes, currentLog, index) => {
      // Always include the most recent log
      if (index === 0) {
        changes.push(currentLog);
        return changes;
      }

      // Include logs where status differs from the previous log
      const previousLog = logs[index - 1];
      if (currentLog.serviceId === previousLog.serviceId && currentLog.status !== previousLog.status) {
        changes.push(currentLog);
      }

      return changes;
    }, []);

    console.log(`Found ${statusChanges.length} status changes out of ${logs.length} total logs`);
    return statusChanges;
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }
}

export const storage = new DatabaseStorage();