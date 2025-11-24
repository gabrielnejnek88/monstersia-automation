import * as XLSX from 'xlsx';
import { InsertScheduledPost } from '../drizzle/schema';

export interface ExcelRow {
  Date: string;
  Time: string;
  Platform: string;
  Title: string;
  Description?: string;
  Hashtags?: string;
  Prompt?: string;
  'Video File': string;
}

export interface ParsedPost {
  scheduledDate: string;
  scheduledTime: string;
  scheduledTimestamp: Date;
  platform: string;
  title: string;
  description: string;
  hashtags: string;
  prompt: string;
  videoFile: string;
}

export interface ExcelParseResult {
  posts: ParsedPost[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

/**
 * Parse Excel file buffer and extract scheduled posts
 */
export function parseExcelFile(buffer: Buffer, timezone = 'America/Sao_Paulo'): ExcelParseResult {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  
  if (!sheetName) {
    throw new Error('Excel file is empty or has no sheets');
  }

  const worksheet = workbook.Sheets[sheetName];
  const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

  const posts: ParsedPost[] = [];
  const errors: string[] = [];
  let validRows = 0;

  data.forEach((row, index) => {
    const rowNumber = index + 2; // Excel rows start at 1, plus header row

    try {
      // Validate required fields
      if (!row.Date) {
        errors.push(`Row ${rowNumber}: Missing Date`);
        return;
      }
      if (!row.Time) {
        errors.push(`Row ${rowNumber}: Missing Time`);
        return;
      }
      if (!row.Platform) {
        errors.push(`Row ${rowNumber}: Missing Platform`);
        return;
      }
      if (!row.Title) {
        errors.push(`Row ${rowNumber}: Missing Title`);
        return;
      }
      if (!row['Video File']) {
        errors.push(`Row ${rowNumber}: Missing Video File`);
        return;
      }

      // Filter only YouTube platforms
      const platform = row.Platform.trim();
      if (!platform.toLowerCase().includes('youtube')) {
        return; // Skip non-YouTube platforms silently
      }

      // Parse date and time
      const dateStr = normalizeDate(row.Date);
      const timeStr = normalizeTime(row.Time);

      if (!isValidDate(dateStr)) {
        errors.push(`Row ${rowNumber}: Invalid date format. Expected YYYY-MM-DD, got: ${row.Date}`);
        return;
      }

      if (!isValidTime(timeStr)) {
        errors.push(`Row ${rowNumber}: Invalid time format. Expected HH:MM, got: ${row.Time}`);
        return;
      }

      // Combine date and time into timestamp
      const scheduledTimestamp = parseDateTime(dateStr, timeStr, timezone);

      // Build post object
      const post: ParsedPost = {
        scheduledDate: dateStr,
        scheduledTime: timeStr,
        scheduledTimestamp,
        platform,
        title: row.Title.trim(),
        description: row.Description?.trim() || '',
        hashtags: row.Hashtags?.trim() || '',
        prompt: row.Prompt?.trim() || '',
        videoFile: row['Video File'].trim(),
      };

      posts.push(post);
      validRows++;
    } catch (error: any) {
      errors.push(`Row ${rowNumber}: ${error.message}`);
    }
  });

  return {
    posts,
    errors,
    totalRows: data.length,
    validRows,
  };
}

/**
 * Convert parsed posts to database insert format
 */
export function postsToInsertFormat(posts: ParsedPost[], userId: number): InsertScheduledPost[] {
  return posts.map(post => ({
    userId,
    scheduledDate: post.scheduledDate,
    scheduledTime: post.scheduledTime,
    scheduledTimestamp: post.scheduledTimestamp,
    platform: post.platform,
    title: post.title,
    description: post.description,
    hashtags: post.hashtags,
    prompt: post.prompt,
    videoFile: post.videoFile,
    status: 'scheduled' as const,
    retryCount: 0,
  }));
}

/**
 * Normalize date string to YYYY-MM-DD format
 */
function normalizeDate(dateInput: string | number): string {
  // Handle Excel serial date number
  if (typeof dateInput === 'number') {
    const date = XLSX.SSF.parse_date_code(dateInput);
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
  }

  // Handle string date
  const dateStr = String(dateInput).trim();
  
  // Try to parse various date formats
  const formats = [
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD or YYYY-M-D
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // DD-MM-YYYY or D-M-YYYY
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: string, month: string, day: string;
      
      if (format === formats[0]) {
        // YYYY-MM-DD
        [, year, month, day] = match;
      } else if (format === formats[1]) {
        // MM/DD/YYYY
        [, month, day, year] = match;
      } else {
        // DD-MM-YYYY
        [, day, month, year] = match;
      }

      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return dateStr;
}

/**
 * Normalize time string to HH:MM format
 */
function normalizeTime(timeInput: string | number): string {
  // Handle Excel time fraction (0.5 = 12:00)
  if (typeof timeInput === 'number') {
    const totalMinutes = Math.round(timeInput * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Handle string time
  const timeStr = String(timeInput).trim();
  
  // Match HH:MM or H:MM format
  const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const [, hours, minutes] = match;
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  return timeStr;
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateStr: string): boolean {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const [, year, month, day] = match;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  
  return (
    date.getFullYear() === parseInt(year) &&
    date.getMonth() === parseInt(month) - 1 &&
    date.getDate() === parseInt(day)
  );
}

/**
 * Validate time format (HH:MM)
 */
function isValidTime(timeStr: string): boolean {
  const match = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;

  const [, hours, minutes] = match;
  const h = parseInt(hours);
  const m = parseInt(minutes);

  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

/**
 * Parse date and time strings into a Date object with timezone
 */
function parseDateTime(dateStr: string, timeStr: string, timezone: string): Date {
  // Create date string in ISO format
  const isoString = `${dateStr}T${timeStr}:00`;
  
  // Parse as local time in the specified timezone
  // For simplicity, we'll use UTC offset calculation
  // In production, consider using a library like date-fns-tz or luxon
  const date = new Date(isoString);
  
  // Apply timezone offset (simplified - assumes timezone is always UTC-3 for Brazil)
  // TODO: Implement proper timezone handling with a library
  if (timezone === 'America/Sao_Paulo') {
    // UTC-3 offset
    date.setHours(date.getHours() + 3);
  }
  
  return date;
}
