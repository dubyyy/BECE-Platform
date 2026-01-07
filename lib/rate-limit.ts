// Hybrid rate limiter: Redis for production scalability, in-memory fallback
// Supports 6,000+ concurrent users when Redis is configured

import { redisIncr, redisExpire, redisTtl, isRedisConnected } from './redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
}

// In-memory fallback store
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

// Hybrid rate limiter that uses Redis when available
class HybridRateLimiter {
  private fallback: InMemoryRateLimiter;

  constructor() {
    this.fallback = new InMemoryRateLimiter();
  }

  async check(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    // Try Redis first for distributed rate limiting
    if (isRedisConnected()) {
      try {
        return await this.checkRedis(identifier, limit, windowMs);
      } catch (error) {
        console.warn('[RateLimiter] Redis error, falling back to in-memory:', error);
      }
    }

    // Fallback to in-memory
    return this.fallback.check(identifier, limit, windowMs);
  }

  private async checkRedis(identifier: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const key = `ratelimit:${identifier}`;
    const windowSeconds = Math.ceil(windowMs / 1000);

    // Increment counter
    const count = await redisIncr(key);
    
    if (count === null) {
      // Redis operation failed, use fallback
      return this.fallback.check(identifier, limit, windowMs);
    }

    // Set expiry on first request
    if (count === 1) {
      await redisExpire(key, windowSeconds);
    }

    // Get TTL to calculate reset time
    const ttl = await redisTtl(key);
    const resetTime = Date.now() + (ttl > 0 ? ttl * 1000 : windowMs);

    if (count > limit) {
      return { allowed: false, remaining: 0, resetTime };
    }

    return { allowed: true, remaining: limit - count, resetTime };
  }

  // Sync version for backwards compatibility (uses in-memory only)
  checkSync(identifier: string, limit: number, windowMs: number): RateLimitResult {
    return this.fallback.check(identifier, limit, windowMs);
  }

  destroy() {
    this.fallback.destroy();
  }
}

// Global singleton instance
const globalForRateLimit = global as unknown as { rateLimiter: HybridRateLimiter };

export const rateLimiter = 
  globalForRateLimit.rateLimiter || new HybridRateLimiter();

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

// Async middleware helper for Next.js route handlers (uses Redis when available)
export async function checkRateLimitAsync(
  request: Request,
  config: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; response?: Response }> {
  const clientId = getClientId(request);
  const { allowed, resetTime } = await rateLimiter.check(
    clientId,
    config.limit,
    config.windowMs
  );
  return buildRateLimitResponse(allowed, resetTime, config);
}

// Sync middleware helper for Next.js route handlers (in-memory only, for backwards compatibility)
export function checkRateLimit(
  request: Request,
  config: { limit: number; windowMs: number }
): { allowed: boolean; response?: Response } {
  const clientId = getClientId(request);
  const { allowed, resetTime } = rateLimiter.checkSync(
    clientId,
    config.limit,
    config.windowMs
  );
  return buildRateLimitResponse(allowed, resetTime, config);
}
