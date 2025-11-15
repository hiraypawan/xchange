import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/stats - Get dashboard statistics
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.twitterId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get user
    const user = await db.collection('users').findOne({
      twitterId: session.user.twitterId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Calculate date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    
    const thisMonth = new Date(today);
    thisMonth.setMonth(today.getMonth() - 1);

    // Aggregate statistics
    const [
      totalEngagements,
      completedEngagements,
      todayEngagements,
      weeklyEngagements,
      monthlyEngagements,
      activePosts,
      totalPosts,
      todayEarnings,
      weeklyEarnings,
      monthlyEarnings,
      engagementBreakdown,
      recentTransactions,
    ] = await Promise.all([
      // Total engagements
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString() 
      }),
      
      // Completed engagements
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString(),
        status: 'completed'
      }),
      
      // Today's engagements
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString(),
        createdAt: { $gte: today }
      }),
      
      // Weekly engagements
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString(),
        createdAt: { $gte: thisWeek }
      }),
      
      // Monthly engagements
      db.collection('engagements').countDocuments({ 
        userId: user._id.toString(),
        createdAt: { $gte: thisMonth }
      }),
      
      // Active posts
      db.collection('posts').countDocuments({ 
        userId: user._id.toString(),
        status: 'active'
      }),
      
      // Total posts
      db.collection('posts').countDocuments({ 
        userId: user._id.toString()
      }),
      
      // Today's earnings
      db.collection('credit_transactions').aggregate([
        {
          $match: {
            userId: user._id.toString(),
            type: 'earn',
            createdAt: { $gte: today }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]).toArray(),
      
      // Weekly earnings
      db.collection('credit_transactions').aggregate([
        {
          $match: {
            userId: user._id.toString(),
            type: 'earn',
            createdAt: { $gte: thisWeek }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]).toArray(),
      
      // Monthly earnings
      db.collection('credit_transactions').aggregate([
        {
          $match: {
            userId: user._id.toString(),
            type: 'earn',
            createdAt: { $gte: thisMonth }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]).toArray(),
      
      // Engagement type breakdown
      db.collection('engagements').aggregate([
        {
          $match: {
            userId: user._id.toString(),
            status: 'completed'
          }
        },
        {
          $group: {
            _id: '$engagementType',
            count: { $sum: 1 },
            credits: { $sum: '$creditsEarned' }
          }
        }
      ]).toArray(),
      
      // Recent transactions
      db.collection('credit_transactions')
        .find({ userId: user._id.toString() })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray(),
    ]);

    // Calculate success rate
    const successRate = totalEngagements > 0 
      ? Math.round((completedEngagements / totalEngagements) * 100)
      : 0;

    // Calculate average earnings per day
    const daysSinceJoined = Math.max(1, Math.floor(
      (Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)
    ));
    const averageEarningsPerDay = Math.round((user.totalEarned || 0) / daysSinceJoined);

    // Calculate engagement streak
    const streak = await calculateEngagementStreak(db, user._id.toString());

    const stats = {
      user: {
        credits: user.credits,
        totalEarned: user.totalEarned || 0,
        totalSpent: user.totalSpent || 0,
        engagementsToday: todayEngagements,
        successRate,
        averageEarningsPerDay,
        streak,
      },
      engagements: {
        total: totalEngagements,
        completed: completedEngagements,
        today: todayEngagements,
        weekly: weeklyEngagements,
        monthly: monthlyEngagements,
        breakdown: engagementBreakdown.reduce((acc, item) => {
          acc[item._id] = { count: item.count, credits: item.credits };
          return acc;
        }, {}),
      },
      posts: {
        active: activePosts,
        total: totalPosts,
      },
      earnings: {
        today: todayEarnings[0]?.total || 0,
        weekly: weeklyEarnings[0]?.total || 0,
        monthly: monthlyEarnings[0]?.total || 0,
      },
      recent: {
        transactions: recentTransactions,
      },
    };

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calculate engagement streak
async function calculateEngagementStreak(db: any, userId: string): Promise<number> {
  try {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);
    
    // Check each day going backwards
    for (let i = 0; i < 30; i++) { // Check last 30 days max
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayEngagements = await db.collection('engagements').countDocuments({
        userId,
        status: 'completed',
        createdAt: {
          $gte: dayStart,
          $lte: dayEnd
        }
      });
      
      if (dayEngagements > 0) {
        streak++;
      } else {
        break; // Streak broken
      }
      
      // Move to previous day
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  } catch (error) {
    console.error('Calculate streak error:', error);
    return 0;
  }
}