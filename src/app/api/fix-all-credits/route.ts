import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Fix all users to have proper credits and ensure display works
export async function POST(req: NextRequest) {
  try {
    console.log('🔧 FIXING ALL CREDITS - Starting comprehensive fix...');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get all users
    const allUsers = await db.collection('users').find({}).toArray();
    console.log(`📊 Found ${allUsers.length} users to fix`);
    
    let fixedUsers = 0;
    let creditsGiven = 0;
    
    for (const user of allUsers) {
      try {
        const currentCredits = user.credits || 0;
        
        // Ensure every user has at least 2 credits
        if (currentCredits < 2) {
          const creditsToAdd = 2 - currentCredits;
          
          // Update user with 2 credits
          await db.collection('users').updateOne(
            { _id: user._id },
            {
              $set: {
                credits: 2,
                totalEarned: Math.max(user.totalEarned || 0, 2),
                lastActive: new Date()
              }
            }
          );
          
          // Create credit transaction for audit trail
          await db.collection('credit_transactions').insertOne({
            userId: user._id.toString(),
            type: 'credit_fix',
            amount: creditsToAdd,
            balance: 2,
            description: `Credit fix: ${currentCredits} → 2 credits`,
            createdAt: new Date(),
            metadata: {
              reason: 'comprehensive_credit_fix',
              oldCredits: currentCredits,
              newCredits: 2,
              fixedBy: session.user.id
            }
          });
          
          fixedUsers++;
          creditsGiven += creditsToAdd;
          
          console.log(`✅ Fixed user ${user._id}: ${currentCredits} → 2 credits`);
        } else {
          console.log(`👤 User ${user._id} already has ${currentCredits} credits`);
        }
      } catch (userError) {
        console.error(`❌ Failed to fix user ${user._id}:`, userError);
      }
    }
    
    // Get updated counts
    const totalUsers = await db.collection('users').countDocuments();
    const totalCreditsInSystem = await db.collection('users').aggregate([
      { $group: { _id: null, totalCredits: { $sum: '$credits' } } }
    ]).toArray();
    
    const result = {
      success: true,
      message: 'Credit fix completed successfully',
      stats: {
        totalUsers,
        usersFixed: fixedUsers,
        creditsGiven,
        totalCreditsInSystem: totalCreditsInSystem[0]?.totalCredits || 0
      }
    };
    
    console.log('🎉 CREDIT FIX COMPLETED:', result.stats);
    
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ CREDIT FIX FAILED:', error);
    return NextResponse.json({
      success: false,
      error: 'Credit fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Get current credit status of all users
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get credit distribution
    const creditStats = await db.collection('users').aggregate([
      {
        $group: {
          _id: '$credits',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Get users with 0 credits
    const zeroCreditsUsers = await db.collection('users')
      .find({ $or: [{ credits: 0 }, { credits: null }, { credits: { $exists: false } }] })
      .limit(10)
      .toArray();
    
    // Get total stats
    const totalUsers = await db.collection('users').countDocuments();
    const totalTransactions = await db.collection('credit_transactions').countDocuments();
    
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalTransactions,
        creditDistribution: creditStats,
        usersWithZeroCredits: zeroCreditsUsers.length,
        sampleZeroCreditsUsers: zeroCreditsUsers.map(u => ({
          id: u._id.toString(),
          twitterId: u.twitterId,
          username: u.username,
          credits: u.credits,
          joinedAt: u.joinedAt
        }))
      }
    });

  } catch (error) {
    console.error('Get credit status error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get credit status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}