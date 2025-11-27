import { NextAuthOptions, Profile } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { connectToDatabase } from './mongodb';
import { ObjectId } from 'mongodb';

// Define Twitter profile interface
interface TwitterProfile extends Profile {
  id: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
}

// Simple, reliable user creation function
async function createOrUpdateUser(twitterProfile: TwitterProfile, userInfo: any) {
  try {
    console.log('🔧 CREATING/UPDATING USER:', {
      twitterId: twitterProfile.id,
      name: twitterProfile.name,
      username: twitterProfile.username
    });

    const { db } = await connectToDatabase();
    
    // Check if user exists
    const existingUser = await db.collection('users').findOne({
      twitterId: twitterProfile.id
    });

    if (existingUser) {
      console.log('👤 EXISTING USER FOUND:', existingUser._id);
      
      // Update last active and ensure 2 credits
      const updateData: any = {
        lastActive: new Date(),
        displayName: twitterProfile.name || existingUser.displayName,
        avatar: twitterProfile.profile_image_url || existingUser.avatar
      };

      // Ensure user has at least 2 credits
      if ((existingUser.credits || 0) < 2) {
        updateData.credits = 2;
        console.log('🔄 UPDATING CREDITS TO 2 for existing user');
        
        // Create credit transaction
        await db.collection('credit_transactions').insertOne({
          userId: existingUser._id.toString(),
          type: 'credit_adjustment',
          amount: 2 - (existingUser.credits || 0),
          balance: 2,
          description: 'Ensuring minimum 2 credits',
          createdAt: new Date(),
          metadata: { reason: 'login_credit_check' }
        });
      }

      await db.collection('users').updateOne(
        { _id: existingUser._id },
        { $set: updateData }
      );

      const updatedUser = await db.collection('users').findOne({ _id: existingUser._id });
      console.log('✅ USER UPDATED:', {
        id: updatedUser?._id,
        credits: updatedUser?.credits
      });
      
      return updatedUser;
    } else {
      // Create new user
      console.log('🆕 CREATING NEW USER...');
      
      const newUser = {
        twitterId: twitterProfile.id,
        username: twitterProfile.username || twitterProfile.name?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`,
        displayName: twitterProfile.name || userInfo.name || 'User',
        email: userInfo.email || null,
        avatar: twitterProfile.profile_image_url || userInfo.image,
        credits: 2, // START WITH 2 CREDITS
        totalEarned: 2,
        totalSpent: 0,
        joinedAt: new Date(),
        lastActive: new Date(),
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
        createdVia: 'twitter_auth'
      };

      const insertResult = await db.collection('users').insertOne(newUser);
      console.log('✅ NEW USER CREATED:', insertResult.insertedId);

      // Create starting credits transaction
      await db.collection('credit_transactions').insertOne({
        userId: insertResult.insertedId.toString(),
        type: 'starting_bonus',
        amount: 2,
        balance: 2,
        description: 'Welcome bonus - 2 starting credits',
        createdAt: new Date(),
        metadata: { 
          reason: 'new_user_signup',
          twitterId: twitterProfile.id 
        }
      });

      const createdUser = await db.collection('users').findOne({ _id: insertResult.insertedId });
      console.log('✅ USER VERIFICATION:', {
        id: createdUser?._id,
        twitterId: createdUser?.twitterId,
        credits: createdUser?.credits
      });

      return createdUser;
    }

  } catch (error) {
    console.error('❌ USER CREATION/UPDATE FAILED:', error);
    throw error;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    TwitterProvider({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        params: {
          scope: 'users.read tweet.read offline.access',
        },
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SIGN IN STARTED:', {
        provider: account?.provider,
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString()
      });

      if (account?.provider === 'twitter' && profile) {
        const twitterProfile = profile as TwitterProfile;
        
        try {
          // Create or update user in database
          const dbUser = await createOrUpdateUser(twitterProfile, user);
          
          if (dbUser) {
            // Set user data for JWT
            user.id = dbUser._id.toString();
            user.name = dbUser.displayName;
            user.email = dbUser.email || user.email;
            user.image = dbUser.avatar || user.image;
            
            // Store additional data
            (user as any).twitterId = dbUser.twitterId;
            (user as any).username = dbUser.username;
            (user as any).credits = dbUser.credits;
            
            console.log('✅ SIGN IN SUCCESSFUL:', {
              userId: user.id,
              twitterId: dbUser.twitterId,
              credits: dbUser.credits
            });
            
            return true;
          }
        } catch (error) {
          console.error('❌ SIGN IN ERROR:', error);
          // Allow sign in but with fallback data
          user.id = twitterProfile.id;
          (user as any).twitterId = twitterProfile.id;
          (user as any).username = twitterProfile.username;
          (user as any).credits = 0; // Will be fixed later
          
          console.log('⚠️ FALLBACK SIGN IN - Database user creation failed');
          return true; // Still allow sign in
        }
      }
      
      return true;
    },

    async jwt({ token, user, account, profile }) {
      try {
        // On sign in
        if (account && profile) {
          const { db } = await connectToDatabase();
          
          // Get user from database using Twitter ID
          const dbUser = await db.collection('users').findOne({
            twitterId: account.providerAccountId
          });

          if (dbUser) {
            token.id = dbUser._id.toString();
            token.dbId = dbUser._id.toString(); // Store MongoDB _id
            token.twitterId = dbUser.twitterId;
            token.username = dbUser.username;
            token.credits = dbUser.credits;
            token.displayName = dbUser.displayName;
          }
        }
        return token;
      } catch (error) {
        console.error('🔴 Error in jwt callback:', error);
        return token;
      }
    },

    async session({ session, token }) {
      try {
        if (token) {
          // Get fresh user data from database
          const { db } = await connectToDatabase();
          const freshUser = await db.collection('users').findOne({
            _id: new ObjectId(token.dbId as string)
          });

          if (freshUser) {
            session.user.id = freshUser._id.toString();
            session.user.twitterId = freshUser.twitterId;
            session.user.username = freshUser.username;
            session.user.credits = freshUser.credits;
            session.user.name = freshUser.displayName;
            session.user.image = freshUser.avatar;
          } else {
            console.error('🔴 User not found in database:', token.dbId);
          }
        }
        
        console.log('📋 SESSION CREATED:', {
          userId: session.user.id,
          twitterId: session.user.twitterId,
          credits: session.user.credits
        });
      
      return session;
      } catch (error) {
        console.error('🔴 Error in session callback:', error);
        return session;
      }
    },
  },
  events: {
    async signOut({ token }) {
      console.log('👋 USER SIGNED OUT:', token?.id);
    },
  },
};

// Helper function to update user credits - for backward compatibility
export async function updateUserCredits(
  userId: string, 
  amount: number, 
  type: string,
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    
    // Get current user
    const objectId = new ObjectId(userId);
    const user = await db.collection('users').findOne({ _id: objectId });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const newBalance = user.credits + amount;
    
    if (newBalance < 0) {
      throw new Error('Insufficient credits');
    }
    
    // Update user credits
    await db.collection('users').updateOne(
      { _id: objectId },
      { 
        $set: { credits: newBalance, lastActive: new Date() },
        $inc: amount > 0 ? { totalEarned: amount } : { totalSpent: Math.abs(amount) }
      }
    );
    
    // Create transaction record
    await db.collection('credit_transactions').insertOne({
      userId: objectId.toString(),
      type,
      amount,
      balance: newBalance,
      description,
      metadata,
      createdAt: new Date(),
    });
    
    return true;
  } catch (error) {
    console.error('Update user credits error:', error);
    return false;
  }
}