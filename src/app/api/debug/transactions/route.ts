import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// GET /api/debug/transactions - Debug transactions endpoint (same logic as real one)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('=== TRANSACTIONS DEBUG ENDPOINT ===');
    console.log('Session exists:', !!session);
    console.log('Session.user exists:', !!session?.user);
    
    if (!session?.user) {
      console.log('No session or user - returning 401');
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          debug: 'No session or user found'
        },
        { status: 401 }
      );
    }

    console.log('Session user data:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      email: session.user.email,
      name: session.user.name
    });

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');
    const limit = parseInt(searchParams.get('limit') || '100');
    
    console.log('Query params:', { since, limit });

    const { db } = await connectToDatabase();
    
    // Enhanced user lookup strategy matching the auth flow
    let user = null;
    
    console.log('Starting user lookup...');
    
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

    // Debug: Show all users in database
    const allUsers = await db.collection('users').find({}).limit(5).toArray();
    console.log('Recent users in database:', allUsers.map(u => ({
      _id: u._id,
      twitterId: u.twitterId,
      email: u.email,
      name: u.name
    })));

    if (!user) {
      console.log('User not found - returning debug info');
      
      return NextResponse.json(
        { 
          error: 'User not found',
          debug: {
            sessionUserId: session.user.id,
            sessionTwitterId: session.user.twitterId,
            sessionEmail: session.user.email,
            allUsersInDb: allUsers.map(u => ({
              _id: u._id,
              twitterId: u.twitterId,
              email: u.email
            }))
          }
        },
        { status: 404 }
      );
    }

    console.log('User found:', {
      _id: user._id,
      twitterId: user.twitterId,
      email: user.email
    });

    // Build query with both possible userId formats for compatibility
    const userIdQueries = [user._id.toString()];
    if (user.twitterId) {
      userIdQueries.push(user.twitterId);
    }
    
    const query: any = { userId: { $in: userIdQueries } };
    
    if (since) {
      query.createdAt = { $gte: new Date(since) };
    }

    console.log('Transaction query:', query);

    // Get transactions
    const transactions = await db.collection('credit_transactions')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    console.log('Transactions found:', transactions.length);

    return NextResponse.json({
      success: true,
      debug: {
        userFound: true,
        userId: user._id.toString(),
        userTwitterId: user.twitterId,
        queryUsing: userIdQueries,
        transactionsFound: transactions.length
      },
      data: transactions
    });
  } catch (error) {
    console.error('Debug transactions error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    );
  }
}