// Database cleanup script to remove duplicate users
// Run this script to clean up existing duplicates before deploying the fix

import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface User {
  _id: ObjectId;
  twitterId?: string;
  email?: string;
  username?: string;
  displayName?: string;
  credits: number;
  createdAt: Date;
  lastLogin?: Date;
}

async function cleanupDuplicateUsers() {
  try {
    console.log('🧹 Starting duplicate user cleanup...');
    const { db } = await connectToDatabase();
    
    // Find all users
    const allUsers = await db.collection('users').find({}).toArray() as User[];
    console.log(`📊 Found ${allUsers.length} total users`);
    
    // Group users by email, twitterId, AND displayName/username
    const emailGroups = new Map<string, User[]>();
    const twitterIdGroups = new Map<string, User[]>();
    const nameGroups = new Map<string, User[]>();
    
    for (const user of allUsers) {
      // Group by email
      if (user.email && user.email !== 'No email') {
        if (!emailGroups.has(user.email)) {
          emailGroups.set(user.email, []);
        }
        emailGroups.get(user.email)!.push(user);
      }
      
      // Group by twitterId
      if (user.twitterId) {
        if (!twitterIdGroups.has(user.twitterId)) {
          twitterIdGroups.set(user.twitterId, []);
        }
        twitterIdGroups.get(user.twitterId)!.push(user);
      }
      
      // Group by name (for users with same display name like "W3B GEN")
      if (user.displayName || user.username) {
        const name = user.displayName || user.username;
        if (!nameGroups.has(name)) {
          nameGroups.set(name, []);
        }
        nameGroups.get(name)!.push(user);
      }
    }
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    
    // Process email duplicates
    for (const [email, users] of Array.from(emailGroups.entries())) {
      if (users.length > 1) {
        console.log(`🔍 Found ${users.length} users with email: ${email}`);
        duplicatesFound += users.length - 1;
        
        // Sort by creation date (keep oldest) or last login (keep most recent active)
        users.sort((a, b) => {
          // Prefer user with most recent login
          if (a.lastLogin && b.lastLogin) {
            return b.lastLogin.getTime() - a.lastLogin.getTime();
          }
          // If only one has login, prefer that one
          if (a.lastLogin && !b.lastLogin) return -1;
          if (!a.lastLogin && b.lastLogin) return 1;
          // Otherwise prefer older account (first created)
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
        
        const keepUser = users[0];
        const duplicateUsers = users.slice(1);
        
        // Merge credits from duplicates into the main user
        let totalCredits = keepUser.credits || 0;
        for (const duplicate of duplicateUsers) {
          totalCredits += duplicate.credits || 0;
        }
        
        // Update the main user with merged credits
        await db.collection('users').updateOne(
          { _id: keepUser._id },
          {
            $set: {
              credits: totalCredits,
              updatedAt: new Date()
            }
          }
        );
        
        // Remove duplicate users
        const duplicateIds = duplicateUsers.map(u => u._id);
        const deleteResult = await db.collection('users').deleteMany({
          _id: { $in: duplicateIds }
        });
        
        duplicatesRemoved += deleteResult.deletedCount;
        
        console.log(`✅ Kept user ${keepUser._id} (${keepUser.displayName}) with ${totalCredits} credits`);
        console.log(`❌ Removed ${deleteResult.deletedCount} duplicate accounts`);
      }
    }
    
    // Process name duplicates (like "W3B GEN" appearing multiple times)
    for (const [name, users] of Array.from(nameGroups.entries())) {
      if (users.length > 1 && name !== 'Unknown User') {
        console.log(`🔍 Found ${users.length} users with name: ${name}`);
        duplicatesFound += users.length - 1;
        
        // Check if these users have different emails/twitterIds (real duplicates)
        const uniqueEmails = new Set(users.map(u => u.email).filter(e => e));
        const uniqueTwitterIds = new Set(users.map(u => u.twitterId).filter(t => t));
        
        // Only process if they seem like real duplicates (same name, no unique identifiers)
        if (uniqueEmails.size <= 1 && uniqueTwitterIds.size <= 1) {
          // Sort by creation date (keep oldest) or credits (keep highest)
          users.sort((a, b) => {
            // Prefer user with most credits
            if (a.credits !== b.credits) {
              return (b.credits || 0) - (a.credits || 0);
            }
            // Then by creation date (oldest first)
            return a.createdAt.getTime() - b.createdAt.getTime();
          });
          
          const keepUser = users[0];
          const duplicateUsers = users.slice(1);
          
          // Merge credits from duplicates into the main user
          let totalCredits = keepUser.credits || 0;
          for (const duplicate of duplicateUsers) {
            totalCredits += duplicate.credits || 0;
          }
          
          // Update the main user with merged credits
          await db.collection('users').updateOne(
            { _id: keepUser._id },
            {
              $set: {
                credits: totalCredits,
                updatedAt: new Date()
              }
            }
          );
          
          // Remove duplicate users
          const duplicateIds = duplicateUsers.map(u => u._id);
          const deleteResult = await db.collection('users').deleteMany({
            _id: { $in: duplicateIds }
          });
          
          duplicatesRemoved += deleteResult.deletedCount;
          
          console.log(`✅ Kept user ${keepUser._id} (${name}) with ${totalCredits} credits`);
          console.log(`❌ Removed ${deleteResult.deletedCount} name duplicates`);
        } else {
          console.log(`⚠️ Users with name "${name}" have different emails/twitterIds - not duplicates`);
        }
      }
    }
    
    // Process Twitter ID duplicates (if any remain)
    for (const [twitterId, users] of Array.from(twitterIdGroups.entries())) {
      if (users.length > 1) {
        console.log(`🔍 Found ${users.length} users with Twitter ID: ${twitterId}`);
        
        // Check if these are different from email duplicates
        const userIds = users.map(u => u._id.toString());
        const stillExists = await db.collection('users').find({
          _id: { $in: users.map(u => u._id) }
        }).toArray();
        
        if (stillExists.length > 1) {
          duplicatesFound += stillExists.length - 1;
          
          // Same logic as email duplicates
          stillExists.sort((a, b) => {
            if (a.lastLogin && b.lastLogin) {
              return b.lastLogin.getTime() - a.lastLogin.getTime();
            }
            if (a.lastLogin && !b.lastLogin) return -1;
            if (!a.lastLogin && b.lastLogin) return 1;
            return a.createdAt.getTime() - b.createdAt.getTime();
          });
          
          const keepUser = stillExists[0];
          const duplicateUsers = stillExists.slice(1);
          
          // Merge credits
          let totalCredits = keepUser.credits || 0;
          for (const duplicate of duplicateUsers) {
            totalCredits += duplicate.credits || 0;
          }
          
          await db.collection('users').updateOne(
            { _id: keepUser._id },
            {
              $set: {
                credits: totalCredits,
                updatedAt: new Date()
              }
            }
          );
          
          // Remove duplicates
          const duplicateIds = duplicateUsers.map(u => u._id);
          const deleteResult = await db.collection('users').deleteMany({
            _id: { $in: duplicateIds }
          });
          
          duplicatesRemoved += deleteResult.deletedCount;
          
          console.log(`✅ Kept user ${keepUser._id} with ${totalCredits} credits (Twitter ID cleanup)`);
          console.log(`❌ Removed ${deleteResult.deletedCount} more duplicates`);
        }
      }
    }
    
    // Final summary
    const finalUserCount = await db.collection('users').countDocuments();
    
    console.log('\n📊 Cleanup Summary:');
    console.log(`   Original users: ${allUsers.length}`);
    console.log(`   Duplicates found: ${duplicatesFound}`);
    console.log(`   Duplicates removed: ${duplicatesRemoved}`);
    console.log(`   Final user count: ${finalUserCount}`);
    console.log('✅ Duplicate cleanup completed!');
    
    return {
      originalCount: allUsers.length,
      duplicatesFound,
      duplicatesRemoved,
      finalCount: finalUserCount
    };
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  }
}

// Export for use as API route or direct execution
export { cleanupDuplicateUsers };

// If running directly
if (require.main === module) {
  cleanupDuplicateUsers()
    .then((result) => {
      console.log('\n🎉 Cleanup completed successfully:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Cleanup failed:', error);
      process.exit(1);
    });
}