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

    console.log('🔍 Fetching users from MongoDB...');
    const { db } = await connectToDatabase();
    
    // Get all users with proper sort and projection
    const users = await db.collection('users')
      .find({}, {
        projection: {
          _id: 1,
          displayName: 1,
          username: 1,
          email: 1,
          avatar: 1,
          image: 1,
          credits: 1,
          totalEarned: 1,
          totalSpent: 1,
          joinedAt: 1,
          createdAt: 1,
          lastActive: 1,
          isBanned: 1,
          isActive: 1,
          stats: 1
        }
      })
      .sort({ joinedAt: -1, createdAt: -1 })
      .limit(100)
      .toArray();
    
    console.log(`✅ Found ${users.length} users`);
    if (users.length > 0) {
      console.log('📋 Sample user:', JSON.stringify(users[0], null, 2));
    }

    // Map users to the required format
    console.log('🔄 Mapping users to frontend format...');

    const userList = users.map(user => {
      try {
        const mappedUser = {
          id: user._id.toString(),
          name: user.displayName || user.username || 'Unknown User',
          email: user.email || `${user.username}@twitter.com`,
          image: user.avatar || user.image || '/default-avatar.png',
          credits: user.credits || 0,
          totalEarned: user.totalEarned || 0,
          totalSpent: user.totalSpent || 0,
          createdAt: user.joinedAt || user.createdAt || new Date().toISOString(),
          lastActive: user.lastActive || new Date().toISOString(),
          isBanned: user.isBanned || false,
          engagementCount: user.stats?.totalEngagements || 0,
          status: user.isActive ? 'active' : 'inactive'
        };
        return mappedUser;
      } catch (err) {
        console.error('Error mapping user:', user._id, err);
        return null;
      }
    }).filter(Boolean);

    console.log('✅ Successfully mapped users:', userList.length);
    if (userList.length > 0) {
      console.log('📋 Sample mapped user:', JSON.stringify(userList[0], null, 2));
    }

    // Return just the user list as the frontend expects
    return NextResponse.json(userList);

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