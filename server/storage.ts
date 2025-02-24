import { 
  Service, GameServer, User, InsertUser, InsertService, InsertGameServer, 
  UpdateService, UpdateGameServer, UpdateUser, users, services, gameServers, 
  settings as settingsTable, Settings, InsertSettings, UpdateSettings, 
  serviceStatusLogs, ServiceStatusLog, notificationPreferences, emailTemplates,
  sentNotifications, NotificationPreference, EmailTemplate, SentNotification,
  InsertNotificationPreference, InsertEmailTemplate, InsertSentNotification,
  UpdateNotificationPreference, UpdateEmailTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
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
  updateSettings(settings: UpdateSettings): Promise<Settings>;
  sessionStore: session.Store;
  createServiceStatusLog(serviceId: number, status: boolean, responseTime?: number): Promise<ServiceStatusLog>;
  getServiceStatusLogs(filters?: {
    serviceId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: boolean;
  }): Promise<ServiceStatusLog[]>;
  getService(id: number): Promise<Service | undefined>;

  // Notification Preferences
  getNotificationPreference(userId: number, serviceId: number): Promise<NotificationPreference | undefined>;
  getUserNotificationPreferences(userId: number): Promise<NotificationPreference[]>;
  createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreference(preference: UpdateNotificationPreference): Promise<NotificationPreference | undefined>;
  deleteNotificationPreference(id: number): Promise<NotificationPreference | undefined>;

  // Email Templates
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getDefaultEmailTemplate(): Promise<EmailTemplate | undefined>;
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(template: UpdateEmailTemplate): Promise<EmailTemplate | undefined>;

  // Sent Notifications
  createSentNotification(notification: InsertSentNotification): Promise<SentNotification>;
  getRecentSentNotifications(serviceId: number): Promise<SentNotification[]>;
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

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.reset_token, token));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [settings] = await db.select().from(settingsTable);
    const [user] = await db.insert(users).values({
      ...insertUser,
      role: insertUser.role ?? settings?.default_role ?? 'pending',
      approved: insertUser.approved ?? (settings?.default_role === 'pending' ? false : true),
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
      // Create default settings if none exist
      const [newSettings] = await db.insert(settingsTable).values({}).returning();
      return newSettings;
    }
    return existingSettings;
  }

  async updateSettings(settingsData: UpdateSettings): Promise<Settings> {
    const settings = await this.getSettings();

    // Ensure we have a valid settings record
    if (!settings) {
      throw new Error("Settings not found");
    }

    // Perform the update with proper type handling
    const [updatedSettings] = await db
      .update(settingsTable)
      .set(settingsData)
      .where(eq(settingsTable.id, settingsData.id))
      .returning();

    return updatedSettings;
  }

  async createServiceStatusLog(serviceId: number, status: boolean, responseTime?: number): Promise<ServiceStatusLog> {
    const [newLog] = await db.insert(serviceStatusLogs)
      .values({
        serviceId,
        status,
        responseTime,
        timestamp: new Date(),
      })
      .returning();
    return newLog;
  }

  async getServiceStatusLogs(filters?: {
    serviceId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: boolean;
  }): Promise<ServiceStatusLog[]> {
    let conditions = [];

    if (filters?.serviceId !== undefined) {
      conditions.push(eq(serviceStatusLogs.serviceId, filters.serviceId));
    }

    if (filters?.status !== undefined) {
      conditions.push(eq(serviceStatusLogs.status, filters.status));
    }

    if (filters?.startDate && filters?.endDate) {
      conditions.push(
        and(
          gte(serviceStatusLogs.timestamp, filters.startDate),
          lte(serviceStatusLogs.timestamp, filters.endDate)
        )
      );
    }

    const query = conditions.length > 0
      ? db.select().from(serviceStatusLogs).where(and(...conditions))
      : db.select().from(serviceStatusLogs);

    const logs = await query.orderBy(desc(serviceStatusLogs.timestamp));

    // Filter to only include status changes
    const lastStatusByService = new Map<number, boolean>();
    return logs.filter((log) => {
      const lastStatus = lastStatusByService.get(log.serviceId);
      const isChange = lastStatus === undefined || lastStatus !== log.status;
      lastStatusByService.set(log.serviceId, log.status);
      return isChange;
    });
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  // Notification Preferences
  async getNotificationPreference(userId: number, serviceId: number): Promise<NotificationPreference | undefined> {
    const [preference] = await db
      .select()
      .from(notificationPreferences)
      .where(
        and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.serviceId, serviceId)
        )
      );
    return preference;
  }

  async getUserNotificationPreferences(userId: number): Promise<NotificationPreference[]> {
    return await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
  }

  async createNotificationPreference(preference: InsertNotificationPreference): Promise<NotificationPreference> {
    const [newPreference] = await db
      .insert(notificationPreferences)
      .values(preference)
      .returning();
    return newPreference;
  }

  async updateNotificationPreference(preference: UpdateNotificationPreference): Promise<NotificationPreference | undefined> {
    const [updatedPreference] = await db
      .update(notificationPreferences)
      .set(preference)
      .where(eq(notificationPreferences.id, preference.id))
      .returning();
    return updatedPreference;
  }

  async deleteNotificationPreference(id: number): Promise<NotificationPreference | undefined> {
    const [deletedPreference] = await db
      .delete(notificationPreferences)
      .where(eq(notificationPreferences.id, id))
      .returning();
    return deletedPreference;
  }

  // Email Templates
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template;
  }

  async getDefaultEmailTemplate(): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.defaultTemplate, true));
    return template;
  }

  async getAllEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateEmailTemplate(template: UpdateEmailTemplate): Promise<EmailTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set(template)
      .where(eq(emailTemplates.id, template.id))
      .returning();
    return updatedTemplate;
  }

  // Sent Notifications
  async createSentNotification(notification: InsertSentNotification): Promise<SentNotification> {
    const [newNotification] = await db
      .insert(sentNotifications)
      .values(notification)
      .returning();
    return newNotification;
  }

  async getRecentSentNotifications(serviceId: number): Promise<SentNotification[]> {
    return await db
      .select()
      .from(sentNotifications)
      .where(eq(sentNotifications.serviceId, serviceId))
      .orderBy(desc(sentNotifications.sentAt))
      .limit(10);
  }
}

export const storage = new DatabaseStorage();