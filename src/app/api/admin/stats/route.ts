import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Check if user is admin (you can modify this to match your account)
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get real data from MongoDB database
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();

    console.log('📊 Getting real admin stats from database...');

    // Calculate real statistics
    const totalUsers = await db.collection('users').countDocuments();
    
    // Active users (logged in within last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await db.collection('users').countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });

    // Total credits in circulation
    const creditsPipeline = [
      { $group: { _id: null, totalCredits: { $sum: '$credits' } } }
    ];
    const creditsResult = await db.collection('users').aggregate(creditsPipeline).toArray();
    const totalCredits = creditsResult[0]?.totalCredits || 0;

    // Total engagements (if you have engagements collection)
    let totalEngagements = 0;
    try {
      totalEngagements = await db.collection('engagements').countDocuments();
    } catch (error) {
      // Engagements collection might not exist yet
      console.log('Engagements collection not found, using 0');
    }

    // Today's signups
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const todaySignups = await db.collection('users').countDocuments({
      createdAt: { $gte: todayStart }
    });

    // Weekly growth
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklySignups = await db.collection('users').countDocuments({
      createdAt: { $gte: weekAgo }
    });

    const stats = {
      totalUsers,
      activeUsers,
      totalCredits,
      totalEngagements,
      todaySignups,
      weeklyGrowth: weeklySignups
    };

    console.log('✅ Real admin stats:', stats);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}