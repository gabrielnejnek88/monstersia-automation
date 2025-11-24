import { google } from 'googleapis';
import { createOAuth2Client, getValidAccessToken } from './googleAuth';
import { Readable } from 'stream';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
}

export async function listFilesInFolder(
  userId: number,
  folderId?: string,
  query?: string
): Promise<DriveFile[]> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let searchQuery = query || '';
  if (folderId) {
    searchQuery = searchQuery 
      ? `'${folderId}' in parents and (${searchQuery})`
      : `'${folderId}' in parents`;
  }

  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id, name, mimeType, size, webViewLink)',
    pageSize: 100,
  });

  return (response.data.files || []) as DriveFile[];
}

export async function findFileByName(
  userId: number,
  fileName: string,
  folderId?: string
): Promise<DriveFile | null> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let query = `name='${fileName.replace(/'/g, "\\'")}'`;
  if (folderId) {
    query = `'${folderId}' in parents and ${query}`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size, webViewLink)',
    pageSize: 1,
  });

  const files = response.data.files || [];
  return files.length > 0 ? (files[0] as DriveFile) : null;
}

export async function downloadFile(
  userId: number,
  fileId: string
): Promise<Buffer> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

export async function getFileStream(
  userId: number,
  fileId: string
): Promise<Readable> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );

  return response.data as Readable;
}

export async function getFileMetadata(
  userId: number,
  fileId: string
): Promise<DriveFile> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, webViewLink',
  });

  return response.data as DriveFile;
}

export async function getFolderInfo(
  userId: number,
  folderId: string
): Promise<{ id: string; name: string } | null> {
  const accessToken = await getValidAccessToken(userId, 'google_drive');
  if (!accessToken) {
    throw new Error('Google Drive not connected. Please authorize access.');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return null;
    }

    return {
      id: response.data.id!,
      name: response.data.name!,
    };
  } catch (error) {
    console.error('Failed to get folder info:', error);
    return null;
  }
}
