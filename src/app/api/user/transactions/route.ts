import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/user/transactions - Get user transactions
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '100');

    const { db } = await connectToDatabase();
    
    // Securely find the user by their ID from the session
    const { ObjectId } = require('mongodb');
    const userId = new ObjectId(session.user.id);
    const user = await db.collection('users').findOne({ _id: userId });

    if (!user) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'User not found.',
      });
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