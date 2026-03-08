export const logger = {
  debug: (...args: unknown[]) => {
    if (process.env.ENABLE_DEBUG_LOGS === '1') {
      console.log(...args);
    }
  },
  info: (...args: unknown[]) => {
    if (process.env.ENABLE_DEBUG_LOGS === '1') {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  }
};
