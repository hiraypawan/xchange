import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { isAdmin } from '@/lib/admin';


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Basic validation - prevent common admin usernames from being deleted
    if (typeof userId === 'string' && (userId.toLowerCase().includes('admin') || userId.toLowerCase().includes('pawan'))) {
      return NextResponse.json({ error: 'Cannot delete admin account' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = typeof userId === 'string' ? new ObjectId(userId) : userId;

    // Get user data before deletion for logging
    const userToDelete = await db.collection('users').findOne({ _id: userObjectId });
    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Log admin action before deletion
    await db.collection('admin_logs').insertOne({
      adminId: session.user?.id || session.user?.name || 'admin',
      adminName: session.user?.name || 'Admin User',
      action: 'DELETE_USER',
      targetUserId: userObjectId,
      details: `User account deleted by admin ${session.user?.name || 'Unknown'}`,
      metadata: {
        deletedUserName: userToDelete.name,
        deletedUserEmail: userToDelete.email,
        deletedUserCredits: userToDelete.credits || 0,
        deletedUserEngagements: userToDelete.engagementCount || 0
      },
      createdAt: new Date(),
      timestamp: new Date()
    });

    // Delete user and all related data
    const deleteOperations = [
      // Delete user
      db.collection('users').deleteOne({ _id: userObjectId }),
      // Delete user's credit transactions
      db.collection('credit_transactions').deleteMany({ userId: userObjectId }),
      // Delete user's engagements
      db.collection('engagements').deleteMany({ userId: userObjectId }),
      // Delete user's posts
      db.collection('posts').deleteMany({ userId: userObjectId }),
      // Delete user's sessions if any
      db.collection('sessions').deleteMany({ userId: userObjectId.toString() })
    ];

    await Promise.all(deleteOperations);

    console.log(`Admin ${session.user?.name || 'Unknown'} deleted user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}