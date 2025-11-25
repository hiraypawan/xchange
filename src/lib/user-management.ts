// Centralized user management to prevent duplicates
import { connectToDatabase } from './mongodb';
import { User } from '@/types';
import { ObjectId } from 'mongodb';

interface CreateUserData {
  twitterId: string;
  username?: string;
  displayName?: string;
  email?: string;
  profileImage?: string;
}

export class UserManager {
  /**
   * Find existing user using comprehensive duplicate detection
   */
  static async findExistingUser(userData: CreateUserData): Promise<any | null> {
    const { db } = await connectToDatabase();

    // COMPREHENSIVE duplicate checking - check ALL possible ways to identify same user
    const query = {
      $or: [
        // Primary: Twitter ID (most reliable)
        { twitterId: userData.twitterId },
        
        // Secondary: Email (if provided and not empty)
        ...(userData.email && userData.email.trim() !== '' ? [{
          $and: [
            { email: userData.email },
            { email: { $ne: null } },
            { email: { $ne: '' } },
            { email: { $ne: 'No email' } }
          ]
        }] : []),
        
        // Tertiary: Username + Display Name combination (for users without email)
        ...(userData.username && userData.displayName ? [{
          $and: [
            { username: userData.username },
            { displayName: userData.displayName },
            { username: { $ne: null } },
            { displayName: { $ne: null } }
          ]
        }] : []),
        
        // Quaternary: Display name only (for cases like "W3B GEN" duplicates)
        ...(userData.displayName && userData.displayName !== 'Unknown User' ? [{
          $and: [
            { displayName: userData.displayName },
            { displayName: { $ne: null } },
            { displayName: { $ne: '' } }
          ]
        }] : [])
      ]
    };

    console.log('🔍 Comprehensive user search with query:', JSON.stringify(query, null, 2));

    const existingUser = await db.collection('users').findOne(query);
    
    if (existingUser) {
      console.log('✅ Existing user found:', {
        id: existingUser._id,
        twitterId: existingUser.twitterId,
        username: existingUser.username,
        displayName: existingUser.displayName,
        email: existingUser.email
      });
    }
    
    return existingUser;
  }

  /**
   * Create or update user with atomic operation to prevent duplicates
   */
  static async ensureUser(userData: CreateUserData): Promise<{ user: any; isNew: boolean }> {
    const { db } = await connectToDatabase();

    console.log('🔄 Starting ensureUser process for:', {
      twitterId: userData.twitterId,
      username: userData.username,
      displayName: userData.displayName,
      email: userData.email
    });

    // Try to find existing user first
    let existingUser = await this.findExistingUser(userData);
    
    if (existingUser) {
      // Update existing user with latest data
      console.log('📝 Updating existing user:', existingUser._id);
      
      const updateData = {
        twitterId: userData.twitterId, // Always update Twitter ID
        username: userData.username || existingUser.username,
        displayName: userData.displayName || existingUser.displayName,
        profileImage: userData.profileImage || existingUser.profileImage,
        email: userData.email || existingUser.email,
        lastLogin: new Date(),
        updatedAt: new Date()
      };

      const updateResult = await db.collection('users').updateOne(
        { _id: existingUser._id },
        { $set: updateData }
      );

      console.log('✅ User updated:', {
        matched: updateResult.matchedCount,
        modified: updateResult.modifiedCount
      });

      return { 
        user: { ...existingUser, ...updateData }, 
        isNew: false 
      };
    }

    // Create new user with upsert to handle race conditions
    const newUserData: Omit<User, '_id'> = {
      twitterId: userData.twitterId,
      username: userData.username || userData.displayName?.replace(/\s+/g, '_').toLowerCase() || 'unknown',
      displayName: userData.displayName || 'Unknown User',
      avatar: userData.profileImage,
      email: userData.email,
      credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
      totalEarned: 0,
      totalSpent: 0,
      joinedAt: new Date(),
      lastActive: new Date(),
      lastLogin: new Date(),
      isActive: true,
      settings: {
        autoEngage: false,
        maxEngagementsPerDay: 50,
        emailNotifications: true,
        pushNotifications: true,
        privacy: 'public',
      },
      stats: {
        totalEngagements: 0,
        successRate: 0,
        averageEarningsPerDay: 0,
        streakDays: 0,
        rank: 0,
      },
    };

    console.log('🆕 Creating new user with data:', {
      twitterId: newUserData.twitterId,
      username: newUserData.username,
      displayName: newUserData.displayName,
      email: newUserData.email
    });

    try {
      // Use upsert with unique constraint to prevent race condition duplicates
      const result = await db.collection('users').updateOne(
        { 
          $or: [
            { twitterId: userData.twitterId },
            ...(userData.email ? [{ email: userData.email }] : [])
          ]
        },
        { 
          $setOnInsert: newUserData,
          $set: {
            lastLogin: new Date(),
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      if (result.upsertedId) {
        console.log('✅ New user created successfully:', result.upsertedId);
        
        // Create welcome credit transaction
        try {
          await db.collection('credit_transactions').insertOne({
            userId: result.upsertedId.toString(),
            type: 'bonus',
            amount: parseInt(process.env.USER_STARTING_CREDITS || '100'),
            balance: parseInt(process.env.USER_STARTING_CREDITS || '100'),
            description: 'Welcome bonus - Account creation',
            createdAt: new Date(),
          });
          console.log('✅ Welcome credit transaction created');
        } catch (creditError) {
          console.error('⚠️ Failed to create welcome credit transaction:', creditError);
          // Don't fail user creation for credit transaction issues
        }

        return {
          user: { ...newUserData, _id: result.upsertedId },
          isNew: true
        };
      } else {
        // User was found during upsert, return the existing user
        console.log('🔄 User existed during creation attempt, fetching existing user');
        const existingUser = await this.findExistingUser(userData);
        if (!existingUser) {
          throw new Error('Failed to find user after upsert operation');
        }
        return { user: existingUser, isNew: false };
      }
    } catch (error) {
      console.error('❌ Error during user creation:', error);
      
      // If there was a duplicate key error, try to find the existing user
      if ((error as any)?.code === 11000) {
        console.log('🔍 Duplicate key error, searching for existing user...');
        const existingUser = await this.findExistingUser(userData);
        if (existingUser) {
          return { user: existingUser, isNew: false };
        }
      }
      
      throw error;
    }
  }

  /**
   * Clean up duplicate users (can be called manually)
   */
  static async cleanupDuplicates(): Promise<{
    originalCount: number;
    duplicatesFound: number;
    duplicatesRemoved: number;
    finalCount: number;
  }> {
    const { db } = await connectToDatabase();
    
    console.log('🧹 Starting comprehensive duplicate cleanup...');
    
    const originalCount = await db.collection('users').countDocuments();
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;

    // Find and merge duplicates by Twitter ID
    const twitterIdDuplicates = await db.collection('users').aggregate([
      {
        $match: {
          twitterId: { $exists: true, $ne: null }
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

    for (const group of twitterIdDuplicates) {
      console.log(`🔍 Found ${group.count} users with Twitter ID: ${group._id}`);
      duplicatesFound += group.count - 1;
      
      // Sort by creation date and credits to keep the best user
      const users = group.users.sort((a: any, b: any) => {
        // Prefer user with more credits
        if (a.credits !== b.credits) {
          return (b.credits || 0) - (a.credits || 0);
        }
        // Then prefer older account
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : a.joinedAt ? new Date(a.joinedAt).getTime() : Date.now();
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : b.joinedAt ? new Date(b.joinedAt).getTime() : Date.now();
        return aDate - bDate;
      });
      
      const keepUser = users[0];
      const removeUsers = users.slice(1);
      
      // Merge credits
      let totalCredits = keepUser.credits || 0;
      for (const user of removeUsers) {
        totalCredits += user.credits || 0;
      }
      
      // Update the kept user
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
      const deleteResult = await db.collection('users').deleteMany({
        _id: { $in: removeUsers.map((u: any) => u._id) }
      });
      
      duplicatesRemoved += deleteResult.deletedCount;
      console.log(`✅ Kept user ${keepUser._id}, removed ${deleteResult.deletedCount} duplicates`);
    }

    const finalCount = await db.collection('users').countDocuments();
    
    console.log('🧹 Cleanup completed:', {
      originalCount,
      duplicatesFound,
      duplicatesRemoved,
      finalCount
    });

    return {
      originalCount,
      duplicatesFound,
      duplicatesRemoved,
      finalCount
    };
  }
}