import { google } from 'googleapis';
import { createOAuth2Client, getValidAccessToken } from './googleAuth';
import { Readable } from 'stream';

export interface YouTubeUploadOptions {
  title: string;
  description: string;
  tags?: string[];
  privacyStatus?: 'public' | 'private' | 'unlisted';
}

export interface YouTubeUploadResult {
  videoId: string;
  videoUrl: string;
  title: string;
  publishedAt: string;
}

export async function uploadVideo(
  userId: number,
  videoStream: Readable | Buffer,
  options: YouTubeUploadOptions
): Promise<YouTubeUploadResult> {
  const accessToken = await getValidAccessToken(userId, 'google_youtube');
  if (!accessToken) {
    throw new Error('YouTube not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  // Prepare video metadata
  const videoMetadata = {
    snippet: {
      title: options.title,
      description: options.description,
      tags: options.tags || [],
      categoryId: '22', // People & Blogs - suitable for Shorts
    },
    status: {
      privacyStatus: options.privacyStatus || 'public',
      selfDeclaredMadeForKids: false,
    },
  };

  // Convert Buffer to Readable stream if needed
  let mediaStream: Readable;
  if (Buffer.isBuffer(videoStream)) {
    mediaStream = Readable.from(videoStream);
  } else {
    mediaStream = videoStream;
  }

  try {
    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: videoMetadata,
      media: {
        body: mediaStream,
      },
    });

    const videoId = response.data.id!;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return {
      videoId,
      videoUrl,
      title: response.data.snippet?.title || options.title,
      publishedAt: response.data.snippet?.publishedAt || new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('YouTube upload error:', error);
    
    // Extract meaningful error message
    let errorMessage = 'Failed to upload video to YouTube';
    if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

export async function getVideoInfo(userId: number, videoId: string) {
  const accessToken = await getValidAccessToken(userId, 'google_youtube');
  if (!accessToken) {
    throw new Error('YouTube not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const response = await youtube.videos.list({
    part: ['snippet', 'status', 'contentDetails'],
    id: [videoId],
  });

  return response.data.items?.[0] || null;
}

export async function deleteVideo(userId: number, videoId: string): Promise<void> {
  const accessToken = await getValidAccessToken(userId, 'google_youtube');
  if (!accessToken) {
    throw new Error('YouTube not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  await youtube.videos.delete({
    id: videoId,
  });
}

export async function getChannelInfo(userId: number) {
  const accessToken = await getValidAccessToken(userId, 'google_youtube');
  if (!accessToken) {
    throw new Error('YouTube not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const youtube = google.youtube({ version: 'v3', auth: oauth2Client });

  const response = await youtube.channels.list({
    part: ['snippet', 'statistics'],
    mine: true,
  });

  return response.data.items?.[0] || null;
}

/**
 * Check if a video qualifies as a YouTube Short
 * Shorts are vertical videos (9:16 aspect ratio) under 60 seconds
 */
export function isShortVideo(durationSeconds: number, width?: number, height?: number): boolean {
  // Duration must be under 60 seconds
  if (durationSeconds >= 60) {
    return false;
  }

  // If dimensions are provided, check aspect ratio (height > width for vertical)
  if (width && height) {
    return height > width;
  }

  // If no dimensions, assume it's a short based on duration alone
  return true;
}

/**
 * Parse ISO 8601 duration format (PT1M30S) to seconds
 */
export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}
