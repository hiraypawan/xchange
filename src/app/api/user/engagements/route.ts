import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/user/engagements - Get user engagements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '1000');

    const { db } = await connectToDatabase();
    
    // Enhanced user lookup strategy matching the auth flow
    let user = null;
    
    console.log('Engagements API - Looking up user with identifiers:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      email: session.user.email,
      name: session.user.name
    });
    
    // First: Try by ObjectId if session.user.id is a valid MongoDB ObjectId
    if (session.user.id && session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const { ObjectId } = await import('mongodb');
        user = await db.collection('users').findOne({ 
          _id: new ObjectId(session.user.id) 
        });
        console.log('ObjectId lookup result:', user ? 'FOUND' : 'NOT FOUND');
      } catch (error) {
        console.log('ObjectId lookup failed:', error);
      }
    }
    
    // Second: Try by twitterId if available
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
      console.log('TwitterId lookup result:', user ? 'FOUND' : 'NOT FOUND');
    }
    
    // Third: Try by email if available
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
      console.log('Email lookup result:', user ? 'FOUND' : 'NOT FOUND');
    }

    if (!user) {
      console.error('Engagements API - User not found with session data:', {
        id: session.user.id,
        twitterId: session.user.twitterId,
        email: session.user.email
      });
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build query with both possible userId formats for compatibility
    const userIdQueries = [user._id.toString()];
    if (user.twitterId) {
      userIdQueries.push(user.twitterId);
    }

    // Get engagements
    const engagements = await db.collection('engagements')
      .find({ userId: { $in: userIdQueries } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: engagements
    });
  } catch (error) {
    console.error('Get engagements error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}