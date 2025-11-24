import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  oauthTokens, 
  OAuthToken, 
  InsertOAuthToken,
  scheduledPosts,
  ScheduledPost,
  InsertScheduledPost,
  logs,
  Log,
  InsertLog,
  userSettings,
  UserSettings,
  InsertUserSettings
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= User Management =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= OAuth Tokens =============

export async function saveOAuthToken(token: InsertOAuthToken): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(oauthTokens).values(token).onDuplicateKeyUpdate({
    set: {
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      scope: token.scope,
      updatedAt: new Date(),
    }
  });
}

export async function getOAuthToken(userId: number, provider: string): Promise<OAuthToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(oauthTokens)
    .where(and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function deleteOAuthToken(userId: number, provider: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(oauthTokens).where(
    and(eq(oauthTokens.userId, userId), eq(oauthTokens.provider, provider))
  );
}

// ============= Scheduled Posts =============

export async function createScheduledPost(post: InsertScheduledPost): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scheduledPosts).values(post);
  return Number(result[0].insertId);
}

export async function createScheduledPosts(posts: InsertScheduledPost[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (posts.length === 0) return;
  await db.insert(scheduledPosts).values(posts);
}

export async function getScheduledPostById(id: number): Promise<ScheduledPost | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(scheduledPosts).where(eq(scheduledPosts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getScheduledPostsByUser(userId: number, limit = 100): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(scheduledPosts)
    .where(eq(scheduledPosts.userId, userId))
    .orderBy(desc(scheduledPosts.scheduledTimestamp))
    .limit(limit);
}

export async function getScheduledPostsByStatus(
  userId: number, 
  status: ScheduledPost['status']
): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.userId, userId), eq(scheduledPosts.status, status)))
    .orderBy(asc(scheduledPosts.scheduledTimestamp));
}

export async function getDueScheduledPosts(now: Date): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.status, "scheduled"),
        lte(scheduledPosts.scheduledTimestamp, now)
      )
    )
    .orderBy(asc(scheduledPosts.scheduledTimestamp));
}

export async function updateScheduledPostStatus(
  id: number,
  status: ScheduledPost['status'],
  updates?: {
    publishedAt?: Date;
    externalId?: string;
    publishedUrl?: string;
    errorMessage?: string;
    retryCount?: number;
  }
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(scheduledPosts).set({
    status,
    ...updates,
    updatedAt: new Date(),
  }).where(eq(scheduledPosts.id, id));
}

export async function getPostsPublishedToday(userId: number): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return await db
    .select()
    .from(scheduledPosts)
    .where(
      and(
        eq(scheduledPosts.userId, userId),
        eq(scheduledPosts.status, "published"),
        gte(scheduledPosts.publishedAt, today),
        lte(scheduledPosts.publishedAt, tomorrow)
      )
    )
    .orderBy(desc(scheduledPosts.publishedAt));
}

export async function getRecentFailedPosts(userId: number, limit = 10): Promise<ScheduledPost[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(scheduledPosts)
    .where(and(eq(scheduledPosts.userId, userId), eq(scheduledPosts.status, "failed")))
    .orderBy(desc(scheduledPosts.updatedAt))
    .limit(limit);
}

// ============= Logs =============

export async function createLog(log: InsertLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(logs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create log:", error);
  }
}

export async function getLogsByPost(postId: number, limit = 50): Promise<Log[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(logs)
    .where(eq(logs.postId, postId))
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}

export async function getLogsByUser(userId: number, limit = 100): Promise<Log[]> {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(logs)
    .where(eq(logs.userId, userId))
    .orderBy(desc(logs.createdAt))
    .limit(limit);
}

// ============= User Settings =============

export async function getUserSettings(userId: number): Promise<UserSettings | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.userId, userId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserSettings(settings: InsertUserSettings): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(userSettings).values(settings).onDuplicateKeyUpdate({
    set: {
      timezone: settings.timezone,
      driveFolderId: settings.driveFolderId,
      driveFolderName: settings.driveFolderName,
      notificationsEnabled: settings.notificationsEnabled,
      updatedAt: new Date(),
    }
  });
}
