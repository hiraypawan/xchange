import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/user/stats - Get user statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Stats API - session:', session);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get user by multiple possible identifiers
    let user = null;
    
    // Try by twitterId first (most reliable after our auth fix)
    if (session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
    }
    
    // Try by ObjectId if available and valid
    if (!user && session.user.id && session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const { ObjectId } = await import('mongodb');
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(session.user.id) 
        });
      } catch (error) {
        console.log('ObjectId lookup failed:', error);
      }
    }
    
    // Try by email as last resort
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
    }

    if (!user) {
      console.log('User lookup failed with session:', {
        sessionId: session.user.id,
        twitterId: session.user.twitterId,
        email: session.user.email,
        name: session.user.name
      });
      
      // Try to create user if they don't exist (auto-registration)
      const newUser = {
        twitterId: session.user.twitterId,
        email: session.user.email,
        name: session.user.name,
        username: session.user.username || session.user.name,
        credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
        totalEarned: 0,
        totalSpent: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        isActive: true
      };
      
      try {
        const result = await db.collection('users').insertOne(newUser);
        console.log('Created new user:', result.insertedId);
        user = { ...newUser, _id: result.insertedId };
      } catch (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json(
          { error: 'User not found and could not be created' },
          { status: 404 }
        );
      }
    }

    // Calculate statistics
    const [
      totalEngagements,
      completedEngagements,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      db.collection('engagements').countDocuments({ userId: user._id.toString() }),
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString(), 
        status: 'completed' 
      }),
      db.collection('credit_transactions').countDocuments({ userId: user._id.toString() }),
      db.collection('credit_transactions')
        .find({ userId: user._id.toString() })
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray(),
    ]);

    const successRate = totalEngagements > 0 
      ? Math.round((completedEngagements / totalEngagements) * 100)
      : 0;

    // Calculate earnings in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const weeklyEarnings = await db.collection('credit_transactions').aggregate([
      {
        $match: {
          userId: user._id.toString(),
          type: 'earn',
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const stats = {
      credits: user.credits,
      totalEarned: user.totalEarned || 0,
      totalSpent: user.totalSpent || 0,
      totalEngagements,
      completedEngagements,
      successRate,
      weeklyEarnings: weeklyEarnings[0]?.total || 0,
      totalTransactions,
      recentTransactions,
      joinedAt: user.joinedAt,
      lastActive: user.lastActive,
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}