import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { 
  getAuthUrl, 
  exchangeCodeForTokens, 
  revokeToken, 
  getValidAccessToken,
  setGoogleOAuthConfig,
  isGoogleOAuthConfigured
} from "./googleAuth";
import { parseExcelFile, postsToInsertFormat } from "./excelProcessor";
import { findFileByName, getFolderInfo, listFilesInFolder } from "./googleDrive";
import { getChannelInfo } from "./youtube";
import { processPostNow, getSchedulerStatus } from "./scheduler";

// Initialize Google OAuth config from environment variables
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI) {
  setGoogleOAuthConfig({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
  });
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  google: router({
    // Check if Google OAuth is configured
    isConfigured: publicProcedure.query(() => {
      return { configured: isGoogleOAuthConfigured() };
    }),

    // Get OAuth authorization URL
    getAuthUrl: protectedProcedure
      .input(z.object({
        provider: z.enum(['google_drive', 'google_youtube']),
      }))
      .mutation(({ input }) => {
        const url = getAuthUrl(input.provider);
        return { url };
      }),

    // Handle OAuth callback
    handleCallback: protectedProcedure
      .input(z.object({
        code: z.string(),
        provider: z.enum(['google_drive', 'google_youtube']),
      }))
      .mutation(async ({ ctx, input }) => {
        const tokens = await exchangeCodeForTokens(input.code);
        
        if (!tokens.access_token) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Failed to get access token',
          });
        }

        await db.saveOAuthToken({
          userId: ctx.user.id,
          provider: input.provider,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          scope: tokens.scope || null,
        });

        return { success: true };
      }),

    // Disconnect Google service
    disconnect: protectedProcedure
      .input(z.object({
        provider: z.enum(['google_drive', 'google_youtube']),
      }))
      .mutation(async ({ ctx, input }) => {
        await revokeToken(ctx.user.id, input.provider);
        return { success: true };
      }),

    // Check connection status
    connectionStatus: protectedProcedure.query(async ({ ctx }) => {
      const driveToken = await db.getOAuthToken(ctx.user.id, 'google_drive');
      const youtubeToken = await db.getOAuthToken(ctx.user.id, 'google_youtube');

      return {
        drive: !!driveToken,
        youtube: !!youtubeToken,
      };
    }),

    // Get YouTube channel info
    getChannelInfo: protectedProcedure.query(async ({ ctx }) => {
      try {
        const channel = await getChannelInfo(ctx.user.id);
        return channel;
      } catch (error: any) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: error.message,
        });
      }
    }),
  }),

  drive: router({
    // List files in folder
    listFiles: protectedProcedure
      .input(z.object({
        folderId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const files = await listFilesInFolder(ctx.user.id, input.folderId);
          return files;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
      }),

    // Get folder info
    getFolderInfo: protectedProcedure
      .input(z.object({
        folderId: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const folder = await getFolderInfo(ctx.user.id, input.folderId);
          return folder;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
      }),

    // Find file by name
    findFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        folderId: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        try {
          const file = await findFileByName(ctx.user.id, input.fileName, input.folderId);
          return file;
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
      }),
  }),

  posts: router({
    // Upload Excel and create scheduled posts
    uploadExcel: protectedProcedure
      .input(z.object({
        fileContent: z.string(), // Base64 encoded Excel file
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          // Decode base64
          const buffer = Buffer.from(input.fileContent, 'base64');
          
          // Get user settings for timezone
          const settings = await db.getUserSettings(ctx.user.id);
          const timezone = settings?.timezone || 'America/Sao_Paulo';

          // Parse Excel
          const result = parseExcelFile(buffer, timezone);

          if (result.validRows === 0) {
            throw new TRPCError({
              code: 'BAD_REQUEST',
              message: 'No valid posts found in Excel file',
            });
          }

          // Convert to insert format and save to database
          const insertPosts = postsToInsertFormat(result.posts, ctx.user.id);
          await db.createScheduledPosts(insertPosts);

          return {
            success: true,
            totalRows: result.totalRows,
            validRows: result.validRows,
            errors: result.errors,
            posts: result.posts,
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
          });
        }
      }),

    // List all posts
    list: protectedProcedure
      .input(z.object({
        status: z.enum(['scheduled', 'processing', 'published', 'failed']).optional(),
        limit: z.number().min(1).max(500).default(100),
      }))
      .query(async ({ ctx, input }) => {
        if (input.status) {
          return await db.getScheduledPostsByStatus(ctx.user.id, input.status);
        }
        return await db.getScheduledPostsByUser(ctx.user.id, input.limit);
      }),

    // Get post by ID
    getById: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const post = await db.getScheduledPostById(input.id);
        
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        return post;
      }),

    // Get upcoming posts
    upcoming: protectedProcedure.query(async ({ ctx }) => {
      return await db.getScheduledPostsByStatus(ctx.user.id, 'scheduled');
    }),

    // Get posts published today
    publishedToday: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPostsPublishedToday(ctx.user.id);
    }),

    // Get recent failed posts
    recentFailed: protectedProcedure.query(async ({ ctx }) => {
      return await db.getRecentFailedPosts(ctx.user.id);
    }),

    // Retry failed post
    retry: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getScheduledPostById(input.id);
        
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        if (post.status !== 'failed') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Only failed posts can be retried',
          });
        }

        // Reset status to scheduled
        await db.updateScheduledPostStatus(input.id, 'scheduled', {
          errorMessage: undefined,
        });

        return { success: true };
      }),

    // Publish post now (manual trigger)
    publishNow: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const post = await db.getScheduledPostById(input.id);
        
        if (!post || post.userId !== ctx.user.id) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Post not found',
          });
        }

        try {
          await processPostNow(input.id);
          return { success: true };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error.message,
          });
        }
      }),
  }),

  settings: router({
    // Get user settings
    get: protectedProcedure.query(async ({ ctx }) => {
      let settings = await db.getUserSettings(ctx.user.id);
      
      // Create default settings if not exists
      if (!settings) {
        await db.upsertUserSettings({
          userId: ctx.user.id,
          timezone: 'America/Sao_Paulo',
          notificationsEnabled: true,
        });
        settings = await db.getUserSettings(ctx.user.id);
      }

      return settings;
    }),

    // Update settings
    update: protectedProcedure
      .input(z.object({
        timezone: z.string().optional(),
        driveFolderId: z.string().optional(),
        driveFolderName: z.string().optional(),
        notificationsEnabled: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const current = await db.getUserSettings(ctx.user.id);

        await db.upsertUserSettings({
          userId: ctx.user.id,
          timezone: input.timezone ?? current?.timezone ?? 'America/Sao_Paulo',
          driveFolderId: input.driveFolderId ?? current?.driveFolderId ?? null,
          driveFolderName: input.driveFolderName ?? current?.driveFolderName ?? null,
          notificationsEnabled: input.notificationsEnabled ?? current?.notificationsEnabled ?? true,
        });

        return { success: true };
      }),
  }),

  scheduler: router({
    // Get scheduler status
    status: protectedProcedure.query(() => {
      return getSchedulerStatus();
    }),
  }),

  logs: router({
    // Get logs for a post
    getByPost: protectedProcedure
      .input(z.object({
        postId: z.number(),
      }))
      .query(async ({ input }) => {
        return await db.getLogsByPost(input.postId);
      }),

    // Get user logs
    list: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(500).default(100),
      }))
      .query(async ({ ctx, input }) => {
        return await db.getLogsByUser(ctx.user.id, input.limit);
      }),
  }),
});

export type AppRouter = typeof appRouter;
