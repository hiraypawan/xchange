#!/usr/bin/env tsx
/**
 * Manual cleanup script to fix duplicate users in database
 * Run with: npx tsx src/scripts/manual-cleanup.ts
 */

import { UserManager } from '../lib/user-management';
import { connectToDatabase } from '../lib/mongodb';

async function main() {
  console.log('🚀 Starting manual duplicate cleanup...');
  
  try {
    // Connect to database first
    console.log('📊 Connecting to database...');
    const { db } = await connectToDatabase();
    
    // Check current state
    console.log('📊 Analyzing current database state...');
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📈 Total users before cleanup: ${totalUsers}`);
    
    // Find potential duplicates
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
    
    console.log(`🔍 Found ${duplicateAnalysis.length} duplicate groups affecting ${duplicateAnalysis.reduce((sum, group) => sum + (group.count - 1), 0)} duplicate users`);
    
    // Show preview of duplicates
    if (duplicateAnalysis.length > 0) {
      console.log('\n📋 Preview of duplicate groups (first 5):');
      duplicateAnalysis.slice(0, 5).forEach((group, index) => {
        console.log(`\n${index + 1}. Group "${group._id}" (${group.count} users):`);
        group.users.forEach((user: any, userIndex: number) => {
          console.log(`   ${userIndex + 1}. ID: ${user.id}, Twitter: ${user.twitterId}, Name: ${user.displayName}, Credits: ${user.credits}`);
        });
      });
    }
    
    // Run the cleanup
    console.log('\n🧹 Running comprehensive cleanup...');
    const result = await UserManager.cleanupDuplicates();
    
    // Show results
    console.log('\n✅ Cleanup completed successfully!');
    console.log(`📊 Results:`);
    console.log(`   • Original count: ${result.originalCount} users`);
    console.log(`   • Duplicates found: ${result.duplicatesFound} users`);
    console.log(`   • Duplicates removed: ${result.duplicatesRemoved} users`);
    console.log(`   • Final count: ${result.finalCount} users`);
    console.log(`   • Users saved: ${result.originalCount - result.finalCount}`);
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup results...');
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
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ Verification passed: No remaining duplicates found!');
    } else {
      console.log(`⚠️ Warning: ${remainingDuplicates.length} duplicate groups still remain`);
      remainingDuplicates.forEach((group, index) => {
        console.log(`   ${index + 1}. Twitter ID "${group._id}": ${group.count} users`);
      });
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
  
  console.log('\n🎉 Manual cleanup completed successfully!');
  process.exit(0);
}

// Run the script
main().catch(console.error);