import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Refresh user session data with latest database info
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Find user in database with multiple methods
    let user = null;
    const identifiers = [
      session.user.twitterId || session.user.id,
      session.user.email,
      session.user.username,
      session.user.name
    ].filter(Boolean);

    for (const identifier of identifiers) {
      user = await db.collection('users').findOne({
        $or: [
          { twitterId: identifier },
          { email: identifier },
          { username: identifier },
          { displayName: identifier }
        ]
      });
      if (user) break;
    }

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found in database',
        action: 'Sign out and sign in again'
      }, { status: 404 });
    }

    // Return fresh user data
    const freshData = {
      id: user._id.toString(),
      twitterId: user.twitterId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      credits: user.credits,
      totalEarned: user.totalEarned,
      totalSpent: user.totalSpent,
      lastActive: user.lastActive
    };

    console.log('🔄 Session refresh - fresh data:', freshData);

    return NextResponse.json({
      success: true,
      userData: freshData,
      message: 'Session refreshed with latest database data'
    });

  } catch (error) {
    console.error('Session refresh error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to refresh session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}