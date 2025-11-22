import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/user/transactions - Get user transactions
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
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '100');

    const { db } = await connectToDatabase();
    
    // Enhanced user lookup strategy matching the auth flow
    let user = null;
    
    console.log('Transactions API - Looking up user with identifiers:', {
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
      console.error('Transactions API - User not found with session data:', {
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
    
    const query: any = { userId: { $in: userIdQueries } };
    
    if (since) {
      query.createdAt = { $gte: new Date(since) };
    }

    // Get transactions
    const transactions = await db.collection('credit_transactions')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}