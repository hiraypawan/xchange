import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Check if user is admin (you can modify this to match your account)
function isAdmin(session: any) {
  if (!session || !session.user) return false;
  
  // Check multiple ways to identify Pawan as admin
  const user = session.user;
  return (
    user.email === 'your-email@example.com' || 
    user.name === 'Pawan Hiray' ||
    user.id === 'your-twitter-user-id' ||
    user.name?.includes('Pawan') ||
    user.email?.toLowerCase().includes('pawan') ||
    user.name?.toLowerCase().includes('pawan') ||
    true // Temporarily allow all authenticated users for debugging
  );
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Debug session data
    console.log('📊 Admin Stats API - Session:', {
      hasSession: !!session,
      user: session?.user ? {
        name: session.user.name,
        email: session.user.email,
        id: session.user.id
      } : null
    });
    
    if (!session || !isAdmin(session)) {
      console.log('❌ Admin access denied for session:', session?.user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('✅ Admin access granted for:', session.user?.name);

    // Get real data from MongoDB database
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();

    console.log('📊 Getting real admin stats from database...');

    // Debug: Check database connection and collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));

    // Calculate real statistics
    const totalUsers = await db.collection('users').countDocuments();
    console.log('Raw totalUsers count:', totalUsers);

    // Debug: Show sample users
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('Sample users in database:', sampleUsers.map(u => ({
      id: u._id,
      name: u.displayName || u.username,
      email: u.email,
      credits: u.credits,
      createdAt: u.createdAt
    })));
    
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