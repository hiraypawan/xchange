import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { UserManager } from '@/lib/user-management';

// HOTFIX: More robust error handling for user stats API
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('HOTFIX Stats API - session check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      sessionUser: session?.user
    });
    
    if (!session?.user) {
      console.log('HOTFIX - No session/user, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No valid session found' },
        { status: 401 }
      );
    }

    // More flexible user identification
    const userIdentifiers = {
      twitterId: session.user.twitterId || session.user.id,
      email: session.user.email,
      name: session.user.name,
      username: session.user.username
    };

    console.log('HOTFIX Stats API - User identifiers:', userIdentifiers);

    let user = null;

    try {
      // Try multiple approaches to find the user
      const { db } = await connectToDatabase();
      
      // Method 1: Try by twitterId
      if (userIdentifiers.twitterId) {
        user = await db.collection('users').findOne({ 
          twitterId: userIdentifiers.twitterId 
        });
        console.log('HOTFIX - TwitterId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      }
      
      // Method 2: Try by email if twitterId failed
      if (!user && userIdentifiers.email) {
        user = await db.collection('users').findOne({ 
          email: userIdentifiers.email 
        });
        console.log('HOTFIX - Email lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      }

      // Method 3: If user still not found, create a basic user record
      if (!user && userIdentifiers.twitterId) {
        console.log('HOTFIX - Creating new user record');
        
        const newUser = {
          twitterId: userIdentifiers.twitterId,
          username: userIdentifiers.username || userIdentifiers.name?.replace(/\s+/g, '_').toLowerCase() || 'user_' + Date.now(),
          displayName: userIdentifiers.name || 'User',
          email: userIdentifiers.email,
          avatar: session.user.image,
          credits: 100, // Default starting credits
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
          console.log('HOTFIX - User created successfully:', user._id);
        } catch (createError) {
          console.error('HOTFIX - Failed to create user:', createError);
          
          // Return a default response instead of failing completely
          const defaultStats = {
            credits: 0,
            totalEarned: 0,
            totalSpent: 0,
            totalEngagements: 0,
            completedEngagements: 0,
            successRate: 0,
            weeklyEarnings: 0,
            totalTransactions: 0,
            recentTransactions: [],
            joinedAt: new Date(),
            lastActive: new Date(),
          };

          console.log('HOTFIX - Returning default stats due to user creation failure');
          return NextResponse.json({
            success: true,
            data: defaultStats,
            isDefault: true,
            message: 'Using default values due to database issues'
          });
        }
      }

      // If we still have no user, return default stats
      if (!user) {
        console.log('HOTFIX - No user found, returning default stats');
        const defaultStats = {
          credits: 0,
          totalEarned: 0,
          totalSpent: 0,
          totalEngagements: 0,
          completedEngagements: 0,
          successRate: 0,
          weeklyEarnings: 0,
          totalTransactions: 0,
          recentTransactions: [],
          joinedAt: new Date(),
          lastActive: new Date(),
        };

        return NextResponse.json({
          success: true,
          data: defaultStats,
          isDefault: true,
          message: 'Using default values - user needs to be set up'
        });
      }

      // Calculate statistics with error handling
      console.log('HOTFIX - Calculating stats for user:', user._id);
      
      const userIdQueries = [user._id.toString()];
      if (user.twitterId) {
        userIdQueries.push(user.twitterId);
      }
      
      let totalEngagements = 0;
      let completedEngagements = 0;
      let totalTransactions = 0;
      let recentTransactions: any[] = [];
      let weeklyEarnings = 0;

      try {
        const [
          engagementsCount,
          completedCount,
          transactionsCount,
          recentTx
        ] = await Promise.all([
          db.collection('engagements').countDocuments({ userId: { $in: userIdQueries } }).catch(() => 0),
          db.collection('engagements').countDocuments({ 
            userId: { $in: userIdQueries }, 
            status: 'completed' 
          }).catch(() => 0),
          db.collection('credit_transactions').countDocuments({ userId: { $in: userIdQueries } }).catch(() => 0),
          db.collection('credit_transactions')
            .find({ userId: { $in: userIdQueries } })
            .sort({ createdAt: -1 })
            .limit(10)
            .toArray()
            .catch(() => [])
        ]);

        totalEngagements = engagementsCount;
        completedEngagements = completedCount;
        totalTransactions = transactionsCount;
        recentTransactions = recentTx;

        // Calculate weekly earnings
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const weeklyEarningsResult = await db.collection('credit_transactions').aggregate([
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
        ]).toArray().catch(() => []);

        weeklyEarnings = weeklyEarningsResult[0]?.total || 0;

      } catch (statsError) {
        console.warn('HOTFIX - Error calculating detailed stats:', statsError);
        // Continue with basic stats
      }

      const successRate = totalEngagements > 0 
        ? Math.round((completedEngagements / totalEngagements) * 100)
        : 0;

      const stats = {
        credits: user.credits || 0,
        totalEarned: user.totalEarned || 0,
        totalSpent: user.totalSpent || 0,
        totalEngagements,
        completedEngagements,
        successRate,
        weeklyEarnings,
        totalTransactions,
        recentTransactions,
        joinedAt: user.joinedAt || new Date(),
        lastActive: user.lastActive || new Date(),
      };

      console.log('HOTFIX Stats API - Success:', {
        userId: user._id?.toString(),
        twitterId: user.twitterId,
        credits: stats.credits
      });

      return NextResponse.json({
        success: true,
        data: stats
      });

    } catch (dbError) {
      console.error('HOTFIX - Database error:', dbError);
      
      // Return default stats instead of failing
      const defaultStats = {
        credits: 0,
        totalEarned: 0,
        totalSpent: 0,
        totalEngagements: 0,
        completedEngagements: 0,
        successRate: 0,
        weeklyEarnings: 0,
        totalTransactions: 0,
        recentTransactions: [],
        joinedAt: new Date(),
        lastActive: new Date(),
      };

      return NextResponse.json({
        success: true,
        data: defaultStats,
        isDefault: true,
        error: 'Database connection issues, using defaults'
      });
    }

  } catch (error) {
    console.error('HOTFIX - Critical error in stats API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}