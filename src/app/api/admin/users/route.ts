import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Get all users
export async function GET(request: NextRequest) {
  try {
    // Verify admin access using NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      console.log('❌ Admin access denied:', { 
        hasSession: !!session, 
        isAdminResult: session ? isAdmin(session) : false,
        sessionUser: session?.user 
      });
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }
    
    console.log('✅ Admin access granted to:', session.user?.name || session.user?.id);

    console.log('🔍 Fetching all users...');
    const { db } = await connectToDatabase();

    // Debug: Check total user count and recent users
    const totalUsers = await db.collection('users').countDocuments();
    const recentUsers = await db.collection('users')
      .find({})
      .sort({ joinedAt: -1 })
      .limit(5)
      .toArray();
      
    console.log('📊 Database stats before filtering:', {
      totalUsers,
      recentUserSample: recentUsers.map(u => ({
        _id: u._id,
        twitterId: u.twitterId,
        username: u.username,
        displayName: u.displayName,
        createdVia: u.createdVia,
        joinedAt: u.joinedAt,
        autoCreated: u.autoCreated
      }))
    });

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
          createdVia: 1,
          autoCreated: 1
        }
      })
      .sort({ joinedAt: -1 })
      .toArray();

    console.log(`✅ Found ${users.length} users after projection`);

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
      status: user.isActive ? 'active' : 'inactive',
      // Add debugging fields
      twitterId: user.twitterId,
      createdVia: user.createdVia,
      autoCreated: user.autoCreated
    }));

    console.log('📊 Admin users API response:', {
      totalMappedUsers: mappedUsers.length,
      firstUserSample: mappedUsers[0],
      autoCreatedUsers: mappedUsers.filter(u => u.autoCreated).length,
      forceCreatedUsers: mappedUsers.filter(u => u.createdVia?.includes('force')).length,
      apiCreatedUsers: mappedUsers.filter(u => u.createdVia?.includes('auto_creation')).length
    });
    
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
    // Verify admin access using NextAuth session
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      console.log('❌ Admin PUT access denied');
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
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