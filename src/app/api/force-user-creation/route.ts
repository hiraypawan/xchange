import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Force create user in database - bypasses all checks
export async function POST(req: NextRequest) {
  try {
    console.log('💪 FORCE USER CREATION - Starting...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Not authenticated', 
        action: 'Please sign in first' 
      }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    console.log('✅ Database connected');

    // Delete any existing test users first to avoid conflicts
    await db.collection('users').deleteMany({ 
      $or: [
        { twitterId: { $regex: /^test_/ } },
        { username: { $regex: /^test_user_/ } }
      ]
    });

    // Get session data
    const sessionData = {
      id: session.user.id,
      twitterId: session.user.twitterId,
      email: session.user.email,
      name: session.user.name,
      username: session.user.username,
      image: session.user.image
    };
    
    console.log('📋 Session data:', sessionData);

    // Create unique identifiers
    const timestamp = Date.now();
    const twitterId = sessionData.twitterId || sessionData.id || `user_${timestamp}`;
    const username = sessionData.username || 
                    sessionData.name?.replace(/\s+/g, '_').toLowerCase() || 
                    `user_${timestamp}`;
    
    // Force create user with guaranteed unique values
    const newUser = {
      twitterId: twitterId,
      username: `${username}_${timestamp}`, // Ensure uniqueness
      displayName: sessionData.name || 'User',
      email: sessionData.email || `user_${timestamp}@temp.com`,
      avatar: sessionData.image,
      credits: 2, // FORCE 2 CREDITS
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
      // Add metadata for tracking
      createdVia: 'force_user_creation',
      createdAt: new Date(),
      originalSession: sessionData
    };

    console.log('👤 Creating user:', {
      twitterId: newUser.twitterId,
      username: newUser.username,
      credits: newUser.credits
    });

    // Insert user
    const insertResult = await db.collection('users').insertOne(newUser);
    console.log('✅ User created with ID:', insertResult.insertedId);
    
    // Verify insertion
    const verifyUser = await db.collection('users').findOne({ _id: insertResult.insertedId });
    console.log('✅ Verification - Credits:', verifyUser?.credits);

    // Create starting credits transaction
    const transaction = {
      userId: insertResult.insertedId.toString(),
      type: 'starting_bonus',
      amount: 2,
      balance: 2,
      description: 'Force created user - starting credits',
      createdAt: new Date(),
      metadata: {
        method: 'force_user_creation',
        session: sessionData
      }
    };

    const txResult = await db.collection('credit_transactions').insertOne(transaction);
    console.log('✅ Transaction created:', txResult.insertedId);

    // Update session data (for next requests)
    session.user.id = insertResult.insertedId.toString();
    session.user.twitterId = newUser.twitterId;
    session.user.username = newUser.username;
    (session.user as any).credits = 2;

    return NextResponse.json({
      success: true,
      action: 'force_created',
      user: {
        id: insertResult.insertedId.toString(),
        twitterId: newUser.twitterId,
        username: newUser.username,
        displayName: newUser.displayName,
        credits: 2
      },
      transactionId: txResult.insertedId,
      message: 'User force created with 2 credits successfully'
    });

  } catch (error) {
    console.error('❌ FORCE USER CREATION FAILED:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined,
      action: 'Force creation failed'
    }, { status: 500 });
  }
}