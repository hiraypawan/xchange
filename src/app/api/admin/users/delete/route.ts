import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

// Check if user is admin
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id';
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === session.user?.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // TODO: Replace with actual database operations
    /*
    // Log admin action before deletion
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'DELETE_USER',
        targetUserId: userId,
        details: `User account deleted by admin`,
        timestamp: new Date()
      }
    });

    // Delete user and all related data (cascading)
    await prisma.user.delete({
      where: { id: userId }
    });
    */

    console.log(`Admin ${session.user?.name} deleted user ${userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}