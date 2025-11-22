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

    // Get real users from MongoDB database
    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();

    console.log('👥 Getting real users from database...');

    // Get all users with their credit transactions
    const usersWithTransactions = await db.collection('users').aggregate([
      {
        $lookup: {
          from: 'credit_transactions',
          localField: '_id',
          foreignField: 'userId',
          as: 'transactions'
        }
      },
      {
        $addFields: {
          totalEarned: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$transactions',
                    cond: { $gt: ['$$this.amount', 0] }
                  }
                },
                as: 'transaction',
                in: '$$transaction.amount'
              }
            }
          },
          totalSpent: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$transactions',
                    cond: { $lt: ['$$this.amount', 0] }
                  }
                },
                as: 'transaction',
                in: { $abs: '$$transaction.amount' }
              }
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    // Format users for admin interface
    const users = usersWithTransactions.map(user => ({
      id: user._id.toString(),
      name: user.displayName || user.username || 'Unknown User',
      email: user.email || 'No email',
      image: user.avatar || user.profileImage || null,
      credits: user.credits || 0,
      createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
      isBanned: user.isBanned || false,
      totalEarned: user.totalEarned || 0,
      totalSpent: user.totalSpent || 0,
      engagementCount: user.engagementCount || 0 // You can add this field later
    }));

    console.log(`✅ Loaded ${users.length} real users from database`);

    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}