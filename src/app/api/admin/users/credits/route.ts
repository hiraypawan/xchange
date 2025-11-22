import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';

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

    // TODO: Replace with actual database operations
    /*
    // Update user credits
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount
        }
      }
    });

    // Create transaction record
    await prisma.transaction.create({
      data: {
        userId: userId,
        amount: amount,
        type: type,
        description: `Admin credit adjustment: ${amount > 0 ? '+' : ''}${amount} credits`,
        adminId: session.user.id,
        timestamp: new Date()
      }
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        action: 'ADJUST_CREDITS',
        targetUserId: userId,
        details: `Credits adjusted by ${amount}. New balance: ${user.credits}`,
        timestamp: new Date()
      }
    });
    */

    console.log(`Admin ${session.user?.name} adjusted credits for user ${userId} by ${amount}`);

    return NextResponse.json({ 
      success: true, 
      message: `Credits ${amount > 0 ? 'added' : 'removed'} successfully`,
      amount: amount
    });
  } catch (error) {
    console.error('Adjust credits error:', error);
    return NextResponse.json({ error: 'Failed to adjust credits' }, { status: 500 });
  }
}