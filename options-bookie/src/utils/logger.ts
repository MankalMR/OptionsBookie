/**
 * Global logging utility.
 * Use this instead of console.log to respect the ENABLE_DEBUG_LOGS environment variable.
 */

export function debugLog(...args: any[]) {
  if (process.env.ENABLE_DEBUG_LOGS === '1') {
    console.log(...args);
  }
}
