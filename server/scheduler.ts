import * as cron from 'node-cron';
import { 
  getDueScheduledPosts, 
  updateScheduledPostStatus, 
  createLog,
  getUserSettings 
} from './db';
import { findFileByName, getFileStream } from './googleDrive';
import { uploadVideo } from './youtube';

let schedulerTask: ReturnType<typeof cron.schedule> | null = null;
let isProcessing = false;

/**
 * Start the scheduler that runs every minute
 */
export function startScheduler() {
  if (schedulerTask) {
    console.log('[Scheduler] Already running');
    return;
  }

  // Run every minute
  schedulerTask = cron.schedule('* * * * *', async () => {
    if (isProcessing) {
      console.log('[Scheduler] Previous job still processing, skipping...');
      return;
    }

    isProcessing = true;
    try {
      await processScheduledPosts();
    } catch (error) {
      console.error('[Scheduler] Error processing posts:', error);
    } finally {
      isProcessing = false;
    }
  });

  console.log('[Scheduler] Started - running every minute');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    console.log('[Scheduler] Stopped');
  }
}

/**
 * Process all due scheduled posts
 */
async function processScheduledPosts() {
  const now = new Date();
  const duePosts = await getDueScheduledPosts(now);

  if (duePosts.length === 0) {
    return;
  }

  console.log(`[Scheduler] Found ${duePosts.length} posts to process`);

  // Process posts sequentially to avoid rate limits
  for (const post of duePosts) {
    try {
      await processPost(post.id, post.userId, post.videoFile, {
        title: post.title,
        description: post.description || '',
        hashtags: post.hashtags || '',
      });
    } catch (error: any) {
      console.error(`[Scheduler] Failed to process post ${post.id}:`, error);
      
      // Log error
      await createLog({
        userId: post.userId,
        postId: post.id,
        level: 'error',
        message: `Failed to publish post: ${error.message}`,
        details: JSON.stringify({
          error: error.message,
          stack: error.stack,
          postId: post.id,
          videoFile: post.videoFile,
        }),
      });
    }
  }
}

/**
 * Process a single post
 */
async function processPost(
  postId: number,
  userId: number,
  videoFile: string,
  content: { title: string; description: string; hashtags: string }
) {
  console.log(`[Scheduler] Processing post ${postId}: ${videoFile}`);

  // Update status to processing
  await updateScheduledPostStatus(postId, 'processing');

  try {
    // Get user settings for Drive folder
    const settings = await getUserSettings(userId);
    const folderId = settings?.driveFolderId || undefined;

    // Find video file in Google Drive
    console.log(`[Scheduler] Searching for file: ${videoFile}`);
    const driveFile = await findFileByName(userId, videoFile, folderId);

    if (!driveFile) {
      throw new Error(`Video file not found in Google Drive: ${videoFile}`);
    }

    console.log(`[Scheduler] Found file: ${driveFile.name} (${driveFile.id})`);

    // Get file stream from Drive
    const videoStream = await getFileStream(userId, driveFile.id);

    // Prepare description with hashtags
    let fullDescription = content.description;
    if (content.hashtags) {
      fullDescription = fullDescription 
        ? `${fullDescription}\n\n${content.hashtags}`
        : content.hashtags;
    }

    // Upload to YouTube
    console.log(`[Scheduler] Uploading to YouTube: ${content.title}`);
    const result = await uploadVideo(userId, videoStream, {
      title: content.title,
      description: fullDescription,
      privacyStatus: 'public',
    });

    console.log(`[Scheduler] Successfully uploaded: ${result.videoUrl}`);

    // Update post status to published
    await updateScheduledPostStatus(postId, 'published', {
      publishedAt: new Date(),
      externalId: result.videoId,
      publishedUrl: result.videoUrl,
    });

    // Log success
    await createLog({
      userId,
      postId,
      level: 'info',
      message: `Successfully published to YouTube: ${result.videoUrl}`,
      details: JSON.stringify({
        videoId: result.videoId,
        videoUrl: result.videoUrl,
        title: result.title,
        publishedAt: result.publishedAt,
      }),
    });

  } catch (error: any) {
    console.error(`[Scheduler] Error processing post ${postId}:`, error);

    // Update post status to failed
    await updateScheduledPostStatus(postId, 'failed', {
      errorMessage: error.message,
    });

    // Re-throw to be caught by outer handler
    throw error;
  }
}

/**
 * Manually trigger processing of a specific post
 */
export async function processPostNow(postId: number): Promise<void> {
  const { getScheduledPostById } = await import('./db');
  const post = await getScheduledPostById(postId);

  if (!post) {
    throw new Error('Post not found');
  }

  if (post.status !== 'scheduled' && post.status !== 'failed') {
    throw new Error(`Cannot process post with status: ${post.status}`);
  }

  await processPost(post.id, post.userId, post.videoFile, {
    title: post.title,
    description: post.description || '',
    hashtags: post.hashtags || '',
  });
}

/**
 * Get scheduler status
 */
export function getSchedulerStatus() {
  return {
    running: schedulerTask !== null,
    processing: isProcessing,
  };
}
