import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Verify user has access to the requested user data
async function verifyAccess(requestedUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return false;
  }
  return session.user.id === requestedUserId;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    
    // Verify access
    const hasAccess = await verifyAccess(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    
    // Get user data
    const user = await db.collection('users').findOne({
      _id: new ObjectId(userId)
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return safe user data (exclude sensitive info)
    const safeUser = {
      id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      credits: user.credits,
      totalEarned: user.totalEarned,
      totalSpent: user.totalSpent,
      joinedAt: user.joinedAt,
      lastActive: user.lastActive,
      isActive: user.isActive,
      stats: user.stats
    };

    return NextResponse.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    
    // Verify access
    const hasAccess = await verifyAccess(userId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const updateData = await request.json();

    // Only allow updating safe fields
    const safeUpdateData: any = {};
    const allowedFields = ['displayName', 'avatar', 'settings'];
    
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        safeUpdateData[key] = updateData[key];
      }
    });

    if (Object.keys(safeUpdateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Update user
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: safeUpdateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}