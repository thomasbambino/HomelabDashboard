import { Service, GameServer, User, InsertUser, InsertService, InsertGameServer, UpdateService, UpdateGameServer, UpdateUser, users, services, gameServers, settings as settingsTable, Settings, InsertSettings, serviceHealthHistory, InsertServiceHealthHistory, ServiceHealthHistory, userServiceOrder, InsertUserServiceOrder } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, asc } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPgSimple(session);

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
  getSettings(): Promise<Settings>;
  updateSettings(settings: Partial<Settings>): Promise<Settings>;
  sessionStore: session.Store;
  createServiceHealthRecord(record: InsertServiceHealthHistory): Promise<ServiceHealthHistory>;
  getServiceHealthHistory(serviceId: number, limit?: number): Promise<ServiceHealthHistory[]>;
  getUserServiceOrder(userId: number): Promise<Service[]>;
  updateUserServiceOrder(userId: number, serviceIds: number[]): Promise<void>;
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

  async createServiceHealthRecord(record: InsertServiceHealthHistory): Promise<ServiceHealthHistory> {
    const [newRecord] = await db.insert(serviceHealthHistory).values(record).returning();
    return newRecord;
  }

  async getServiceHealthHistory(serviceId: number, limit: number = 100): Promise<ServiceHealthHistory[]> {
    return await db
      .select()
      .from(serviceHealthHistory)
      .where(eq(serviceHealthHistory.serviceId, serviceId))
      .orderBy(desc(serviceHealthHistory.timestamp))
      .limit(limit);
  }

  async getUserServiceOrder(userId: number): Promise<Service[]> {
    const orderedServices = await db
      .select({
        service: services,
        order: userServiceOrder.order,
      })
      .from(services)
      .leftJoin(
        userServiceOrder,
        and(
          eq(userServiceOrder.serviceId, services.id),
          eq(userServiceOrder.userId, userId)
        )
      )
      .orderBy(asc(userServiceOrder.order), services.id);

    return orderedServices.map(({ service }) => service);
  }

  async updateUserServiceOrder(userId: number, serviceIds: number[]): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .delete(userServiceOrder)
        .where(eq(userServiceOrder.userId, userId));

      await tx
        .insert(userServiceOrder)
        .values(
          serviceIds.map((serviceId, index) => ({
            userId,
            serviceId,
            order: index,
          }))
        );
    });
  }
}

export const storage = new DatabaseStorage();