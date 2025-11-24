import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * OAuth tokens for Google services (Drive and YouTube)
 */
export const oauthTokens = mysqlTable("oauthTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'google_drive' or 'google_youtube'
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  expiresAt: timestamp("expiresAt"),
  scope: text("scope"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;

/**
 * Scheduled posts from Excel import
 */
export const scheduledPosts = mysqlTable("scheduledPosts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Schedule info
  scheduledDate: varchar("scheduledDate", { length: 10 }).notNull(), // YYYY-MM-DD
  scheduledTime: varchar("scheduledTime", { length: 5 }).notNull(), // HH:MM
  scheduledTimestamp: timestamp("scheduledTimestamp").notNull(), // Combined datetime for easier querying
  
  // Platform and content
  platform: varchar("platform", { length: 50 }).notNull(), // 'YouTube' or 'YouTube Shorts'
  title: text("title").notNull(),
  description: text("description"),
  hashtags: text("hashtags"),
  prompt: text("prompt"), // Optional field from Excel
  videoFile: varchar("videoFile", { length: 255 }).notNull(), // Filename in Google Drive
  
  // Status tracking
  status: mysqlEnum("status", ["scheduled", "processing", "published", "failed"]).default("scheduled").notNull(),
  
  // Publication results
  publishedAt: timestamp("publishedAt"),
  externalId: varchar("externalId", { length: 255 }), // YouTube video ID
  publishedUrl: text("publishedUrl"), // Full YouTube URL
  
  // Error tracking
  errorMessage: text("errorMessage"),
  retryCount: int("retryCount").default(0).notNull(),
  
  // Metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledPost = typeof scheduledPosts.$inferSelect;
export type InsertScheduledPost = typeof scheduledPosts.$inferInsert;

/**
 * Activity logs for debugging and audit trail
 */
export const logs = mysqlTable("logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  postId: int("postId"),
  level: mysqlEnum("level", ["info", "warning", "error"]).notNull(),
  message: text("message").notNull(),
  details: text("details"), // JSON string with additional context
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Log = typeof logs.$inferSelect;
export type InsertLog = typeof logs.$inferInsert;

/**
 * User settings and preferences
 */
export const userSettings = mysqlTable("userSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo").notNull(),
  driveFolderId: varchar("driveFolderId", { length: 255 }), // Google Drive folder ID
  driveFolderName: varchar("driveFolderName", { length: 255 }), // Folder name for display
  notificationsEnabled: boolean("notificationsEnabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;
