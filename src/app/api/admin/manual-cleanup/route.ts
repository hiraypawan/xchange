import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { UserManager } from '@/lib/user-management';
import { connectToDatabase } from '@/lib/mongodb';

// Check if user is admin
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id' ||
         session?.user?.email?.toLowerCase().includes('pawan') ||
         session?.user?.name?.toLowerCase().includes('pawan hiray');
}

// POST /api/admin/manual-cleanup - Run comprehensive cleanup via API
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('🧹 Admin initiated manual cleanup via API:', session.user?.name);

    // Get database connection
    const { db } = await connectToDatabase();
    
    // Analyze current state
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📈 Total users before cleanup: ${totalUsers}`);
    
    // Find potential duplicates for analysis
    const duplicateAnalysis = await db.collection('users').aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ["$twitterId", null] }, { $ne: ["$twitterId", ""] }] },
              "$twitterId",
              {
                $cond: [
                  { $and: [{ $ne: ["$email", null] }, { $ne: ["$email", ""] }, { $ne: ["$email", "No email"] }] },
                  "$email",
                  { $concat: ["$displayName", "_", "$username"] }
                ]
              }
            ]
          },
          count: { $sum: 1 },
          users: { 
            $push: { 
              id: "$_id", 
              twitterId: "$twitterId",
              email: "$email",
              displayName: "$displayName", 
              username: "$username",
              credits: "$credits", 
              createdAt: "$createdAt",
              joinedAt: "$joinedAt"
            } 
          }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    const duplicateUsers = duplicateAnalysis.reduce((sum, group) => sum + (group.count - 1), 0);
    console.log(`🔍 Found ${duplicateAnalysis.length} duplicate groups affecting ${duplicateUsers} duplicate users`);
    
    // Run the cleanup using UserManager
    console.log('🧹 Running comprehensive cleanup...');
    const result = await UserManager.cleanupDuplicates();
    
    // Verify cleanup
    const remainingDuplicates = await db.collection('users').aggregate([
      {
        $group: {
          _id: "$twitterId",
          count: { $sum: 1 }
        }
      },
      {
        $match: {
          count: { $gt: 1 },
          _id: { $ne: null }
        }
      }
    ]).toArray();

    // Log admin action
    console.log('✅ Manual cleanup completed:', {
      adminUser: session.user?.name,
      result,
      remainingDuplicates: remainingDuplicates.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Manual cleanup completed successfully',
      analysis: {
        beforeCleanup: {
          totalUsers,
          duplicateGroups: duplicateAnalysis.length,
          duplicateUsers
        },
        cleanup: {
          originalCount: result.originalCount,
          duplicatesFound: result.duplicatesFound,
          duplicatesRemoved: result.duplicatesRemoved,
          finalCount: result.finalCount
        },
        verification: {
          remainingDuplicateGroups: remainingDuplicates.length,
          cleanupSuccessful: remainingDuplicates.length === 0
        }
      }
    });

  } catch (error) {
    console.error('❌ Manual cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to run manual cleanup',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/manual-cleanup - Preview what would be cleaned up
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Analyze duplicates without cleaning
    const totalUsers = await db.collection('users').countDocuments();
    
    const duplicateAnalysis = await db.collection('users').aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $and: [{ $ne: ["$twitterId", null] }, { $ne: ["$twitterId", ""] }] },
              "$twitterId",
              {
                $cond: [
                  { $and: [{ $ne: ["$email", null] }, { $ne: ["$email", ""] }, { $ne: ["$email", "No email"] }] },
                  "$email",
                  { $concat: ["$displayName", "_", "$username"] }
                ]
              }
            ]
          },
          count: { $sum: 1 },
          users: { 
            $push: { 
              id: "$_id", 
              twitterId: "$twitterId",
              email: "$email",
              displayName: "$displayName", 
              username: "$username",
              credits: "$credits"
            } 
          }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]).toArray();
    
    const duplicateUsers = duplicateAnalysis.reduce((sum, group) => sum + (group.count - 1), 0);

    return NextResponse.json({
      success: true,
      preview: {
        totalUsers,
        duplicateGroups: duplicateAnalysis.length,
        duplicateUsers,
        wouldRemove: duplicateUsers,
        wouldKeep: totalUsers - duplicateUsers,
        duplicateDetails: duplicateAnalysis.slice(0, 10) // Show first 10 groups
      }
    });

  } catch (error) {
    console.error('Cleanup preview failed:', error);
    return NextResponse.json({ error: 'Failed to preview cleanup' }, { status: 500 });
  }
}