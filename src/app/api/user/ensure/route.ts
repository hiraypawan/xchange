import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// POST /api/user/ensure - Ensure user exists in database
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Check if user exists
    let user = null;
    
    // Try by twitterId first
    if (session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
    }
    
    // Try by email if not found
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
    }

    // Create user if doesn't exist
    if (!user) {
      console.log('Creating new user for session:', {
        twitterId: session.user.twitterId,
        email: session.user.email,
        name: session.user.name
      });
      
      const newUser = {
        twitterId: session.user.twitterId,
        email: session.user.email,
        name: session.user.name,
        username: session.user.username || session.user.name?.replace(/\s+/g, '').toLowerCase(),
        profileImage: session.user.image,
        credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
        totalEarned: 0,
        totalSpent: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        isActive: true,
        settings: {
          autoEngage: false,
          engagementTypes: ['like', 'retweet'],
          maxEngagementsPerHour: 20,
          rateLimit: 3
        }
      };
      
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
      
      console.log('User created successfully:', result.insertedId);
    } else {
      // Update last active
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastActive: new Date(),
            // Update profile info from session if changed
            name: session.user.name || user.name,
            profileImage: session.user.image || user.profileImage
          }
        }
      );
      
      console.log('User found and updated:', user._id);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        twitterId: user.twitterId,
        name: user.name,
        username: user.username,
        credits: user.credits,
        totalEarned: user.totalEarned,
        totalSpent: user.totalSpent,
        joinedAt: user.joinedAt
      }
    });
    
  } catch (error) {
    console.error('Ensure user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}