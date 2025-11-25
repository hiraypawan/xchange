import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserManager } from '@/lib/user-management';

// POST /api/user/ensure - Ensure user exists in database
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 User ensure endpoint - using centralized UserManager...', {
      sessionUserId: session.user.id,
      sessionUserTwitterId: session.user.twitterId,
      sessionUserEmail: session.user.email,
      sessionUserName: session.user.name
    });

    // Use centralized user management to prevent duplicates
    const { user, isNew } = await UserManager.ensureUser({
      twitterId: session.user.twitterId || session.user.id, // Fallback to session ID
      username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase(),
      displayName: session.user.name || 'Unknown User',
      email: session.user.email || undefined,
      profileImage: session.user.image || undefined
    });

    console.log(isNew ? '✅ NEW USER CREATED via ensure' : '✅ EXISTING USER FOUND via ensure', {
      id: user._id,
      twitterId: user.twitterId,
      username: user.username,
      displayName: user.displayName,
      credits: user.credits
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        twitterId: user.twitterId,
        name: user.name,
        username: user.username,
        credits: user.credits,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        joinedAt: user.joinedAt
      }
    });
    
  } catch (error) {
    console.error('Ensure user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}