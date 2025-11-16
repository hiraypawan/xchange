import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { updateProfileSchema } from '@/lib/validations';
import { User } from '@/types';
import { ObjectId } from 'mongodb';

// GET /api/user - Get current user profile
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Try to find user by multiple identifiers
    let user = null;
    
    // Try by ObjectId first
    if (session.user.id && session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(session.user.id) 
        });
      } catch (error) {
        console.log('ObjectId lookup failed:', error);
      }
    }
    
    // Try by twitterId if available
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
    }
    
    // Try by email as fallback
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data
    const { _id, ...userData } = user;
    
    return NextResponse.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/user - Update user profile
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = updateProfileSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const { displayName, settings } = validation.data;

    const updateData: any = {
      displayName,
      lastActive: new Date(),
    };

    if (settings) {
      updateData.settings = settings;
    }

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(session.user.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

