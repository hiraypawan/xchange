import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Session Test API ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const cookies = request.headers.get('cookie');
    console.log('Cookies:', cookies);
    
    const session = await getServerSession(authOptions);
    
    return NextResponse.json({
      sessionExists: !!session,
      session: session,
      cookiesPresent: !!cookies,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Session test error:', error);
    return NextResponse.json({
      error: 'Session test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}