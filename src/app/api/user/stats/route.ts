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
    
    // Enhanced user lookup strategy matching the auth flow
    let user = null;
    
    console.log('Looking up user with identifiers:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      email: session.user.email,
      name: session.user.name
    });
    
    // First: Try by ObjectId if session.user.id is a valid MongoDB ObjectId
    if (session.user.id && session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const { ObjectId } = await import('mongodb');
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(session.user.id) 
        });
        console.log('ObjectId lookup result:', user ? 'FOUND' : 'NOT FOUND');
      } catch (error) {
        console.log('ObjectId lookup failed:', error);
      }
    }
    
    // Second: Try by twitterId if available
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
      console.log('TwitterId lookup result:', user ? 'FOUND' : 'NOT FOUND');
    }
    
    // Third: Try by email if available
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
      console.log('Email lookup result:', user ? 'FOUND' : 'NOT FOUND');
    }

    // If still no user found, try to create one (this should rarely happen if auth is working correctly)
    if (!user) {
      console.log('User not found, attempting to create new user');
      
      // Validate we have minimum required data
      if (!session.user.twitterId && !session.user.email) {
        console.error('Cannot create user: missing both twitterId and email');
        return NextResponse.json(
          { error: 'User session incomplete - missing identification data' },
          { status: 400 }
        );
      }
      
      const newUser = {
        twitterId: session.user.twitterId || null,
        email: session.user.email || null,
        name: session.user.name || 'Unknown User',
        username: session.user.username || session.user.name?.replace(/\s+/g, '').toLowerCase() || 'unknown',
        displayName: session.user.name || 'Unknown User',
        avatar: session.user.image || undefined,
        credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
        totalEarned: 0,
        totalSpent: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        isActive: true,
        settings: {
          autoEngage: false,
          maxEngagementsPerDay: 50,
          emailNotifications: true,
          pushNotifications: true,
          privacy: 'public',
        },
        stats: {
          totalEngagements: 0,
          successRate: 0,
          averageEarningsPerDay: 0,
          streakDays: 0,
          rank: 0,
        }
      };
      
      try {
        const result = await db.collection('users').insertOne(newUser);
        console.log('Created new user:', result.insertedId);
        user = { ...newUser, _id: result.insertedId };
        
        // Create welcome transaction
        if (session.user.twitterId || result.insertedId) {
          await db.collection('credit_transactions').insertOne({
            userId: session.user.twitterId || result.insertedId.toString(),
            type: 'bonus',
            amount: parseInt(process.env.USER_STARTING_CREDITS || '100'),
            balance: parseInt(process.env.USER_STARTING_CREDITS || '100'),
            description: 'Welcome bonus',
            createdAt: new Date(),
          });
        }
      } catch (createError) {
        console.error('Failed to create user:', createError);
        return NextResponse.json(
          { error: 'User not found and could not be created: ' + (createError as Error).message },
          { status: 500 }
        );
      }
    }

    // Calculate statistics - use both possible userId formats for compatibility
    const userIdQueries = [user._id.toString()];
    if (user.twitterId) {
      userIdQueries.push(user.twitterId);
    }
    
    console.log('Querying stats with userIds:', userIdQueries);
    
    const [
      totalEngagements,
      completedEngagements,
      totalTransactions,
      recentTransactions,
    ] = await Promise.all([
      db.collection('engagements').countDocuments({ userId: { $in: userIdQueries } }),
      db.collection('engagements').countDocuments({ 
        userId: { $in: userIdQueries }, 
        status: 'completed' 
      }),
      db.collection('credit_transactions').countDocuments({ userId: { $in: userIdQueries } }),
      db.collection('credit_transactions')
        .find({ userId: { $in: userIdQueries } })
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
          userId: { $in: userIdQueries },
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

    console.log('Stats API - Success:', {
      userId: user._id.toString(),
      twitterId: user.twitterId,
      credits: user.credits,
      totalEngagements,
      completedEngagements
    });

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