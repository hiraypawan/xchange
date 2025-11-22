import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // TODO: Replace with actual database update
    /*
    await prisma.user.update({
      where: { id: userId },
      data: { 
        isBanned: ban,
        bannedAt: ban ? new Date() : null,
        bannedBy: ban ? session.user.id : null
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: ban ? 'BAN_USER' : 'UNBAN_USER',
        targetUserId: userId,
        details: `User ${ban ? 'banned' : 'unbanned'} by admin`,
        timestamp: new Date()
      }
    });
    */

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