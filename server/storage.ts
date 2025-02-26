import {
  Service,
  GameServer,
  User,
  InsertUser,
  InsertService,
  InsertGameServer,
  UpdateService,
  UpdateGameServer,
  UpdateUser,
  users,
  services,
  gameServers,
  settings as settingsTable,
  Settings,
  InsertSettings,
  UpdateSettings,
  serviceStatusLogs,
  ServiceStatusLog,
  notificationPreferences,
  emailTemplates,
  sentNotifications,
  NotificationPreference,
  EmailTemplate,
  SentNotification,
  InsertNotificationPreference,
  InsertEmailTemplate,
  InsertSentNotification,
  UpdateNotificationPreference,
  UpdateEmailTemplate,
  // Add new chat-related imports
  ChatRoom,
  ChatMember,
  ChatMessage,
  ChatAttachment,
  InsertChatRoom,
  InsertChatMember,
  InsertChatMessage,
  InsertChatAttachment,
  UpdateChatRoom,
  UpdateChatMember,
  UpdateChatMessage,
  UpdateChatAttachment,
  chatRooms,
  chatMembers,
  chatMessages,
  chatAttachments,
  LoginAttempt,
  InsertLoginAttempt,
  loginAttempts,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, asc } from "drizzle-orm";
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
  getEmailTemplateByName(name: string): Promise<EmailTemplate | undefined>;

  // Sent Notifications
  createSentNotification(notification: InsertSentNotification): Promise<SentNotification>;
  getRecentSentNotifications(serviceId: number): Promise<SentNotification[]>;

  // Chat Room Methods
  createChatRoom(room: InsertChatRoom): Promise<ChatRoom>;
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  updateChatRoom(room: UpdateChatRoom): Promise<ChatRoom | undefined>;
  listChatRooms(userId: number): Promise<ChatRoom[]>;
  getPublicRoom(): Promise<ChatRoom | undefined>;
  createPublicRoom(): Promise<ChatRoom>;
  ensurePublicRoom(): Promise<ChatRoom>;
  addUserToPublicRoom(userId: number): Promise<void>;

  // Chat Member Methods
  addChatMember(member: InsertChatMember): Promise<ChatMember>;
  removeChatMember(roomId: number, userId: number): Promise<ChatMember | undefined>;
  getChatMembers(roomId: number): Promise<ChatMember[]>;
  isChatMember(roomId: number, userId: number): Promise<boolean>;

  // Chat Message Methods
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(roomId: number, limit?: number, before?: Date): Promise<ChatMessage[]>;
  updateChatMessage(message: UpdateChatMessage): Promise<ChatMessage | undefined>;
  deleteChatMessage(id: number): Promise<ChatMessage | undefined>;

  // Chat Attachment Methods
  createChatAttachment(attachment: InsertChatAttachment): Promise<ChatAttachment>;
  getChatAttachment(id: number): Promise<ChatAttachment | undefined>;
  getChatAttachments(messageId: number): Promise<ChatAttachment[]>;

  //Private Chat Methods
  findPrivateRoom(userId1: number, userId2: number): Promise<ChatRoom | undefined>;
  listPrivateRooms(userId: number): Promise<ChatRoom[]>;
  getChatMember(roomId: number, userId: number): Promise<ChatMember | undefined>;
  listUsers(): Promise<User[]>;

  // Add new methods for login attempts
  getLoginAttempts(identifier: string, ip: string, type: string, windowMs: number): Promise<number>;
  addLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  clearLoginAttempts(identifier: string, ip: string, type: string): Promise<void>;
  getOldestLoginAttempt(identifier: string, ip: string, type: string): Promise<LoginAttempt | undefined>;

  // Add new method for getting game server by instanceId
  getGameServerByInstanceId(instanceId: string): Promise<GameServer | undefined>;
  getGameServer(id: number): Promise<GameServer | undefined>;
  deleteUser(id: number): Promise<User | undefined>;
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
    const [newServer] = await db
      .insert(gameServers)
      .values({
        ...server,
        lastStatusCheck: new Date()
      })
      .returning();
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
      .set({
        ...server,
        lastStatusCheck: new Date()
      })
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

  async getEmailTemplateByName(name: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.name, name));
    return template;
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

  // Chat Room Methods
  async createChatRoom(room: InsertChatRoom): Promise<ChatRoom> {
    const [newRoom] = await db.insert(chatRooms).values(room).returning();
    return newRoom;
  }

  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const [room] = await db.select().from(chatRooms).where(eq(chatRooms.id, id));
    return room;
  }

  async updateChatRoom(room: UpdateChatRoom): Promise<ChatRoom | undefined> {
    const [updatedRoom] = await db
      .update(chatRooms)
      .set(room)
      .where(eq(chatRooms.id, room.id))
      .returning();
    return updatedRoom;
  }

  async listChatRooms(userId: number): Promise<ChatRoom[]> {
    // Get public rooms and rooms where user is a member
    const rooms = await db
      .select()
      .from(chatRooms)
      .where(
        or(
          eq(chatRooms.type, 'public'),
          eq(chatMembers.userId, userId)
        )
      )
      .leftJoin(chatMembers, eq(chatRooms.id, chatMembers.roomId))
      .orderBy(desc(chatRooms.updatedAt));

    return rooms.map(room => ({
      ...room.chat_rooms,
    }));
  }

  async getPublicRoom(): Promise<ChatRoom | undefined> {
    const [room] = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.type, 'public'))
      .limit(1);
    return room;
  }

  async createPublicRoom(): Promise<ChatRoom> {
    const [room] = await db
      .insert(chatRooms)
      .values({
        name: "Public Chat",
        type: "public",
        createdBy: 1, // System user ID
      })
      .returning();
    return room;
  }

  async ensurePublicRoom(): Promise<ChatRoom> {
    let publicRoom = await this.getPublicRoom();
    if (!publicRoom) {
      publicRoom = await this.createPublicRoom();
    }
    return publicRoom;
  }

  async addUserToPublicRoom(userId: number): Promise<void> {
    const publicRoom = await this.ensurePublicRoom();
    // Check if user is already a member
    const existing = await this.getChatMember(publicRoom.id, userId);
    if (!existing) {
      await this.addChatMember({
        roomId: publicRoom.id,
        userId: userId,
        isAdmin: false,
      });
    }
  }

  // Chat Member Methods
  async addChatMember(member: InsertChatMember): Promise<ChatMember> {
    const [newMember] = await db.insert(chatMembers).values(member).returning();
    return newMember;
  }

  async removeChatMember(roomId: number, userId: number): Promise<ChatMember | undefined> {
    const [removedMember] = await db
      .delete(chatMembers)
      .where(
        and(
          eq(chatMembers.roomId, roomId),
          eq(chatMembers.userId, userId)
        )
      )
      .returning();
    return removedMember;
  }

  async getChatMembers(roomId: number): Promise<ChatMember[]> {
    return await db
      .select()
      .from(chatMembers)
      .where(eq(chatMembers.roomId, roomId));
  }

  async isChatMember(roomId: number, userId: number): Promise<boolean> {
    const [member] = await db
      .select()
      .from(chatMembers)
      .where(
        and(
          eq(chatMembers.roomId, roomId),
          eq(chatMembers.userId, userId)
        )
      );
    return !!member;
  }

  // Chat Message Methods
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();

    // Update the room's last message timestamp
    await db
      .update(chatRooms)
      .set({ lastMessageAt: new Date(), updatedAt: new Date() })
      .where(eq(chatRooms.id, message.roomId));

    return newMessage;
  }

  async getChatMessages(roomId: number, limit: number = 50, before?: Date): Promise<ChatMessage[]> {
    let query = db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    if (before) {
      query = query.where(lte(chatMessages.createdAt, before));
    }

    return await query;
  }

  async updateChatMessage(message: UpdateChatMessage): Promise<ChatMessage | undefined> {
    const [updatedMessage] = await db
      .update(chatMessages)
      .set({
        ...message,
        isEdited: true,
        updatedAt: new Date()
      })
      .where(eq(chatMessages.id, message.id))
      .returning();
    return updatedMessage;
  }

  async deleteChatMessage(id: number): Promise<ChatMessage | undefined> {
    const [deletedMessage] = await db
      .delete(chatMessages)
      .where(eq(chatMessages.id, id))
      .returning();
    return deletedMessage;
  }

  // Chat Attachment Methods
  async createChatAttachment(attachment: InsertChatAttachment): Promise<ChatAttachment> {
    const [newAttachment] = await db.insert(chatAttachments).values(attachment).returning();
    return newAttachment;
  }

  async getChatAttachment(id: number): Promise<ChatAttachment | undefined> {
    const [attachment] = await db
      .select()
      .from(chatAttachments)
      .where(eq(chatAttachments.id, id));
    return attachment;
  }

  async getChatAttachments(messageId: number): Promise<ChatAttachment[]> {
    return await db
      .select()
      .from(chatAttachments)
      .where(eq(chatAttachments.messageId, messageId));
  }

  //Private Chat Methods
  async findPrivateRoom(userId1: number, userId2: number): Promise<ChatRoom | undefined> {
    // Find a private room where both users are members
    const rooms = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.type, 'private'))
      .leftJoin(chatMembers, eq(chatRooms.id, chatMembers.roomId));

    for (const room of rooms) {
      const members = await this.getChatMembers(room.chat_rooms.id);
      const memberIds = new Set(members.map(m => m.userId));
      if (memberIds.has(userId1) && memberIds.has(userId2)) {
        return room.chat_rooms;
      }
    }
    return undefined;
  }

  async listPrivateRooms(userId: number): Promise<ChatRoom[]> {
    const rooms = await db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.type, 'private'))
      .leftJoin(chatMembers, eq(chatRooms.id, chatMembers.roomId))
      .where(eq(chatMembers.userId, userId));

    return rooms.map(room => room.chat_rooms);
  }

  async getChatMember(roomId: number, userId: number): Promise<ChatMember | undefined> {
    const [member] = await db
      .select()
      .from(chatMembers)
      .where(
        and(
          eq(chatMembers.roomId, roomId),
          eq(chatMembers.userId, userId)
        )
      );
    return member;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getLoginAttempts(identifier: string, ip: string, type: string, windowMs: number): Promise<number> {
    const windowStart = new Date(Date.now() - windowMs);
    const attempts = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.ip, ip),
          eq(loginAttempts.type, type),
          gte(loginAttempts.timestamp, windowStart)
        )
      );
    return attempts.length;
  }

  async addLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const [newAttempt] = await db
      .insert(loginAttempts)
      .values(attempt)
      .returning();
    return newAttempt;
  }

  async clearLoginAttempts(identifier: string, ip: string, type: string): Promise<void> {
    await db
      .delete(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.ip, ip),
          eq(loginAttempts.type, type)
        )
      );
  }

  async getOldestLoginAttempt(identifier: string, ip: string, type: string): Promise<LoginAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.identifier, identifier),
          eq(loginAttempts.ip, ip),
          eq(loginAttempts.type, type)
        )
      )
      .orderBy(asc(loginAttempts.timestamp))
      .limit(1);
    return attempt;
  }

  async getGameServerByInstanceId(instanceId: string): Promise<GameServer | undefined> {
    const [server] = await db
      .select()
      .from(gameServers)
      .where(eq(gameServers.instanceId, instanceId));
    return server;
  }

  async getGameServer(id: number): Promise<GameServer | undefined> {
    const [server] = await db
      .select()
      .from(gameServers)
      .where(eq(gameServers.id, id));
    return server;
  }

  async deleteUser(id: number): Promise<User | undefined> {
    const [deletedUser] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return deletedUser;
  }
}

export const storage = new DatabaseStorage();