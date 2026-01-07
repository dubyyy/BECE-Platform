import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';

export async function authMiddleware(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized - No token provided' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  const decoded = verifyToken(token);

  if (!decoded) {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid token' },
      { status: 401 }
    );
  }

  // Attach the decoded payload to the request for use in the route handler
  // You can access this in your route handler via the request headers
  const response = NextResponse.next();
  response.headers.set('X-School-Id', decoded.schoolId);
  response.headers.set('X-LGA-Code', decoded.lgaCode);
  response.headers.set('X-School-Code', decoded.schoolCode);
  
  return response;
}
