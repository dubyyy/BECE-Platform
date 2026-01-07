import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/prisma';
import { isRedisConnected } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startTime = Date.now();
  
  // Check database connection
  const dbHealthy = await checkDatabaseConnection();
  
  // Check Redis connection
  const redisHealthy = isRedisConnected();
  
  const responseTime = Date.now() - startTime;
  
  const status = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'not configured',
      cache: 'active',
      rateLimit: 'active',
    },
    scalability: {
      prismaAccelerate: !!process.env.ACCELERATE_URL,
      redisEnabled: !!process.env.REDIS_URL,
      recommendedForHighTraffic: !!process.env.ACCELERATE_URL && !!process.env.REDIS_URL,
    },
  };

  return NextResponse.json(status, {
    status: dbHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
