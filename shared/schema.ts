import { pgTable, text, serial, integer, boolean, jsonb, pgEnum, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum('role', ['admin', 'user', 'pending']);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  defaultRole: roleEnum("defaultRole").notNull().default('pending'),
  siteTitle: text("siteTitle").default("Homelab Dashboard"),
  fontFamily: text("fontFamily").default("Inter"),
  // Application logos
  logoUrl: text("logoUrl"),
  logoUrlLarge: text("logoUrlLarge"),
  loginDescription: text("loginDescription").default("Monitor your services and game servers in real-time with our comprehensive dashboard. Track status, player counts, and get quick access to all your homelab resources."),
  onlineColor: text("onlineColor").default("#22c55e"),
  offlineColor: text("offlineColor").default("#ef4444"),
  // Visibility controls for regular users
  showRefreshInterval: boolean("showRefreshInterval").default(true),
  showLastChecked: boolean("showLastChecked").default(true),
  showServiceUrl: boolean("showServiceUrl").default(true),
  // Visibility controls for admin users
  adminShowRefreshInterval: boolean("adminShowRefreshInterval").default(true),
  adminShowLastChecked: boolean("adminShowLastChecked").default(true),
  adminShowServiceUrl: boolean("adminShowServiceUrl").default(true),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").notNull().default('pending'),
  approved: boolean("approved").notNull().default(false),
  canViewNSFW: boolean("canViewNSFW").notNull().default(false),
  showRefreshInterval: boolean("showRefreshInterval").default(true),
  showLastChecked: boolean("showLastChecked").default(true),
  showServiceUrl: boolean("showServiceUrl").default(true),
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

export const serviceHealthHistory = pgTable("serviceHealthHistory", {
  id: serial("id").primaryKey(),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  status: boolean("status").notNull(),
  responseTime: integer("responseTime"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const userServiceOrder = pgTable("userServiceOrder", {
  userId: integer("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  serviceId: integer("serviceId").notNull().references(() => services.id, { onDelete: 'cascade' }),
  order: integer("order").notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.serviceId] }),
}));

export const insertUserSchema = createInsertSchema(users);
export const insertServiceSchema = createInsertSchema(services);
export const insertGameServerSchema = createInsertSchema(gameServers);
export const insertSettingsSchema = createInsertSchema(settings);
export const insertServiceHealthHistorySchema = createInsertSchema(serviceHealthHistory);
export const insertUserServiceOrderSchema = createInsertSchema(userServiceOrder);

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

export const updateServiceHealthHistorySchema = insertServiceHealthHistorySchema.extend({
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
export type InsertServiceHealthHistory = z.infer<typeof insertServiceHealthHistorySchema>;
export type UpdateServiceHealthHistory = z.infer<typeof updateServiceHealthHistorySchema>;
export type InsertUserServiceOrder = z.infer<typeof insertUserServiceOrderSchema>;
export type User = typeof users.$inferSelect;
export type Service = typeof services.$inferSelect;
export type GameServer = typeof gameServers.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type ServiceHealthHistory = typeof serviceHealthHistory.$inferSelect;
export type UserServiceOrder = typeof userServiceOrder.$inferSelect;