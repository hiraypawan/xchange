import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Admin endpoint to view all users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // For now, allow any authenticated user to see users list
    // Later you can add admin role checking here
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get all users
    const users = await db.collection('users')
      .find({})
      .sort({ joinedAt: -1 })
      .limit(100)
      .toArray();

    // Get user count
    const totalUsers = await db.collection('users').countDocuments();
    
    // Get credit transactions count
    const totalTransactions = await db.collection('credit_transactions').countDocuments();

    const userList = users.map(user => ({
      id: user._id.toString(),
      twitterId: user.twitterId,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      credits: user.credits || 0,
      totalEarned: user.totalEarned || 0,
      totalSpent: user.totalSpent || 0,
      joinedAt: user.joinedAt,
      lastActive: user.lastActive,
      isActive: user.isActive,
      createdVia: user.createdVia || 'unknown'
    }));

    return NextResponse.json({
      success: true,
      data: {
        users: userList,
        stats: {
          totalUsers,
          totalTransactions,
          totalCreditsIssued: userList.reduce((sum, user) => sum + user.credits, 0)
        }
      },
      message: `Found ${totalUsers} users`
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Create test user (for admin testing)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Create a test user
    const timestamp = Date.now();
    const testUser = {
      twitterId: `test_${timestamp}`,
      username: `test_user_${timestamp}`,
      displayName: `Test User ${timestamp}`,
      email: `test${timestamp}@example.com`,
      avatar: null,
      credits: 2,
      totalEarned: 2,
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
      createdVia: 'admin_test'
    };

    const result = await db.collection('users').insertOne(testUser);
    
    // Create starting credits transaction
    await db.collection('credit_transactions').insertOne({
      userId: result.insertedId.toString(),
      type: 'starting_bonus',
      amount: 2,
      balance: 2,
      description: 'Admin created test user - starting credits',
      createdAt: new Date(),
      metadata: { 
        reason: 'admin_test_user_creation',
        createdBy: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        userId: result.insertedId.toString(),
        twitterId: testUser.twitterId,
        username: testUser.username,
        credits: testUser.credits
      },
      message: 'Test user created successfully'
    });

  } catch (error) {
    console.error('Admin create user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create test user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}