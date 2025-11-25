import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// API endpoint to fix user credits - call this to fix existing users
export async function POST(req: NextRequest) {
  try {
    console.log('=== FIXING USER CREDITS ===');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userIdentifiers = {
      twitterId: session.user.twitterId || session.user.id,
      email: session.user.email,
      name: session.user.name,
      username: session.user.username,
    };
    
    console.log('Session user object:', JSON.stringify(session.user, null, 2));
    console.log('Looking for user:', userIdentifiers);

    // Find user by multiple methods
    let user = null;
    
    // Method 1: Try by twitterId
    if (userIdentifiers.twitterId) {
      user = await db.collection('users').findOne({ twitterId: userIdentifiers.twitterId });
      console.log('Search by twitterId:', userIdentifiers.twitterId, user ? 'FOUND' : 'NOT FOUND');
    }
    
    // Method 2: Try by email
    if (!user && userIdentifiers.email) {
      user = await db.collection('users').findOne({ email: userIdentifiers.email });
      console.log('Search by email:', userIdentifiers.email, user ? 'FOUND' : 'NOT FOUND');
    }
    
    // Method 3: Try by username
    if (!user && userIdentifiers.username) {
      user = await db.collection('users').findOne({ username: userIdentifiers.username });
      console.log('Search by username:', userIdentifiers.username, user ? 'FOUND' : 'NOT FOUND');
    }
    
    // Method 4: Try by displayName
    if (!user && userIdentifiers.name) {
      user = await db.collection('users').findOne({ displayName: userIdentifiers.name });
      console.log('Search by displayName:', userIdentifiers.name, user ? 'FOUND' : 'NOT FOUND');
    }

    console.log('Found user:', user ? { id: user._id, credits: user.credits } : 'NOT FOUND');

    if (!user) {
      // Create user with proper credits
      const newUser = {
        twitterId: userIdentifiers.twitterId || `temp_${Date.now()}`, // Generate temporary ID if missing
        username: userIdentifiers.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || 'user_' + Date.now(),
        displayName: userIdentifiers.name || session.user.name || 'User',
        email: userIdentifiers.email,
        avatar: session.user.image,
        credits: 2, // Set to 2 credits
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

      const result = await db.collection('users').insertOne(newUser);
      console.log('Created new user with 2 credits:', result.insertedId);

      // Create initial credit transaction
      await db.collection('credit_transactions').insertOne({
        userId: result.insertedId.toString(),
        type: 'starting_bonus',
        amount: 2,
        balance: 2,
        description: 'Starting credits for new user',
        createdAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        action: 'created',
        userId: result.insertedId.toString(),
        credits: 2,
        message: 'New user created with 2 starting credits'
      });
    }

    // Update existing user to have 2 credits
    const updateResult = await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          credits: 2,
          lastActive: new Date() 
        }
      }
    );

    console.log('Updated user credits:', updateResult);

    // Create a credit adjustment transaction if needed
    if (user.credits !== 2) {
      await db.collection('credit_transactions').insertOne({
        userId: user._id.toString(),
        type: 'adjustment',
        amount: 2 - user.credits,
        balance: 2,
        description: `Credit adjustment: ${user.credits} → 2`,
        createdAt: new Date(),
        metadata: { 
          oldBalance: user.credits,
          newBalance: 2,
          reason: 'fix_starting_credits'
        }
      });
    }

    return NextResponse.json({
      success: true,
      action: 'updated',
      userId: user._id.toString(),
      oldCredits: user.credits,
      newCredits: 2,
      message: `Credits updated from ${user.credits} to 2`
    });

  } catch (error) {
    console.error('Error fixing user credits:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fix user credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also allow GET to check user status
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const userIdentifiers = {
      twitterId: session.user.twitterId || session.user.id,
      email: session.user.email,
    };

    let user = null;
    if (userIdentifiers.twitterId) {
      user = await db.collection('users').findOne({ twitterId: userIdentifiers.twitterId });
    }
    if (!user && userIdentifiers.email) {
      user = await db.collection('users').findOne({ email: userIdentifiers.email });
    }

    return NextResponse.json({
      session: {
        user: session.user,
        userIdentifiers
      },
      user: user ? {
        id: user._id.toString(),
        twitterId: user.twitterId,
        username: user.username,
        credits: user.credits,
        joinedAt: user.joinedAt
      } : null,
      needsFix: !user || user.credits !== 2
    });

  } catch (error) {
    console.error('Error checking user status:', error);
    return NextResponse.json({ error: 'Failed to check user status' }, { status: 500 });
  }
}