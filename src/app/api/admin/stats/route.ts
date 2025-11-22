import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Check if user is admin (you can modify this to match your account)
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock data for now - replace with actual database queries
    const stats = {
      totalUsers: 150,
      activeUsers: 89,
      totalCredits: 2450,
      totalEngagements: 1234,
      todaySignups: 5
    };

    // TODO: Replace with actual database queries
    /*
    const stats = {
      totalUsers: await prisma.user.count(),
      activeUsers: await prisma.user.count({
        where: {
          lastActive: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      }),
      totalCredits: await prisma.user.aggregate({
        _sum: {
          credits: true
        }
      }).then(result => result._sum.credits || 0),
      totalEngagements: await prisma.engagement.count(),
      todaySignups: await prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    };
    */

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}