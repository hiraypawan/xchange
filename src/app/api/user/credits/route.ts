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
      username: session.user.username,
      name: session.user.name,
      sessionCredits: session.user.credits,
      fullSessionUser: session.user
    });

    const { db } = await connectToDatabase();
    console.log('✅ Database connected');

    // Enhanced user lookup with comprehensive fallback methods
    let user = null;
    const searchQueries = [];
    
    // Method 1: Try by MongoDB ObjectId (primary identifier)
    if (session.user.id && ObjectId.isValid(session.user.id)) {
      try {
        user = await db.collection('users').findOne({ _id: new ObjectId(session.user.id) });
        console.log('🔍 Method 1 - ObjectId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
        if (user) console.log('✅ Found user by ObjectId:', user._id);
        searchQueries.push('ObjectId: ' + session.user.id);
      } catch (error) {
        console.log('❌ ObjectId lookup failed:', error);
        searchQueries.push('ObjectId: FAILED');
      }
    }
    
    // Method 2: Try by twitterId (most reliable for Twitter auth)
    if (!user && session.user.twitterId) {
      user = await db.collection('users').findOne({ twitterId: session.user.twitterId });
      console.log('🔍 Method 2 - TwitterId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      if (user) console.log('✅ Found user by twitterId:', user.twitterId);
      searchQueries.push('TwitterId: ' + session.user.twitterId);
    }
    
    // Method 3: Try using session.user.id as twitterId (fallback)
    if (!user && session.user.id) {
      user = await db.collection('users').findOne({ twitterId: session.user.id });
      console.log('🔍 Method 3 - ID as TwitterId lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      if (user) console.log('✅ Found user by ID-as-TwitterId:', user.twitterId);
      searchQueries.push('ID-as-TwitterId: ' + session.user.id);
    }
    
    // Method 4: Try by email if available
    if (!user && session.user.email) {
      user = await db.collection('users').findOne({ email: session.user.email });
      console.log('🔍 Method 4 - Email lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      if (user) console.log('✅ Found user by email:', user.email);
      searchQueries.push('Email: ' + session.user.email);
    }
    
    // Method 5: Try by username if available
    if (!user && session.user.username) {
      user = await db.collection('users').findOne({ username: session.user.username });
      console.log('🔍 Method 5 - Username lookup result:', user ? 'FOUND' : 'NOT_FOUND');
      if (user) console.log('✅ Found user by username:', user.username);
      searchQueries.push('Username: ' + session.user.username);
    }
    
    console.log('🔍 All search methods attempted:', searchQueries);

    if (!user) {
      console.log('🔴 User not found in database - debugging database state');
      
      // Debug: Check what users exist in the database
      try {
        const totalUsers = await db.collection('users').countDocuments();
        const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
        console.log('📊 Database debug info:', {
          totalUsers,
          sampleUserIds: sampleUsers.map(u => ({ 
            _id: u._id, 
            twitterId: u.twitterId, 
            username: u.username,
            displayName: u.displayName 
          }))
        });
        
        // Check if there's a user with a similar identifier
        const similarUsers = await db.collection('users').find({
          $or: [
            { twitterId: { $regex: session.user.id?.slice(-6) || '', $options: 'i' } },
            { displayName: { $regex: session.user.name || '', $options: 'i' } },
            { username: { $regex: session.user.username || session.user.name?.replace(/\s+/g, '_').toLowerCase() || '', $options: 'i' } }
          ].filter(query => Object.values(query)[0])
        }).limit(5).toArray();
        
        console.log('🔍 Found similar users:', similarUsers.map(u => ({
          _id: u._id,
          twitterId: u.twitterId,
          username: u.username,
          displayName: u.displayName
        })));
        
      } catch (debugError) {
        console.error('❌ Database debug failed:', debugError);
      }
      
      console.log('🔧 Attempting auto-creation with session data...');
      
      // Try to create the user automatically using session data
      try {
        // Ensure we have a valid twitterId
        const twitterId = session.user.twitterId || session.user.id;
        if (!twitterId) {
          throw new Error('No valid Twitter ID or user ID available for creation');
        }
        
        // Check one more time if user exists (race condition prevention)
        const doubleCheckUser = await db.collection('users').findOne({
          $or: [
            { twitterId: twitterId },
            { _id: ObjectId.isValid(session.user.id) ? new ObjectId(session.user.id) : null }
          ].filter(Boolean)
        });
        
        if (doubleCheckUser) {
          console.log('🎯 User found on double-check! Using existing user:', doubleCheckUser._id);
          user = doubleCheckUser;
          // Continue to the existing user logic below
        } else {
          // Generate unique username
          let baseUsername = session.user.username || 
                            session.user.name?.replace(/\s+/g, '_').toLowerCase() || 
                            `user_${Date.now()}`;
          
          // Ensure uniqueness
          let username = baseUsername;
          let counter = 1;
          while (await db.collection('users').findOne({ username })) {
            username = `${baseUsername}_${counter}`;
            counter++;
            if (counter > 10) break; // Prevent infinite loop
          }
        
          const newUserData = {
            twitterId: twitterId,
            username: username,
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
            autoCreated: true,
            sessionBackup: {
              originalSessionId: session.user.id,
              originalTwitterId: session.user.twitterId,
              originalUsername: session.user.username,
              createdAt: new Date()
            }
          };

          console.log('🔧 Creating user with data:', {
            twitterId: newUserData.twitterId,
            username: newUserData.username,
            displayName: newUserData.displayName
          });

          const insertResult = await db.collection('users').insertOne(newUserData);
          console.log('✅ User auto-created with ID:', insertResult.insertedId);

          // Create welcome transaction
          await db.collection('credit_transactions').insertOne({
            userId: insertResult.insertedId,
            type: 'bonus',
            amount: 2,
            balance: 2,
            description: 'Auto-created user - welcome bonus (credits API)',
            createdAt: new Date(),
            metadata: { 
              reason: 'auto_user_creation_credits_api',
              sessionUserId: session.user.id,
              sessionTwitterId: session.user.twitterId,
              autoCreated: true
            }
          });

          return NextResponse.json({
            success: true,
            data: {
              credits: 2,
              userId: insertResult.insertedId.toString(),
              twitterId: newUserData.twitterId,
              username: newUserData.username,
              source: 'auto_created',
              message: 'User auto-created successfully via credits API'
            }
          });
        }
        
      } catch (createError) {
        console.error('❌ Failed to auto-create user:', createError);
        console.error('❌ Create error details:', {
          name: createError instanceof Error ? createError.name : 'Unknown',
          message: createError instanceof Error ? createError.message : 'Unknown error',
          stack: createError instanceof Error ? createError.stack?.slice(0, 500) : 'No stack'
        });
        
        // Fallback to session data
        const fallbackCredits = session.user.credits || 2;
        console.log('⚠️ Using session fallback credits:', fallbackCredits);
        
        return NextResponse.json({
          success: true,
          data: {
            credits: fallbackCredits,
            source: 'session_fallback',
            warning: 'User not found and auto-creation failed, using session data',
            error: createError instanceof Error ? createError.message : 'Unknown error'
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