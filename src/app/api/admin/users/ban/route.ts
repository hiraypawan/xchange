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

    const { userId, ban } = await request.json();

    if (!userId || typeof ban !== 'boolean') {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    // Check if user exists
    const currentUser = await db.collection('users').findOne({ _id: userObjectId });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update user ban status
    const updateResult = await db.collection('users').updateOne(
      { _id: userObjectId },
      { 
        $set: {
          isBanned: ban,
          bannedAt: ban ? new Date() : null,
          bannedBy: ban ? 'admin' : null,
          lastModified: new Date()
        }
      }
    );

    if (updateResult.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log admin action
    await db.collection('admin_logs').insertOne({
      adminId: 'admin',
      adminName: 'Admin User',
      action: ban ? 'BAN_USER' : 'UNBAN_USER',
      targetUserId: userObjectId,
      details: `User ${ban ? 'banned' : 'unbanned'} by admin`,
      metadata: {
        ban,
        targetUserName: currentUser.name,
        targetUserEmail: currentUser.email
      },
      createdAt: new Date(),
      timestamp: new Date()
    });

    console.log(`Admin ${session.user?.name} ${ban ? 'banned' : 'unbanned'} user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: `User ${ban ? 'banned' : 'unbanned'} successfully` 
    });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}