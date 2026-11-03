/**
 * Simple in-memory sliding window rate limiter for MarketLens API routes.
 * Conforms to SOW requirement: "request rate limiting, bounded API retries, and safe errors".
 */

interface RateLimitRecord {
  timestamps: number[];
}

class MemoryRateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly defaultWindowMs: number;
  private readonly defaultMaxRequests: number;

  constructor(windowMs: number = 60_000, maxRequests: number = 100) {
    this.defaultWindowMs = windowMs;
    this.defaultMaxRequests = maxRequests;

    // Periodic cleanup of stale entries every 2 minutes
    if (typeof setInterval !== 'undefined') {
      const interval = setInterval(() => {
        const now = Date.now();
        for (const [key, record] of this.records.entries()) {
          record.timestamps = record.timestamps.filter((ts) => now - ts < this.defaultWindowMs);
          if (record.timestamps.length === 0) {
            this.records.delete(key);
          }
        }
      }, 120_000);
      if (typeof interval.unref === 'function') {
        interval.unref();
      }
    }
  }

  check(
    key: string,
    maxRequests: number = this.defaultMaxRequests,
    windowMs: number = this.defaultWindowMs
  ): {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  } {
    const now = Date.now();
    let record = this.records.get(key);

    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filter out timestamps outside the active window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    if (record.timestamps.length >= maxRequests) {
      const oldest = record.timestamps[0];
      const reset = Math.ceil((oldest + windowMs - now) / 1000);
      return {
        success: false,
        limit: maxRequests,
        remaining: 0,
        reset,
      };
    }

    record.timestamps.push(now);
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - record.timestamps.length,
      reset: Math.ceil(windowMs / 1000),
    };
  }

  reset(): void {
    this.records.clear();
  }
}

export const globalRateLimiter = new MemoryRateLimiter(60_000, 120);

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || '127.0.0.1';
}
