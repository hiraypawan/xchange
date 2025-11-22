import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { cleanupDuplicateUsers } from '@/scripts/cleanup-duplicates';

// Check if user is admin
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id' ||
         session?.user?.email?.toLowerCase().includes('pawan') ||
         session?.user?.name?.toLowerCase().includes('pawan hiray');
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('🧹 Admin initiated duplicate cleanup:', session.user?.name);

    // Run the cleanup
    const result = await cleanupDuplicateUsers();

    // Log admin action
    console.log('✅ Admin cleanup completed:', {
      adminUser: session.user?.name,
      result,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Duplicate users cleaned up successfully',
      result: {
        originalCount: result.originalCount,
        duplicatesFound: result.duplicatesFound,
        duplicatesRemoved: result.duplicatesRemoved,
        finalCount: result.finalCount,
        creditsMerged: true
      }
    });

  } catch (error) {
    console.error('❌ Admin cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to cleanup duplicates',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to check for duplicates without removing them
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connectToDatabase } = await import('@/lib/mongodb');
    const { db } = await connectToDatabase();

    // Check for duplicates without removing
    const pipeline = [
      {
        $group: {
          _id: {
            $cond: [
              { $ne: ["$email", null] },
              "$email",
              "$twitterId"
            ]
          },
          count: { $sum: 1 },
          users: { $push: { id: "$_id", name: "$displayName", credits: "$credits", createdAt: "$createdAt" } }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ];

    const duplicates = await db.collection('users').aggregate(pipeline).toArray();
    
    const totalDuplicates = duplicates.reduce((sum, group) => sum + (group.count - 1), 0);
    const totalUsers = await db.collection('users').countDocuments();

    return NextResponse.json({
      success: true,
      analysis: {
        totalUsers,
        duplicateGroups: duplicates.length,
        totalDuplicates,
        duplicateDetails: duplicates.slice(0, 10) // Show first 10 groups
      }
    });

  } catch (error) {
    console.error('Duplicate analysis failed:', error);
    return NextResponse.json({ error: 'Failed to analyze duplicates' }, { status: 500 });
  }
}