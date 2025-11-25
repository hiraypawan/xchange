import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserManager } from '@/lib/user-management';

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

    console.log('Stats API - Looking up user with session data:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      email: session.user.email,
      name: session.user.name
    });

    let user = null;

    try {
      // First try to find existing user using UserManager
      user = await UserManager.findExistingUser({
        twitterId: session.user.twitterId || session.user.id, // Fallback to session.user.id for fallback auth
        username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase(),
        displayName: session.user.name || '',
        email: session.user.email || undefined,
        profileImage: session.user.image || undefined
      });

      // If user doesn't exist, create one using UserManager
      if (!user) {
        console.log('User not found, creating new user via UserManager');
        const { user: newUser } = await UserManager.ensureUser({
          twitterId: session.user.twitterId || session.user.id, // Fallback to session.user.id
          username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase(),
          displayName: session.user.name || 'Unknown User',
          email: session.user.email || undefined,
          profileImage: session.user.image || undefined
        });
        user = newUser;
        console.log('✅ User created successfully via UserManager');
      } else {
        console.log('✅ User found via UserManager');
      }
    } catch (userManagerError) {
      console.error('UserManager failed, falling back to basic user creation:', userManagerError);
      
      // Fallback: Try direct database operations
      const { db } = await connectToDatabase();
      
      // Try to find by twitterId or session ID
      const searchId = session.user.twitterId || session.user.id;
      if (searchId) {
        user = await db.collection('users').findOne({ 
          twitterId: searchId 
        });
        
        if (!user && session.user.email) {
          user = await db.collection('users').findOne({ 
            email: session.user.email 
          });
        }
      }
      
      // If still no user, create a minimal user record
      if (!user && searchId) {
        console.log('Creating minimal user record as fallback');
        const newUser = {
          twitterId: searchId,
          username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown',
          displayName: session.user.name || 'Unknown User',
          email: session.user.email,
          avatar: session.user.image,
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
          },
        };
        
        try {
          const result = await db.collection('users').insertOne(newUser);
          user = { ...newUser, _id: result.insertedId };
          console.log('✅ Minimal user created successfully');
        } catch (createError) {
          console.error('Failed to create minimal user:', createError);
          return NextResponse.json(
            { 
              error: 'Unable to create or find user record',
              details: 'Database operations failed'
            },
            { status: 400 }
          );
        }
      }
    }

    // Final check: if user still null, return an error
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Unable to locate or create user',
          details: 'User lookup and creation failed'
        },
        { status: 400 }
      );
    }

    // Now we have a user, get the stats
    console.log('✅ User ready for stats calculation:', {
      id: user._id,
      twitterId: user.twitterId,
      displayName: user.displayName
    });

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