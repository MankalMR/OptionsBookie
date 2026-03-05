/**
 * demo-rate-limiter.ts
 *
 * Simple in-process per-IP rate limiter for /api/demo/* routes.
 * Window: 60 seconds. Default limit: DEMO_RATE_LIMIT_RPM env var or 30.
 */

const DEFAULT_LIMIT = parseInt(process.env.DEMO_RATE_LIMIT_RPM ?? '30', 10);
const WINDOW_MS = 60_000; // 1 minute

interface BucketEntry {
    count: number;
    resetAt: number; // epoch ms when the bucket resets
}

const buckets = new Map<string, BucketEntry>();

/**
 * Returns true if the request should be rate-limited, false otherwise.
 * Call at the top of each demo API handler.
 */
export function isDemoRateLimited(ip: string, limit: number = DEFAULT_LIMIT): boolean {
    const now = Date.now();
    let entry = buckets.get(ip);

    if (!entry || now >= entry.resetAt) {
        // Start a fresh window
        entry = { count: 1, resetAt: now + WINDOW_MS };
        buckets.set(ip, entry);
        return false;
    }

    entry.count += 1;
    if (entry.count > limit) {
        return true;
    }
    return false;
}

/** Extract the best available IP from a Next.js request. */
export function getClientIp(request: Request): string {
    const forwarded = (request.headers as Headers).get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    const realIp = (request.headers as Headers).get('x-real-ip');
    if (realIp) return realIp;
    return 'unknown';
}

// Periodically clean up the buckets map to avoid unbounded memory growth
if (process.env.NODE_ENV !== 'test') {
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of buckets) {
            if (now >= entry.resetAt) buckets.delete(ip);
        }
    }, 5 * 60 * 1000).unref?.();
}
