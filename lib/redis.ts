import Redis from 'ioredis';

// Redis client singleton for production scalability
// Falls back gracefully when Redis is not configured

let redisClient: Redis | null = null;
let isRedisAvailable = false;

function createRedisClient(): Redis | null {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.log('[Redis] No REDIS_URL configured, using in-memory fallback');
    return null;
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 10000,
      lazyConnect: true,
    });

    client.on('connect', () => {
      console.log('[Redis] Connected successfully');
      isRedisAvailable = true;
    });

    client.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
      isRedisAvailable = false;
    });

    client.on('close', () => {
      console.log('[Redis] Connection closed');
      isRedisAvailable = false;
    });

    // Attempt to connect
    client.connect().catch((err) => {
      console.error('[Redis] Failed to connect:', err.message);
      isRedisAvailable = false;
    });

    return client;
  } catch (error) {
    console.error('[Redis] Failed to create client:', error);
    return null;
  }
}

// Global singleton to prevent multiple connections in development
const globalForRedis = global as unknown as { redis: Redis | null };

export function getRedisClient(): Redis | null {
  if (process.env.NODE_ENV === 'production') {
    if (!redisClient) {
      redisClient = createRedisClient();
    }
    return redisClient;
  }

  if (!globalForRedis.redis) {
    globalForRedis.redis = createRedisClient();
  }
  redisClient = globalForRedis.redis;
  return redisClient;
}

export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

// Helper for safe Redis operations with fallback
export async function redisGet(key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return null;
  
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(
  key: string, 
  value: string, 
  ttlSeconds?: number
): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return false;
  
  try {
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

export async function redisIncr(key: string): Promise<number | null> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return null;
  
  try {
    return await client.incr(key);
  } catch {
    return null;
  }
}

export async function redisExpire(key: string, ttlSeconds: number): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return false;
  
  try {
    await client.expire(key, ttlSeconds);
    return true;
  } catch {
    return false;
  }
}

export async function redisDel(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return false;
  
  try {
    await client.del(key);
    return true;
  } catch {
    return false;
  }
}

export async function redisTtl(key: string): Promise<number> {
  const client = getRedisClient();
  if (!client || !isRedisAvailable) return -1;
  
  try {
    return await client.ttl(key);
  } catch {
    return -1;
  }
}

// Initialize Redis connection on module load
getRedisClient();
