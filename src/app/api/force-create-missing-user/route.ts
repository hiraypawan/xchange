import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// POST /api/force-create-missing-user - Force create user if they don't exist in database
export async function POST(req: NextRequest) {
  try {
    console.log('🚨 FORCE CREATE MISSING USER - Starting...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'No session found' },
        { status: 401 }
      );
    }

    console.log('👤 Session user data:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      name: session.user.name,
      email: session.user.email
    });

    const { db } = await connectToDatabase();
    
    // Check if user exists in database
    let existingUser = null;
    
    // Try to find by twitterId first
    if (session.user.twitterId) {
      existingUser = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
    }
    
    // Try to find by ObjectId if available
    if (!existingUser && session.user.id && ObjectId.isValid(session.user.id)) {
      existingUser = await db.collection('users').findOne({ 
        _id: new ObjectId(session.user.id) 
      });
    }
    
    if (existingUser) {
      console.log('✅ User already exists in database:', existingUser._id);
      return NextResponse.json({
        success: true,
        message: 'User already exists',
        data: {
          userId: existingUser._id.toString(),
          twitterId: existingUser.twitterId,
          credits: existingUser.credits
        }
      });
    }
    
    console.log('🚨 User NOT found in database, force creating...');
    
    // Force create the missing user
    const newUser = {
      twitterId: session.user.twitterId || session.user.id || `fallback_${Date.now()}`,
      username: session.user.email?.split('@')[0] || `user_${Date.now()}`,
      displayName: session.user.name || 'User',
      email: session.user.email || null,
      avatar: session.user.image || null,
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
      createdVia: 'force_create_api',
      uniqueKey: `twitter_${session.user.twitterId || session.user.id || Date.now()}`
    };
    
    const insertResult = await db.collection('users').insertOne(newUser);
    console.log('✅ User force created with ID:', insertResult.insertedId);
    
    // Create starting credits transaction
    await db.collection('credit_transactions').insertOne({
      userId: insertResult.insertedId,
      type: 'bonus',
      amount: 2,
      balance: 2,
      description: 'Welcome bonus - 2 starting credits (force created)',
      createdAt: new Date(),
      metadata: {
        reason: 'force_create_missing_user',
        sessionData: {
          id: session.user.id,
          twitterId: session.user.twitterId,
          name: session.user.name
        }
      }
    });
    
    console.log('✅ Credit transaction created');
    
    // Verify user was created
    const verifyUser = await db.collection('users').findOne({ 
      _id: insertResult.insertedId 
    });
    
    if (!verifyUser) {
      throw new Error('User creation verification failed');
    }
    
    console.log('🎉 FORCE CREATE SUCCESSFUL:', {
      userId: verifyUser._id.toString(),
      twitterId: verifyUser.twitterId,
      credits: verifyUser.credits
    });

    return NextResponse.json({
      success: true,
      message: 'User successfully force created',
      data: {
        userId: verifyUser._id.toString(),
        twitterId: verifyUser.twitterId,
        username: verifyUser.username,
        displayName: verifyUser.displayName,
        credits: verifyUser.credits,
        created: true
      }
    });

  } catch (error) {
    console.error('❌ Force create user failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to force create user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}