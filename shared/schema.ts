import { pgTable, text, serial, integer, boolean, jsonb, pgEnum, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum('role', ['admin', 'user', 'pending']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default('pending'),
  approved: boolean("approved").notNull().default(false),
  can_view_nsfw: boolean("can_view_nsfw").notNull().default(false),
  show_uptime_log: boolean("show_uptime_log").notNull().default(false),
  show_service_url: boolean("show_service_url").notNull().default(true),
  show_refresh_interval: boolean("show_refresh_interval").notNull().default(true),
  show_last_checked: boolean("show_last_checked").notNull().default(true),
  service_order: integer("service_order").array().default([]),
  notification_email: text("notification_email"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  default_role: roleEnum("default_role").notNull().default('pending'),
  site_title: text("site_title").default("Homelab Dashboard"),
  font_family: text("font_family").default("Inter"),
  logo_url: text("logo_url"),
  logo_url_large: text("logo_url_large"),
  login_description: text("login_description").default("Monitor your services and game servers in real-time with our comprehensive dashboard. Track status, player counts, and get quick access to all your homelab resources."),
  online_color: text("online_color").default("#22c55e"),
  offline_color: text("offline_color").default("#ef4444"),
  show_refresh_interval: boolean("show_refresh_interval").default(true),
  show_last_checked: boolean("show_last_checked").default(true),
  show_service_url: boolean("show_service_url").default(true),
  show_uptime_log: boolean("show_uptime_log").default(false),
  admin_show_refresh_interval: boolean("admin_show_refresh_interval").default(true),
  admin_show_last_checked: boolean("admin_show_last_checked").default(true),
  admin_show_service_url: boolean("admin_show_service_url").default(true),
  admin_show_uptime_log: boolean("admin_show_uptime_log").default(false),
  notification_email_subject: text("notification_email_subject").default("Service Status Change Alert"),
  notification_email_template: text("notification_email_template").default("Service {serviceName} is now {status}.\n\nCurrent Status: {status}\nLast Checked: {lastChecked}\nResponse Time: {responseTime}ms"),
});

export const serviceNotifications = pgTable("service_notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  service_id: integer("service_id").notNull().references(() => services.id, { onDelete: 'cascade' }),
  enabled: boolean("enabled").notNull().default(true),
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
  refreshInterval: integer("refreshInterval").default(30),
});

export const serviceStatusLogs = pgTable("serviceStatusLogs", {
  id: serial("id").primaryKey(),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  status: boolean("status").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  responseTime: integer("responseTime"),
});

export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertGameServerSchema = createInsertSchema(gameServers);
export const insertSettingsSchema = createInsertSchema(settings);
export const insertServiceStatusLogSchema = createInsertSchema(serviceStatusLogs);
export const insertServiceNotificationSchema = createInsertSchema(serviceNotifications);

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

export const updateServiceNotificationSchema = insertServiceNotificationSchema.extend({
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
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type GameServer = typeof gameServers.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type ServiceStatusLog = typeof serviceStatusLogs.$inferSelect;
export type ServiceNotification = typeof serviceNotifications.$inferSelect;
export type InsertServiceNotification = z.infer<typeof insertServiceNotificationSchema>;
export type UpdateServiceNotification = z.infer<typeof updateServiceNotificationSchema>;