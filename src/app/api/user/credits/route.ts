import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET /api/user/credits - Get user's current credit balance
export async function GET(req: NextRequest) {
  try {
    console.log('💰 CREDITS API - Starting...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No valid session found' },
        { status: 401 }
      );
    }

    console.log('👤 Session user data:', {
      id: session.user.id,
      twitterId: session.user.twitterId,
      sessionCredits: session.user.credits
    });

    const { db } = await connectToDatabase();
    console.log('✅ Database connected');

    // Find user with multiple fallback methods
    let user = null;
    
    // Method 1: Try by twitterId (most reliable)
    if (session.user.twitterId) {
      user = await db.collection('users').findOne({ twitterId: session.user.twitterId });
      console.log('🔍 TwitterId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
    }
    
    // Method 2: Try by ObjectId if available
    if (!user && session.user.id && ObjectId.isValid(session.user.id)) {
      try {
        user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
        console.log('🔍 ObjectId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      } catch (error) {
        console.log('❌ ObjectId lookup failed:', error);
      }
    }

    // Method 3: Try using session.user.id as twitterId
    if (!user && session.user.id) {
      user = await db.collection('users').findOne({ twitterId: session.user.id });
      console.log('🔍 ID as TwitterId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
    }

    if (!user) {
      console.log('🔴 User not found in database');
      
      // Return session credits as fallback
      const fallbackCredits = session.user.credits || 2;
      console.log('⚠️ Returning fallback credits:', fallbackCredits);
      
      return NextResponse.json({
        success: true,
        data: {
          credits: fallbackCredits,
          source: 'session_fallback',
          warning: 'User not found in database, using session data'
        }
      });
    }

    // Ensure user has credits
    const currentCredits = user.credits || 2;
    
    // If credits are missing, update the user record
    if (!user.credits || user.credits < 2) {
      console.log('🔄 Updating user credits to minimum 2');
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            credits: 2,
            lastActive: new Date()
          } 
        }
      );
      
      // Create credit transaction record
      await db.collection('credit_transactions').insertOne({
        userId: user._id.toString(),
        type: 'credit_adjustment',
        amount: 2 - (user.credits || 0),
        balance: 2,
        description: 'Ensuring minimum 2 credits',
        createdAt: new Date(),
        metadata: { 
          reason: 'credit_api_adjustment',
          previousCredits: user.credits || 0
        }
      });
    }

    const finalCredits = Math.max(currentCredits, 2);

    console.log('✅ Credits fetched successfully:', {
      userId: user._id.toString(),
      credits: finalCredits
    });

    return NextResponse.json({
      success: true,
      data: {
        credits: finalCredits,
        userId: user._id.toString(),
        twitterId: user.twitterId,
        source: 'database'
      }
    });

  } catch (error) {
    console.error('❌ Credits API Error:', error);
    
    // Return fallback response even on error
    const session = await getServerSession(authOptions);
    const fallbackCredits = session?.user?.credits || 2;
    
    return NextResponse.json({
      success: true,
      data: {
        credits: fallbackCredits,
        source: 'error_fallback',
        error: 'Database error, using fallback'
      }
    });
  }
}