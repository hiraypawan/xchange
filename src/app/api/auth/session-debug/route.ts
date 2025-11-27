import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/auth/session-debug - Debug current session with detailed logging
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 SESSION DEBUG - Starting...');
    console.log('🔍 Headers:', Object.fromEntries(req.headers.entries()));
    
    const session = await getServerSession(authOptions);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      hasSession: !!session,
      sessionData: session ? {
        user: {
          id: session.user?.id,
          twitterId: session.user?.twitterId,
          name: session.user?.name,
          email: session.user?.email,
          image: session.user?.image,
          username: session.user?.username,
          credits: session.user?.credits
        }
      } : null,
      cookies: {
        sessionToken: req.cookies.get('next-auth.session-token')?.value ? '[EXISTS]' : '[MISSING]',
        csrfToken: req.cookies.get('next-auth.csrf-token')?.value ? '[EXISTS]' : '[MISSING]',
        allCookies: req.cookies.getAll().map(cookie => cookie.name)
      },
      headers: {
        userAgent: req.headers.get('user-agent'),
        origin: req.headers.get('origin'),
        referer: req.headers.get('referer'),
        authorization: req.headers.get('authorization') ? '[EXISTS]' : '[MISSING]'
      }
    };

    if (session?.user?.twitterId) {
      try {
        const { db } = await connectToDatabase();
        
        // Find user in database
        const dbUser = await db.collection('users').findOne({
          twitterId: session.user.twitterId
        });
        
        if (dbUser) {
          (debugInfo as any).databaseUser = {
            found: true,
            id: dbUser._id.toString(),
            twitterId: dbUser.twitterId,
            username: dbUser.username,
            displayName: dbUser.displayName,
            credits: dbUser.credits,
            joinedAt: dbUser.joinedAt
          };
        } else {
          (debugInfo as any).databaseUser = {
            found: false,
            searchedTwitterId: session.user.twitterId
          };
        }
      } catch (error) {
        (debugInfo as any).databaseError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    console.log('📋 Session debug complete:', debugInfo);

    return NextResponse.json({
      success: true,
      debug: debugInfo
    });

  } catch (error) {
    console.error('❌ Session debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}