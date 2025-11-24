import { OAuth2Client } from 'google-auth-library';
import { getOAuthToken, saveOAuthToken, deleteOAuthToken } from './db';

// Scopes necessários para Google Drive e YouTube
const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
];

const GOOGLE_YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

export type GoogleProvider = 'google_drive' | 'google_youtube';

interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

let oauthConfig: GoogleOAuthConfig | null = null;

export function setGoogleOAuthConfig(config: GoogleOAuthConfig) {
  oauthConfig = config;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  if (!oauthConfig) {
    throw new Error('Google OAuth config not initialized. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI environment variables.');
  }
  return oauthConfig;
}

export function createOAuth2Client(): OAuth2Client {
  const config = getGoogleOAuthConfig();
  return new OAuth2Client(
    config.clientId,
    config.clientSecret,
    config.redirectUri
  );
}

export function getAuthUrl(provider: GoogleProvider, state?: string): string {
  const oauth2Client = createOAuth2Client();
  const scopes = provider === 'google_drive' ? GOOGLE_DRIVE_SCOPES : GOOGLE_YOUTUBE_SCOPES;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent', // Force to get refresh token
    state: state || provider,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getValidAccessToken(userId: number, provider: GoogleProvider): Promise<string | null> {
  const tokenData = await getOAuthToken(userId, provider);
  
  if (!tokenData) {
    return null;
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokenData.accessToken,
    refresh_token: tokenData.refreshToken || undefined,
    expiry_date: tokenData.expiresAt ? tokenData.expiresAt.getTime() : undefined,
  });

  // Check if token is expired and refresh if needed
  const now = new Date();
  if (tokenData.expiresAt && tokenData.expiresAt <= now) {
    if (!tokenData.refreshToken) {
      // Token expired and no refresh token available
      return null;
    }

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Save the new access token
      await saveOAuthToken({
        userId,
        provider,
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || tokenData.refreshToken,
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
        scope: tokenData.scope,
      });

      return credentials.access_token!;
    } catch (error) {
      console.error(`Failed to refresh token for ${provider}:`, error);
      return null;
    }
  }

  return tokenData.accessToken;
}

export async function revokeToken(userId: number, provider: GoogleProvider): Promise<void> {
  const tokenData = await getOAuthToken(userId, provider);
  
  if (!tokenData) {
    return;
  }

  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: tokenData.accessToken,
    });
    
    await oauth2Client.revokeCredentials();
  } catch (error) {
    console.error(`Failed to revoke token for ${provider}:`, error);
  } finally {
    // Always delete from database
    await deleteOAuthToken(userId, provider);
  }
}

export function isGoogleOAuthConfigured(): boolean {
  return oauthConfig !== null;
}
