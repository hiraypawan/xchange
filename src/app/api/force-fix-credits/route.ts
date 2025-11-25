import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Force fix credits for current user - guaranteed to work
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 FORCE FIX CREDITS - Starting...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'No session', 
        action: 'Please sign in first' 
      }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    console.log('✅ Database connected');

    // Get all possible user identifiers
    const identifiers = {
      twitterId: session.user.twitterId || session.user.id,
      email: session.user.email,
      username: session.user.username,
      name: session.user.name
    };
    
    console.log('🔍 User identifiers:', identifiers);

    // Try to find existing user with multiple methods
    let user = null;
    const searches = [
      { twitterId: identifiers.twitterId },
      { email: identifiers.email },
      { username: identifiers.username },
      { displayName: identifiers.name }
    ];

    for (const search of searches) {
      if (Object.values(search)[0]) { // Only search if value exists
        user = await db.collection('users').findOne(search);
        if (user) {
          console.log('👤 Found user via:', Object.keys(search)[0], user._id);
          break;
        }
      }
    }

    // If no user found, create one
    if (!user) {
      console.log('🆕 Creating new user...');
      const newUser = {
        twitterId: identifiers.twitterId || `temp_${Date.now()}`,
        username: identifiers.username || identifiers.name?.replace(/\s+/g, '_').toLowerCase() || 'user_' + Date.now(),
        displayName: identifiers.name || 'User',
        email: identifiers.email,
        avatar: session.user.image,
        credits: 2, // FORCE 2 CREDITS
        totalEarned: 2,
        totalSpent: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
        isActive: true,
        settings: {
          autoEngage: false,
          maxEngagementsPerDay: 50,
          emailNotifications: true,
          pushNotifications: true,
          privacy: 'public',
        },
        stats: {
          totalEngagements: 0,
          successRate: 0,
          averageEarningsPerDay: 0,
          streakDays: 0,
          rank: 0,
        },
      };

      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
      
      // Create starting credits transaction
      await db.collection('credit_transactions').insertOne({
        userId: result.insertedId.toString(),
        type: 'starting_bonus',
        amount: 2,
        balance: 2,
        description: 'Force fix - starting credits',
        createdAt: new Date(),
        metadata: { method: 'force_fix', reason: 'user_creation' }
      });

      console.log('✅ NEW USER CREATED with 2 credits:', result.insertedId);
      
      return NextResponse.json({
        success: true,
        action: 'created',
        userId: result.insertedId.toString(),
        credits: 2,
        message: 'New user created with 2 credits'
      });
    }

    // User exists - force update to 2 credits
    console.log('🔄 Updating existing user credits to 2...');
    
    const oldCredits = user.credits || 0;
    await db.collection('users').updateOne(
      { _id: user._id },
      { 
        $set: { 
          credits: 2,
          lastActive: new Date(),
          totalEarned: Math.max(user.totalEarned || 0, 2) // Ensure totalEarned is at least 2
        }
      }
    );

    // Create adjustment transaction
    if (oldCredits !== 2) {
      await db.collection('credit_transactions').insertOne({
        userId: user._id.toString(),
        type: 'force_adjustment',
        amount: 2 - oldCredits,
        balance: 2,
        description: `Force fix: ${oldCredits} → 2 credits`,
        createdAt: new Date(),
        metadata: { 
          method: 'force_fix',
          oldCredits,
          newCredits: 2,
          reason: 'credit_correction'
        }
      });
    }

    console.log('✅ CREDITS FORCE UPDATED:', {
      userId: user._id,
      oldCredits,
      newCredits: 2
    });

    return NextResponse.json({
      success: true,
      action: 'updated',
      userId: user._id.toString(),
      oldCredits,
      newCredits: 2,
      message: `Credits force updated from ${oldCredits} to 2`
    });

  } catch (error) {
    console.error('❌ FORCE FIX ERROR:', error);
    return NextResponse.json({
      success: false,
      error: 'Force fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}