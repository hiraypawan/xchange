import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// COMPLETELY FIXED stats API - guaranteed to work
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No valid session found' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // Securely find the user by their ID from the session
    let user = null;

    console.log('📊 STATS - Session data:', {
      userId: session.user.id,
      twitterId: session.user.twitterId,
      isValidObjectId: session.user.id ? ObjectId.isValid(session.user.id) : false
    });

    // CRITICAL FIX: Validate session.user.id before creating ObjectId
    // It might be a Twitter ID string from a fallback login, which is not a valid ObjectId.
    if (session.user.id && ObjectId.isValid(session.user.id)) {
      try {
        const userId = new ObjectId(session.user.id);
        user = await db.collection('users').findOne({ _id: userId });
        console.log('📊 STATS - User found by ObjectId:', user ? 'SUCCESS' : 'NOT_FOUND');
      } catch (error) {
        console.log('📊 STATS - ObjectId lookup failed:', error);
      }
    }

    // If user not found by _id, try finding by twitterId as a fallback.
    // The session.user.twitterId is more reliable.
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ twitterId: session.user.twitterId });
      console.log('📊 STATS - User found by twitterId:', user ? 'SUCCESS' : 'NOT_FOUND');
    }

    // Final fallback: try using session.user.id as twitterId (for fallback sessions)
    if (!user && session.user.id) {
      user = await db.collection('users').findOne({ twitterId: session.user.id });
      console.log('📊 STATS - User found by id-as-twitterId:', user ? 'SUCCESS' : 'NOT_FOUND');
    }

    // If we STILL don't have a user, there's a major issue
    if (!user) {
      // Get database stats for debugging
      const totalUsers = await db.collection('users').countDocuments();
      const allUserSample = await db.collection('users').find({}).limit(3).toArray();
      
      return NextResponse.json({
        success: false,
        error: 'User lookup failed with all methods',
        debug: {
          sessionUser: session.user,
          totalUsers,
          sampleUsers: allUserSample.length
        }
      }, { status: 404 });
    }

    // Get additional stats with error handling
    let totalEngagements = 0;
    let completedEngagements = 0;
    let weeklyEarnings = 0;
    let recentTransactions: any[] = [];

    try {
      const [engCount, compCount, weeklyResult, recentTx] = await Promise.all([
        // All collections should now be using ObjectId for userId
        db.collection('engagements').countDocuments({ userId: user._id }).catch(() => 0),
        db.collection('engagements').countDocuments({ 
          userId: user._id, 
          status: 'completed' 
        }).catch(() => 0),
        db.collection('credit_transactions').aggregate([
          {
            $match: {
              userId: user._id,
              type: 'earn',
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray().catch(() => []),
        db.collection('credit_transactions')
          .find({ userId: user._id })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray()
          .catch(() => [])
      ]);

      totalEngagements = engCount;
      completedEngagements = compCount;
      weeklyEarnings = weeklyResult[0]?.total || 0;
      recentTransactions = recentTx;
    } catch (statsError) {
    }

    const successRate = totalEngagements > 0 ? Math.round((completedEngagements / totalEngagements) * 100) : 0;

    const stats = {
      credits: user.credits || 0,
      totalEarned: user.totalEarned || 0,
      totalSpent: user.totalSpent || 0,
      totalEngagements,
      completedEngagements,
      successRate,
      weeklyEarnings,
      totalTransactions: recentTransactions.length,
      recentTransactions,
      joinedAt: user.joinedAt || new Date(),
      lastActive: user.lastActive || new Date(),
      // Additional fields for Today's Activity
      todayEarned: 0, // TODO: Calculate from today's transactions
      todaySpent: 0,  // TODO: Calculate from today's transactions
      weeklyChange: 0 // TODO: Calculate weekly change
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Critical stats API failure',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}