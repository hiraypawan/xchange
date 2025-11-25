#!/usr/bin/env tsx
/**
 * Reset database indexes to prevent future duplicates
 * Run with: npx tsx src/scripts/reset-db-indexes.ts
 */

import { connectToDatabase } from '../lib/mongodb';

async function resetIndexes() {
  console.log('🔧 Resetting database indexes for duplicate prevention...');
  
  try {
    const { db } = await connectToDatabase();
    
    // Drop existing indexes (except _id)
    console.log('🗑️ Dropping existing user collection indexes...');
    try {
      await db.collection('users').dropIndexes();
      console.log('✅ Existing indexes dropped');
    } catch (error) {
      console.log('⚠️ No indexes to drop or drop failed (this is usually OK)');
    }
    
    // Create new indexes with proper unique constraints
    console.log('📝 Creating new indexes with duplicate prevention...');
    
    // Primary unique constraints
    await db.collection('users').createIndex(
      { twitterId: 1 }, 
      { unique: true, sparse: true, name: 'unique_twitterId' }
    );
    console.log('✅ Created unique twitterId index');
    
    await db.collection('users').createIndex(
      { email: 1 }, 
      { unique: true, sparse: true, name: 'unique_email' }
    );
    console.log('✅ Created unique email index');
    
    await db.collection('users').createIndex(
      { username: 1 }, 
      { unique: true, sparse: true, name: 'unique_username' }
    );
    console.log('✅ Created unique username index');
    
    // Compound unique constraint to prevent name duplicates
    await db.collection('users').createIndex(
      { displayName: 1, username: 1 }, 
      { unique: true, sparse: true, name: 'unique_displayName_username' }
    );
    console.log('✅ Created unique displayName+username compound index');
    
    // Performance indexes
    await db.collection('users').createIndex(
      { lastActive: -1 }, 
      { name: 'lastActive_desc' }
    );
    console.log('✅ Created lastActive performance index');
    
    await db.collection('users').createIndex(
      { credits: -1 }, 
      { name: 'credits_desc' }
    );
    console.log('✅ Created credits performance index');
    
    await db.collection('users').createIndex(
      { joinedAt: -1 }, 
      { name: 'joinedAt_desc' }
    );
    console.log('✅ Created joinedAt performance index');
    
    // List all indexes to verify
    console.log('\n📋 Current indexes:');
    const indexes = await db.collection('users').listIndexes().toArray();
    indexes.forEach((index, i) => {
      console.log(`   ${i + 1}. ${index.name}: ${JSON.stringify(index.key)} ${index.unique ? '(UNIQUE)' : ''}`);
    });
    
    console.log('\n✅ Database indexes reset successfully!');
    console.log('🔒 Future duplicate users will now be prevented at the database level.');
    
  } catch (error) {
    console.error('❌ Index reset failed:', error);
    console.error('💡 You may need to clean up existing duplicates first');
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
resetIndexes().catch(console.error);