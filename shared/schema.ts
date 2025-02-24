import { pgTable, text, serial, integer, boolean, jsonb, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum('role', ['admin', 'user', 'pending']);

export const chatRoomTypeEnum = pgEnum('chat_room_type', ['public', 'private', 'group']);

export const messageTypeEnum = pgEnum('message_type', ['text', 'image', 'file']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  role: roleEnum("role").notNull().default('pending'),
  approved: boolean("approved").notNull().default(false),
  enabled: boolean("enabled").notNull().default(true), // New column for account status
  can_view_nsfw: boolean("can_view_nsfw").notNull().default(false),
  show_uptime_log: boolean("show_uptime_log").notNull().default(false),
  show_service_url: boolean("show_service_url").notNull().default(true),
  show_refresh_interval: boolean("show_refresh_interval").notNull().default(true),
  show_last_checked: boolean("show_last_checked").notNull().default(true),
  service_order: integer("service_order").array().default([]),
  isOnline: boolean("is_online").notNull().default(false),
  lastSeen: timestamp("last_seen").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  default_role: roleEnum("default_role").notNull().default('pending'),
  site_title: text("site_title").default("Homelab Dashboard"),
  font_family: text("font_family").default("Inter"),
  logo_url: text("logo_url"),
  logo_url_large: text("logo_url_large"),
  login_description: text("login_description").default("Monitor your services and game servers in real-time with our comprehensive dashboard."),
  online_color: text("online_color").default("#22c55e"),
  offline_color: text("offline_color").default("#ef4444"),
  discord_url: text("discord_url").default("https://discord.gg/YhGnr92Bep"),
  show_refresh_interval: boolean("show_refresh_interval").default(true),
  show_last_checked: boolean("show_last_checked").default(true),
  show_service_url: boolean("show_service_url").default(true),
  show_uptime_log: boolean("show_uptime_log").default(false),
  show_status_badge: boolean("show_status_badge").default(true),
  admin_show_refresh_interval: boolean("admin_show_refresh_interval").default(true),
  admin_show_last_checked: boolean("admin_show_last_checked").default(true),
  admin_show_service_url: boolean("admin_show_service_url").default(true),
  admin_show_uptime_log: boolean("admin_show_uptime_log").default(false),
  admin_show_status_badge: boolean("admin_show_status_badge").default(true),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  status: boolean("status").default(false),
  lastChecked: text("lastChecked").notNull(),
  icon: text("icon"),
  background: text("background"),
  refreshInterval: integer("refreshInterval").default(30),
  isNSFW: boolean("isNSFW").default(false),
  tooltip: text("tooltip"),
  show_status_badge: boolean("show_status_badge").default(true),
});

export const gameServers = pgTable("gameServers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  type: text("type").notNull(),
  status: boolean("status").default(false),
  playerCount: integer("playerCount").default(0),
  maxPlayers: integer("maxPlayers").default(0),
  info: jsonb("info").default({}),
  icon: text("icon"),
  background: text("background"),
  show_player_count: boolean("show_player_count").default(true),
  show_status_badge: boolean("show_status_badge").default(true),
});

export const serviceStatusLogs = pgTable("serviceStatusLogs", {
  id: serial("id").primaryKey(),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  status: boolean("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  responseTime: integer("responseTime"),
});

export const notificationPreferences = pgTable("notificationPreferences", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  email: text("email").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const emailTemplates = pgTable("emailTemplates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  template: text("template").notNull(),
  defaultTemplate: boolean("defaultTemplate").notNull().default(false),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const sentNotifications = pgTable("sentNotifications", {
  id: serial("id").primaryKey(),
  preferenceId: integer("preferenceId").notNull().references(() => notificationPreferences.id, { onDelete: 'cascade' }),
  templateId: integer("templateId").notNull().references(() => emailTemplates.id, { onDelete: 'cascade' }),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  status: boolean("status").notNull(),
  sentAt: timestamp("sentAt").notNull().defaultNow(),
});

export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: chatRoomTypeEnum("type").notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
  isArchived: boolean("is_archived").notNull().default(false),
});

export const chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastRead: timestamp("last_read").notNull().defaultNow(),
  isAdmin: boolean("is_admin").notNull().default(false),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull().references(() => chatRooms.id, { onDelete: 'cascade' }),
  senderId: integer("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: messageTypeEnum("type").notNull().default('text'),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  isEdited: boolean("is_edited").notNull().default(false),
  replyTo: integer("reply_to").references(() => chatMessages.id, { onDelete: 'set null' }),
});

export const chatAttachments = pgTable("chat_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => chatMessages.id, { onDelete: 'cascade' }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  path: text("path").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Add new table for tracking login attempts
export const loginAttempts = pgTable("login_attempts", {
  id: serial("id").primaryKey(),
  identifier: text("identifier").notNull(), // username or email used
  ip: text("ip").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // 'login' or 'reset'
});

export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertGameServerSchema = createInsertSchema(gameServers);
export const insertSettingsSchema = createInsertSchema(settings);
export const insertServiceStatusLogSchema = createInsertSchema(serviceStatusLogs);
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences);
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates);
export const insertSentNotificationSchema = createInsertSchema(sentNotifications);
export const insertChatRoomSchema = createInsertSchema(chatRooms);
export const insertChatMemberSchema = createInsertSchema(chatMembers);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertChatAttachmentSchema = createInsertSchema(chatAttachments);

// Add new types for the login attempts
export const insertLoginAttemptSchema = createInsertSchema(loginAttempts);

export const updateServiceSchema = insertServiceSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateGameServerSchema = insertGameServerSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateUserSchema = insertUserSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateSettingsSchema = insertSettingsSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateNotificationPreferenceSchema = insertNotificationPreferenceSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateEmailTemplateSchema = insertEmailTemplateSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateChatRoomSchema = insertChatRoomSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateChatMemberSchema = insertChatMemberSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateChatMessageSchema = insertChatMessageSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export const updateChatAttachmentSchema = insertChatAttachmentSchema.extend({
  id: z.number(),
}).partial().required({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertGameServer = z.infer<typeof insertGameServerSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type UpdateService = z.infer<typeof updateServiceSchema>;
export type UpdateGameServer = z.infer<typeof updateGameServerSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type InsertSentNotification = z.infer<typeof insertSentNotificationSchema>;
export type UpdateNotificationPreference = z.infer<typeof updateNotificationPreferenceSchema>;
export type UpdateEmailTemplate = z.infer<typeof updateEmailTemplateSchema>;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type GameServer = typeof gameServers.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type ServiceStatusLog = typeof serviceStatusLogs.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type SentNotification = typeof sentNotifications.$inferSelect;
export type InsertChatRoom = z.infer<typeof insertChatRoomSchema>;
export type InsertChatMember = z.infer<typeof insertChatMemberSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertChatAttachment = z.infer<typeof insertChatAttachmentSchema>;
export type UpdateChatRoom = z.infer<typeof updateChatRoomSchema>;
export type UpdateChatMember = z.infer<typeof updateChatMemberSchema>;
export type UpdateChatMessage = z.infer<typeof updateChatMessageSchema>;
export type UpdateChatAttachment = z.infer<typeof updateChatAttachmentSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;
export type ChatMember = typeof chatMembers.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatAttachment = typeof chatAttachments.$inferSelect;

export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;