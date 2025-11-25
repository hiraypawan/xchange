import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

// Emergency cleanup endpoint that doesn't require authentication
// This is to fix the sign-in issue caused by database constraints
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { adminPassword, action } = body;
    
    // Admin password check
    if (adminPassword !== 'Fæ7猫!RΦ9e@Z') {
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid admin password' 
      }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    if (action === 'drop_indexes') {
      // Drop problematic unique indexes temporarily
      console.log('🗑️ Emergency: Dropping unique indexes...');
      
      try {
        await db.collection('users').dropIndex('unique_twitterId');
        console.log('✅ Dropped unique_twitterId index');
      } catch (error) {
        console.log('⚠️ unique_twitterId index not found or already dropped');
      }
      
      try {
        await db.collection('users').dropIndex('unique_email');
        console.log('✅ Dropped unique_email index');
      } catch (error) {
        console.log('⚠️ unique_email index not found or already dropped');
      }
      
      try {
        await db.collection('users').dropIndex('unique_username');
        console.log('✅ Dropped unique_username index');
      } catch (error) {
        console.log('⚠️ unique_username index not found or already dropped');
      }
      
      try {
        await db.collection('users').dropIndex('unique_displayName_username');
        console.log('✅ Dropped unique_displayName_username index');
      } catch (error) {
        console.log('⚠️ unique_displayName_username index not found or already dropped');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Unique indexes dropped. You should now be able to sign in.',
        action: 'After signing in, run cleanup_duplicates then recreate_indexes'
      });
    }
    
    if (action === 'cleanup_duplicates') {
      console.log('🧹 Emergency: Cleaning up duplicate users...');
      
      // Find duplicates by twitterId
      const duplicates = await db.collection('users').aggregate([
        {
          $match: {
            twitterId: { $exists: true, $ne: null, $ne: '' }
          }
        },
        {
          $group: {
            _id: "$twitterId",
            count: { $sum: 1 },
            users: { $push: "$$ROOT" }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]).toArray();
      
      let duplicatesRemoved = 0;
      
      for (const group of duplicates) {
        const users = group.users.sort((a: any, b: any) => {
          // Keep user with most credits
          if (a.credits !== b.credits) {
            return (b.credits || 0) - (a.credits || 0);
          }
          // Then keep oldest
          const aDate = a.joinedAt ? new Date(a.joinedAt).getTime() : Date.now();
          const bDate = b.joinedAt ? new Date(b.joinedAt).getTime() : Date.now();
          return aDate - bDate;
        });
        
        const keepUser = users[0];
        const removeUsers = users.slice(1);
        
        // Merge credits
        let totalCredits = keepUser.credits || 0;
        for (const user of removeUsers) {
          totalCredits += user.credits || 0;
        }
        
        // Update kept user
        await db.collection('users').updateOne(
          { _id: keepUser._id },
          { $set: { credits: totalCredits } }
        );
        
        // Remove duplicates
        const deleteResult = await db.collection('users').deleteMany({
          _id: { $in: removeUsers.map((u: any) => u._id) }
        });
        
        duplicatesRemoved += deleteResult.deletedCount;
        console.log(`✅ Kept ${keepUser.displayName}, removed ${deleteResult.deletedCount} duplicates`);
      }
      
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${duplicatesRemoved} duplicate users`,
        duplicateGroups: duplicates.length,
        duplicatesRemoved
      });
    }
    
    if (action === 'recreate_indexes') {
      console.log('📝 Emergency: Recreating unique indexes...');
      
      const results = [];
      
      try {
        await db.collection('users').createIndex(
          { twitterId: 1 }, 
          { unique: true, sparse: true, name: 'unique_twitterId' }
        );
        results.push('unique_twitterId created');
      } catch (error) {
        results.push('unique_twitterId failed: ' + (error as Error).message);
      }
      
      try {
        await db.collection('users').createIndex(
          { email: 1 }, 
          { unique: true, sparse: true, name: 'unique_email' }
        );
        results.push('unique_email created');
      } catch (error) {
        results.push('unique_email failed: ' + (error as Error).message);
      }
      
      try {
        await db.collection('users').createIndex(
          { username: 1 }, 
          { unique: true, sparse: true, name: 'unique_username' }
        );
        results.push('unique_username created');
      } catch (error) {
        results.push('unique_username failed: ' + (error as Error).message);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Indexes recreated',
        results
      });
    }
    
    // Default: show available actions
    return NextResponse.json({
      success: true,
      availableActions: [
        'drop_indexes - Drop unique indexes to allow sign-in',
        'cleanup_duplicates - Remove duplicate users',
        'recreate_indexes - Recreate unique indexes after cleanup'
      ],
      instructions: [
        '1. POST { "adminPassword": "Fæ7猫!RΦ9e@Z", "action": "drop_indexes" }',
        '2. Sign in to your app normally',
        '3. POST { "adminPassword": "Fæ7猫!RΦ9e@Z", "action": "cleanup_duplicates" }', 
        '4. POST { "adminPassword": "Fæ7猫!RΦ9e@Z", "action": "recreate_indexes" }'
      ]
    });

  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Emergency cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}