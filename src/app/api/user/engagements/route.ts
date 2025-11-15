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
    
    // Get user by multiple possible identifiers
    let user = null;
    
    // Try by ObjectId first (if session.user.id looks like an ObjectId)
    if (session.user.id.match(/^[0-9a-fA-F]{24}$/)) {
      user = await db.collection('users').findOne({ 
        _id: new (await import('mongodb')).ObjectId(session.user.id) 
      });
    }
    
    // If not found, try by email
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ 
        email: session.user.email 
      });
    }
    
    // If not found, try by twitterId (if available)
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ 
        twitterId: session.user.twitterId 
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get engagements
    const engagements = await db.collection('engagements')
      .find({ userId: user._id.toString() })
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