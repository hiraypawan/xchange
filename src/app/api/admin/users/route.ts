import { NextRequest, NextResponse } from 'next/server';
import { adminMiddleware } from '../middleware';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheckResult = await adminMiddleware(request);
    if (adminCheckResult) {
      return adminCheckResult;
    }

    console.log('🔍 Fetching all users...');
    const { db } = await connectToDatabase();

    // Get all users with proper fields
    const users = await db.collection('users')
      .find({}, {
        projection: {
          _id: 1,
          username: 1,
          displayName: 1,
          email: 1,
          avatar: 1,
          credits: 1,
          totalEarned: 1,
          totalSpent: 1,
          joinedAt: 1,
          lastActive: 1,
          isActive: 1,
          isBanned: 1,
          stats: 1,
          twitterId: 1,
          createdVia: 1
        }
      })
      .sort({ joinedAt: -1 })
      .toArray();

    console.log(`✅ Found ${users.length} users`);

    // Map users to the expected format
    const mappedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.displayName || user.username || 'Unknown User',
      email: user.email || `${user.username || user.twitterId}@twitter.com`,
      image: user.avatar || '/default-avatar.png',
      credits: user.credits || 0,
      totalEarned: user.totalEarned || 0,
      totalSpent: user.totalSpent || 0,
      createdAt: user.joinedAt || new Date().toISOString(),
      lastActive: user.lastActive || new Date().toISOString(),
      isBanned: user.isBanned || false,
      engagementCount: user.stats?.totalEngagements || 0,
      status: user.isActive ? 'active' : 'inactive'
    }));

    console.log('📊 First user sample:', mappedUsers[0]);
    return NextResponse.json(mappedUsers);
  } catch (error) {
    console.error('❌ Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Update user (ban/unban, adjust credits)
export async function PUT(request: NextRequest) {
  try {
    // Verify admin access
    const adminCheckResult = await adminMiddleware(request);
    if (adminCheckResult) {
      return adminCheckResult;
    }

    const { userId, action, data } = await request.json();
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const userObjectId = new ObjectId(userId);

    switch (action) {
      case 'ban':
        await db.collection('users').updateOne(
          { _id: userObjectId },
          { $set: { isBanned: true } }
        );
        break;

      case 'unban':
        await db.collection('users').updateOne(
          { _id: userObjectId },
          { $set: { isBanned: false } }
        );
        break;

      case 'adjustCredits':
        const { amount } = data;
        if (typeof amount !== 'number') {
          return NextResponse.json(
            { error: 'Invalid credit amount' },
            { status: 400 }
          );
        }

        const user = await db.collection('users').findOne({ _id: userObjectId });
        if (!user) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        const newCredits = (user.credits || 0) + amount;
        if (newCredits < 0) {
          return NextResponse.json(
            { error: 'Cannot set credits below 0' },
            { status: 400 }
          );
        }

        await db.collection('users').updateOne(
          { _id: userObjectId },
          {
            $set: { credits: newCredits },
            $inc: amount > 0 ? { totalEarned: amount } : { totalSpent: -amount }
          }
        );

        // Log credit transaction
        await db.collection('credit_transactions').insertOne({
          userId: userObjectId,
          amount,
          type: 'admin_adjustment',
          previousBalance: user.credits || 0,
          newBalance: newCredits,
          description: `Admin credit adjustment: ${amount > 0 ? '+' : ''}${amount}`,
          createdAt: new Date(),
          metadata: { adminAction: true }
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}