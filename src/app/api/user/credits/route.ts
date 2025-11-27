import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
      console.log('🔴 User not found in database - attempting auto-creation');
      
      // Try to create the user automatically using session data
      try {
        const newUserData = {
          twitterId: session.user.twitterId || session.user.id,
          username: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`,
          displayName: session.user.name || 'User',
          email: session.user.email || null,
          avatar: session.user.image || null,
          credits: 2,
          totalEarned: 2,
          totalSpent: 0,
          joinedAt: new Date(),
          lastActive: new Date(),
          isActive: true,
          createdVia: 'auto_creation_on_credits_api',
          autoCreated: true
        };

        const insertResult = await db.collection('users').insertOne(newUserData);
        console.log('✅ User auto-created with ID:', insertResult.insertedId);

        // Create welcome transaction
        await db.collection('credit_transactions').insertOne({
          userId: insertResult.insertedId,
          type: 'bonus',
          amount: 2,
          balance: 2,
          description: 'Auto-created user - welcome bonus',
          createdAt: new Date(),
          metadata: { 
            reason: 'auto_user_creation',
            sessionUserId: session.user.id,
            twitterId: session.user.twitterId 
          }
        });

        return NextResponse.json({
          success: true,
          data: {
            credits: 2,
            userId: insertResult.insertedId.toString(),
            twitterId: newUserData.twitterId,
            source: 'auto_created',
            message: 'User auto-created successfully'
          }
        });
        
      } catch (createError) {
        console.error('❌ Failed to auto-create user:', createError);
        
        // Fallback to session data
        const fallbackCredits = session.user.credits || 2;
        console.log('⚠️ Using session fallback credits:', fallbackCredits);
        
        return NextResponse.json({
          success: true,
          data: {
            credits: fallbackCredits,
            source: 'session_fallback',
            warning: 'User not found and auto-creation failed, using session data'
          }
        });
      }
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
        userId: user._id, // FIX: Store as ObjectId for consistency
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