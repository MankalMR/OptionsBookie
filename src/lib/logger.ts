import pino from 'pino';

// Helper to determine if we are running in the browser
const isBrowser = typeof window !== 'undefined';

// Enable logs if NEXT_PUBLIC_ENABLE_DEBUG_LOGS is explicitly '1', or default to true for development.
// In a real production environment without this flag, you may want to default to 'info' or 'error'.
const isDebugEnabled = process.env.NEXT_PUBLIC_ENABLE_DEBUG_LOGS === '1';

const defaultLevel = isDebugEnabled ? 'debug' : 'info';

const loggerConfig = {
    level: defaultLevel,
    browser: {
        // In the browser, we use the standard console.log/warn/error so we get source maps
        // and objects that are expandable in Chrome DevTools instead of plain JSON strings.
        asObject: true,
    },
    // Use pino-pretty for human-readable logs when running in local development on the server.
    // In production on the server, we output raw JSON.
    ...(process.env.NODE_ENV === 'development' && !isBrowser
        ? {
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    ignore: 'pid,hostname',
                },
            },
        }
        : {}),
};

export const logger = pino(loggerConfig);
