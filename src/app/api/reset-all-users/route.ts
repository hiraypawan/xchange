import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Emergency reset - only use when needed
export async function POST(req: NextRequest) {
  try {
    console.log('🔥 EMERGENCY USER RESET INITIATED');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get current counts before reset
    const beforeCounts = {
      users: await db.collection('users').countDocuments(),
      transactions: await db.collection('credit_transactions').countDocuments()
    };
    
    console.log('📊 Before reset:', beforeCounts);
    
    // Optional: Delete all existing users and transactions to start fresh
    // Uncomment these lines if you want to completely reset
    // await db.collection('users').deleteMany({});
    // await db.collection('credit_transactions').deleteMany({});
    
    // Instead, let's just fix all existing users to have 2 credits
    const updateResult = await db.collection('users').updateMany(
      {},
      {
        $set: {
          credits: 2,
          lastActive: new Date()
        }
      }
    );
    
    console.log('✅ Updated users:', updateResult.modifiedCount);
    
    // Create credit transactions for all users
    const allUsers = await db.collection('users').find({}).toArray();
    const transactions = allUsers.map(user => ({
      userId: user._id.toString(),
      type: 'system_reset',
      amount: 2,
      balance: 2,
      description: 'System reset - ensuring all users have 2 credits',
      createdAt: new Date(),
      metadata: { 
        reason: 'emergency_reset',
        resetBy: session.user.id,
        timestamp: new Date().toISOString()
      }
    }));
    
    if (transactions.length > 0) {
      await db.collection('credit_transactions').insertMany(transactions);
      console.log('✅ Created transactions for', transactions.length, 'users');
    }
    
    const afterCounts = {
      users: await db.collection('users').countDocuments(),
      transactions: await db.collection('credit_transactions').countDocuments()
    };
    
    console.log('📊 After reset:', afterCounts);
    
    return NextResponse.json({
      success: true,
      message: 'Emergency reset completed',
      stats: {
        before: beforeCounts,
        after: afterCounts,
        usersUpdated: updateResult.modifiedCount,
        transactionsCreated: transactions.length
      }
    });

  } catch (error) {
    console.error('❌ Emergency reset failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}