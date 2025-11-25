import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Simple endpoint to fix the current user's record
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔧 Fixing user record for session:', {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      twitterId: session.user.twitterId
    });

    const { db } = await connectToDatabase();
    
    // Use session.user.id as twitterId for fallback auth users
    const twitterId = session.user.twitterId || session.user.id;
    
    // Check if user already exists
    const queryConditions = [
      { twitterId: twitterId },
      ...(session.user.email ? [{ email: session.user.email }] : [])
    ];
    
    // Only add _id query if session.user.id looks like a valid ObjectId
    if (session.user.id && session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        queryConditions.push({ _id: new ObjectId(session.user.id) });
      } catch (error) {
        console.warn('Invalid ObjectId format for session.user.id:', session.user.id);
      }
    }
    
    let user = await db.collection('users').findOne({
      $or: queryConditions
    });

    if (user) {
      // Update existing user
      const updateData = {
        twitterId: twitterId,
        displayName: session.user.name || user.displayName || 'Unknown User',
        username: session.user.username || user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown',
        email: session.user.email || user.email,
        avatar: session.user.image || user.avatar,
        lastActive: new Date(),
        updatedAt: new Date()
      };

      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      console.log('✅ Updated existing user:', user._id);
      
      return NextResponse.json({
        success: true,
        action: 'updated',
        user: {
          id: user._id,
          twitterId: updateData.twitterId,
          displayName: updateData.displayName,
          username: updateData.username,
          credits: user.credits || 0
        }
      });
    } else {
      // Create new user
      const newUser = {
        twitterId: twitterId,
        username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown',
        displayName: session.user.name || 'Unknown User',
        email: session.user.email,
        avatar: session.user.image,
        credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
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
      
      // Create welcome credit transaction
      try {
        await db.collection('credit_transactions').insertOne({
          userId: result.insertedId.toString(),
          type: 'bonus',
          amount: parseInt(process.env.USER_STARTING_CREDITS || '100'),
          balance: parseInt(process.env.USER_STARTING_CREDITS || '100'),
          description: 'Welcome bonus - Account creation',
          createdAt: new Date(),
        });
      } catch (creditError) {
        console.warn('Failed to create credit transaction:', creditError);
      }

      console.log('✅ Created new user:', result.insertedId);
      
      return NextResponse.json({
        success: true,
        action: 'created',
        user: {
          id: result.insertedId,
          twitterId: newUser.twitterId,
          displayName: newUser.displayName,
          username: newUser.username,
          credits: newUser.credits
        }
      });
    }

  } catch (error) {
    console.error('❌ User fix failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fix user record',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}