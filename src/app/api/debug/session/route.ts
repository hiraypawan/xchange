import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG SESSION ===');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await getServerSession(authOptions);
    
    console.log('Session data:', {
      exists: !!session,
      user: session?.user ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        username: session.user.username,
        twitterId: session.user.twitterId
      } : null,
      expires: session?.expires
    });
    
    // Check environment variables
    const envCheck = {
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      MONGODB_URI: !!process.env.MONGODB_URI,
      NODE_ENV: process.env.NODE_ENV
    };
    
    console.log('Environment:', envCheck);
    
    return NextResponse.json({
      session: session ? {
        user: {
          id: session.user?.id,
          name: session.user?.name,
          email: session.user?.email,
          username: session.user?.username,
          twitterId: session.user?.twitterId
        },
        expires: session.expires
      } : null,
      environment: envCheck,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}