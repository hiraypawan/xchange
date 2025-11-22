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
    const users = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        credits: 25,
        createdAt: '2024-01-15T10:30:00Z',
        isBanned: false,
        totalEarned: 125,
        totalSpent: 100,
        engagementCount: 45
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=100&h=100&fit=crop&crop=face',
        credits: 50,
        createdAt: '2024-01-20T14:22:00Z',
        isBanned: false,
        totalEarned: 200,
        totalSpent: 150,
        engagementCount: 78
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
        credits: 10,
        createdAt: '2024-02-01T09:15:00Z',
        isBanned: true,
        totalEarned: 75,
        totalSpent: 65,
        engagementCount: 23
      },
      {
        id: '4',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        credits: 75,
        createdAt: '2024-02-10T16:45:00Z',
        isBanned: false,
        totalEarned: 300,
        totalSpent: 225,
        engagementCount: 112
      }
    ];

    // TODO: Replace with actual database query
    /*
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        credits: true,
        createdAt: true,
        isBanned: true,
        _count: {
          select: {
            engagements: true
          }
        },
        transactions: {
          select: {
            amount: true,
            type: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const usersWithStats = users.map(user => ({
      ...user,
      engagementCount: user._count.engagements,
      totalEarned: user.transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0),
      totalSpent: user.transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }));
    */

    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}