// In-memory rate limiter

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.store = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  check(identifier: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(identifier, { count: 1, resetTime });
      return { allowed: true, remaining: limit - 1, resetTime };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }

    entry.count++;
    this.store.set(identifier, entry);
    return { allowed: true, remaining: limit - entry.count, resetTime: entry.resetTime };
  }

  destroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global singleton instance
const globalForRateLimit = global as unknown as { rateLimiter: InMemoryRateLimiter };

export const rateLimiter = 
  globalForRateLimit.rateLimiter || new InMemoryRateLimiter();

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimiter = rateLimiter;
}

// Helper function to get client identifier
export function getClientId(request: Request): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to a combination of headers for identification
  const userAgent = request.headers.get('user-agent') || 'unknown';
  return `fallback-${userAgent.slice(0, 50)}`;
}

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  // Strict limits for authentication endpoints
  AUTH: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 requests per 15 minutes
  
  // Moderate limits for data mutation endpoints
  MUTATION: { limit: 100, windowMs: 15 * 60 * 1000 }, // 100 requests per 15 minutes
  
  // Generous limits for read-only endpoints
  READ: { limit: 300, windowMs: 15 * 60 * 1000 }, // 300 requests per 15 minutes
  
  // Very strict for sensitive operations
  ADMIN: { limit: 50, windowMs: 15 * 60 * 1000 }, // 50 requests per 15 minutes
};

// Helper to build rate limit response
function buildRateLimitResponse(
  allowed: boolean,
  resetTime: number,
  config: { limit: number }
): { allowed: boolean; response?: Response } {
  if (!allowed) {
    const resetDate = new Date(resetTime);
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
          retryAfter: resetDate.toISOString(),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': config.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
          },
        }
      ),
    };
  }
  return { allowed: true };
}

// Async middleware helper for Next.js route handlers
export async function checkRateLimitAsync(
  request: Request,
  config: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; response?: Response }> {
  const clientId = getClientId(request);
  const { allowed, resetTime } = rateLimiter.check(
    clientId,
    config.limit,
    config.windowMs
  );
  return buildRateLimitResponse(allowed, resetTime, config);
}

// Sync middleware helper for Next.js route handlers
export function checkRateLimit(
  request: Request,
  config: { limit: number; windowMs: number }
): { allowed: boolean; response?: Response } {
  const clientId = getClientId(request);
  const { allowed, resetTime } = rateLimiter.check(
    clientId,
    config.limit,
    config.windowMs
  );
  return buildRateLimitResponse(allowed, resetTime, config);
}
