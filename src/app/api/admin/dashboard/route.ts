import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/dashboard - Admin dashboard statistics
export async function GET(req: NextRequest) {
  try {
    console.log('👨‍💼 ADMIN DASHBOARD - Starting...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Add admin permission check here
    // For now, allowing all authenticated users to see admin data
    
    const { db } = await connectToDatabase();
    
    console.log('📊 ADMIN - Fetching dashboard statistics...');

    // Get current date for today's calculations
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    console.log('📅 Today start:', todayStart);

    // Run all queries in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      todaySignups,
      totalCredits,
      totalEngagements,
      recentUsers
    ] = await Promise.all([
      // Total users count
      db.collection('users').countDocuments(),
      
      // Active users (signed in within last 7 days)
      db.collection('users').countDocuments({
        lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      
      // Today's signups
      db.collection('users').countDocuments({
        joinedAt: { $gte: todayStart }
      }),
      
      // Total credits across all users
      db.collection('users').aggregate([
        { $group: { _id: null, totalCredits: { $sum: '$credits' } } }
      ]).toArray(),
      
      // Total engagements
      db.collection('engagements').countDocuments(),
      
      // Recent users for user management
      db.collection('users').find({})
        .sort({ joinedAt: -1 })
        .limit(20)
        .project({
          _id: 1,
          twitterId: 1,
          username: 1,
          displayName: 1,
          email: 1,
          avatar: 1,
          credits: 1,
          totalEarned: 1,
          joinedAt: 1,
          lastActive: 1,
          isActive: 1
        })
        .toArray()
    ]);

    // Calculate active user percentage
    const activePercentage = totalUsers > 0 ? ((activeUsers / totalUsers) * 100) : 0;
    
    // Extract total credits
    const totalCreditsSum = totalCredits.length > 0 ? totalCredits[0].totalCredits : 0;

    console.log('📈 ADMIN STATS:', {
      totalUsers,
      activeUsers,
      todaySignups,
      totalCreditsSum,
      totalEngagements
    });

    // Format recent users for admin display
    const formattedUsers = recentUsers.map(user => ({
      id: user._id.toString(),
      twitterId: user.twitterId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatar: user.avatar,
      credits: user.credits || 0,
      totalEarned: user.totalEarned || 0,
      joinedAt: user.joinedAt,
      lastActive: user.lastActive,
      isActive: user.isActive || false,
      daysSinceJoined: user.joinedAt ? 
        Math.floor((Date.now() - new Date(user.joinedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0
    }));

    const dashboardData = {
      stats: {
        totalUsers,
        activeUsers,
        activePercentage: Math.round(activePercentage * 10) / 10, // Round to 1 decimal
        todaySignups,
        totalCredits: totalCreditsSum,
        totalEngagements
      },
      users: formattedUsers,
      lastUpdated: new Date().toISOString()
    };

    console.log('✅ ADMIN DASHBOARD - Data prepared successfully');
    console.log(`📊 Found ${totalUsers} total users, ${activeUsers} active users`);

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Admin dashboard error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch admin dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}