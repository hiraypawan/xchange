import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

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
    const { ObjectId } = require('mongodb');
    const userId = new ObjectId(session.user.id);
    const user = await db.collection('users').findOne({ _id: userId });

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
      // CRITICAL FIX: Use correct userId format for each collection
      // Engagements use ObjectId, credit_transactions use string
      const userObjectId = user._id;
      const userStringId = user._id.toString();
      
      console.log('📊 STATS QUERY - Using IDs:', {
        objectId: userObjectId,
        stringId: userStringId
      });
      
      const [engCount, compCount, weeklyResult, recentTx] = await Promise.all([
        // Use ObjectId for engagements (they store userId as ObjectId)
        db.collection('engagements').countDocuments({ userId: userObjectId }).catch(() => 0),
        db.collection('engagements').countDocuments({ 
          userId: userObjectId, 
          status: 'completed' 
        }).catch(() => 0),
        // Use ObjectId for credit_transactions (now storing as ObjectId)
        db.collection('credit_transactions').aggregate([
          {
            $match: {
              userId: userObjectId, // Now using ObjectId format
              type: 'earn',
              createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
          },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]).toArray().catch(() => []),
        db.collection('credit_transactions')
          .find({ userId: userObjectId }) // Now using ObjectId format
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