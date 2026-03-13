/**
 * Date utility functions to handle timezone-safe date operations
 */

/**
 * Converts a Date object to a local date string (YYYY-MM-DD) without timezone shifts
 */
export function dateToLocalString(date: Date | string): string {
  if (!date) return '';

  const dateObj = parseLocalDate(date);

  // Use local timezone to avoid shifts
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Converts a Date object to YYYY-MM-DD format for HTML date inputs
 * This is equivalent to toISOString().split('T')[0] but centralized for consistency
 */
export function dateToInputString(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses a date string (YYYY-MM-DD) as a local date without timezone shifts
 * Enhanced to handle edge cases while preserving the original working logic
 */
export function parseLocalDate(dateString: string | Date): Date {
  if (dateString instanceof Date) return dateString;

  if (typeof dateString === 'string') {
    // Handle ISO date strings (YYYY-MM-DDTHH:mm:ss.sssZ) - extract just the date part
    const isoDateMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoDateMatch) {
      const [year, month, day] = isoDateMatch[1].split('-').map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed
    }

    // Handle simple date strings (YYYY-MM-DD) explicitly to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
  }

  return new Date(dateString);
}

/**
 * Formats a date for display using local timezone
 */
export function formatDisplayDate(date: Date | string): string {
  try {
    const dateObj = parseLocalDate(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }

    // Don't specify timeZone - let it use the local date as-is
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date);
    return 'Invalid Date';
  }
}

/**
 * Formats a date for month/day display only
 */
export function formatDisplayDateShort(date: Date | string): { monthDay: string; year: string } {
  try {
    const dateObj = parseLocalDate(date);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return { monthDay: 'Invalid', year: 'Date' };
    }

    // Don't specify timeZone - let it use the local date as-is
    const monthDay = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric'
    }).format(dateObj);

    const year = new Intl.DateTimeFormat('en-US', {
      year: 'numeric'
    }).format(dateObj);

    return { monthDay, year };
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', date);
    return { monthDay: 'Invalid', year: 'Date' };
  }
}

/**
 * Format a date as YYYY-MM-DD string for database storage
 *
 * @param date - Date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if two dates are the same day (ignoring time)
 *
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}