import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Check if user is admin
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id';
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, amount, type = 'admin_adjustment' } = await request.json();

    if (!userId || typeof amount !== 'number') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    if (amount === 0) {
      return NextResponse.json({ error: 'Amount cannot be zero' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    // Get current user to check if they exist and get current credits
    const currentUser = await db.collection('users').findOne({ _id: userObjectId });
    
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentCredits = currentUser.credits || 0;
    const newCredits = currentCredits + amount;

    // Prevent negative credits (optional - you can remove this if you want to allow negative balances)
    if (newCredits < 0) {
      return NextResponse.json({ 
        error: `Cannot set credits below 0. Current credits: ${currentCredits}, attempted change: ${amount}` 
      }, { status: 400 });
    }

    // Update user credits
    const updateResult = await db.collection('users').updateOne(
      { _id: userObjectId },
      { 
        $inc: { credits: amount },
        $set: { lastModified: new Date() }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create transaction record
    await db.collection('credit_transactions').insertOne({
      userId: userObjectId,
      amount: amount,
      type: type,
      description: `Admin credit adjustment: ${amount > 0 ? '+' : ''}${amount} credits`,
      adminId: session.user?.id || session.user?.name,
      adminName: session.user?.name,
      previousBalance: currentCredits,
      newBalance: newCredits,
      createdAt: new Date(),
      timestamp: new Date()
    });

    // Log admin action
    await db.collection('admin_logs').insertOne({
      adminId: session.user?.id || session.user?.name,
      adminName: session.user?.name,
      action: 'ADJUST_CREDITS',
      targetUserId: userObjectId,
      details: `Credits adjusted by ${amount}. Previous balance: ${currentCredits}, New balance: ${newCredits}`,
      metadata: {
        amount,
        previousBalance: currentCredits,
        newBalance: newCredits,
        type
      },
      createdAt: new Date(),
      timestamp: new Date()
    });

    console.log(`Admin ${session.user?.name} adjusted credits for user ${userId} by ${amount}. New balance: ${newCredits}`);

    return NextResponse.json({ 
      success: true, 
      message: `Credits ${amount > 0 ? 'added' : 'removed'} successfully`,
      amount: amount,
      previousBalance: currentCredits,
      newBalance: newCredits,
      userId: userId
    });
  } catch (error) {
    console.error('Adjust credits error:', error);
    return NextResponse.json({ 
      error: 'Failed to adjust credits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}