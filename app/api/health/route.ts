import { NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const startTime = Date.now();
  
  // Check database connection
  const dbHealthy = await checkDatabaseConnection();
  
  const responseTime = Date.now() - startTime;
  
  const status = {
    status: dbHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    responseTime: `${responseTime}ms`,
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      cache: 'active',
      rateLimit: 'active',
    },
  };

  return NextResponse.json(status, {
    status: dbHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
