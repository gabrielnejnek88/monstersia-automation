import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("posts router", () => {
  it("should list posts for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.list({ limit: 10 });

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get upcoming posts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.upcoming();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get posts published today", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.publishedToday();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should get recent failed posts", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.posts.recentFailed();

    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("settings router", () => {
  it("should get user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.get();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("userId");
    expect(result).toHaveProperty("timezone");
  });

  it("should update user settings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.settings.update({
      timezone: "America/New_York",
    });

    expect(result).toEqual({ success: true });
  });
});

describe("google router", () => {
  it("should check if google oauth is configured", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.google.isConfigured();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("configured");
    expect(typeof result.configured).toBe("boolean");
  });

  it("should get connection status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.google.connectionStatus();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("drive");
    expect(result).toHaveProperty("youtube");
    expect(typeof result.drive).toBe("boolean");
    expect(typeof result.youtube).toBe("boolean");
  });
});

describe("scheduler router", () => {
  it("should get scheduler status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.scheduler.status();

    expect(result).toBeDefined();
    expect(result).toHaveProperty("running");
    expect(result).toHaveProperty("processing");
    expect(typeof result.running).toBe("boolean");
    expect(typeof result.processing).toBe("boolean");
  });
});
