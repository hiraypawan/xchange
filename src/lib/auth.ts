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
          userId: existingUser._id, // FIX: Store as ObjectId
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
      
      // Generate unique username
      let username = twitterProfile.username || twitterProfile.name?.replace(/\s+/g, '_').toLowerCase() || `user_${Date.now()}`;
      
      // Ensure username is unique
      const existingUserWithUsername = await db.collection('users').findOne({ username });
      if (existingUserWithUsername) {
        username = `${username}_${Date.now()}`;
        console.log('🔄 Username conflict resolved, using:', username);
      }
      
      const newUser = {
        twitterId: twitterProfile.id, // This is the unique identifier
        username: username,
        displayName: twitterProfile.name || userInfo.name || 'User',
        email: userInfo.email || null,
        avatar: twitterProfile.profile_image_url || userInfo.image,
        credits: 100, // REQUIREMENT: Start with 100 credits
        totalEarned: 100,
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
        createdVia: 'twitter_auth',
        uniqueKey: `twitter_${twitterProfile.id}` // Additional unique identifier
      };

      const insertResult = await db.collection('users').insertOne(newUser);
      console.log('✅ NEW USER CREATED:', insertResult.insertedId);

      // Create starting credits transaction
      await db.collection('credit_transactions').insertOne({
        userId: insertResult.insertedId, // FIX: Store as ObjectId
        type: 'bonus',
        amount: 100,
        balance: 100,
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
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Let browser handle
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔐 SIGN IN STARTED:', {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId,
        userId: user.id,
        userName: user.name,
        profileId: (profile as any)?.id,
        timestamp: new Date().toISOString()
      });

      if (account?.provider === 'twitter' && profile && account.providerAccountId) {
        const twitterProfile = profile as TwitterProfile;
        
        // CRITICAL FIX: Ensure Twitter ID is properly captured
        if (!twitterProfile.id && account.providerAccountId) {
          twitterProfile.id = account.providerAccountId;
        }
        
        console.log('🔍 TWITTER PROFILE VALIDATION:', {
          profileId: twitterProfile.id,
          accountId: account.providerAccountId,
          username: twitterProfile.username,
          name: twitterProfile.name
        });
        
        // Validate we have the essential data
        if (!twitterProfile.id) {
          console.error('🚨 CRITICAL ERROR: No Twitter ID found in profile or account');
          return false; // Reject sign-in if we can't identify the user
        }
        
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
          console.error('🔴 SIGN IN ERROR:', error);
          console.error('🔴 Full error details:', {
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
          });
          
          // TEMPORARY FIX: Return true to allow sign-in for debugging
          // This prevents AccessDenied errors while we debug the database issue
          console.warn('⚠️ ALLOWING SIGN-IN DESPITE DATABASE ERROR FOR DEBUGGING PURPOSES');
          
          // Create a fallback user object for the JWT
          user.id = twitterProfile.id;
          (user as any).twitterId = twitterProfile.id;
          (user as any).username = twitterProfile.username || 'fallback_user';
          (user as any).credits = 0;

          return true; // Allow sign-in to proceed for debugging
        }
      }
      
      return true;
    },

    async jwt({ token, user, account, profile }) {
      try {
        console.log('🔐 JWT CALLBACK START - Token:', {
          tokenId: token.id,
          tokenTwitterId: token.twitterId,
          hasAccount: !!account,
          hasProfile: !!profile,
          accountProvider: account?.providerAccountId
        });

        // On sign in (new session)
        if (account && profile) {
          const { db } = await connectToDatabase();
          
          console.log('🔐 JWT CALLBACK - NEW SIGN IN for Twitter ID:', account.providerAccountId);
          
          // Get user from database using Twitter ID - THIS IS THE CRITICAL LOOKUP
          const dbUser = await db.collection('users').findOne({
            twitterId: account.providerAccountId
          });

          if (dbUser) {
            // CRITICAL: Set unique token data for this specific user
            token.id = dbUser._id.toString();
            token.dbId = dbUser._id.toString(); // Store MongoDB _id
            token.twitterId = dbUser.twitterId; // MUST be unique per user
            token.username = dbUser.username;
            token.credits = dbUser.credits || 2;
            token.displayName = dbUser.displayName;
            token.sessionId = `${dbUser.twitterId}_${Date.now()}`; // Unique session identifier
            
            console.log('✅ JWT TOKEN CREATED for SPECIFIC user:', {
              mongoId: token.id,
              twitterId: token.twitterId,
              credits: token.credits,
              sessionId: token.sessionId,
              username: token.username
            });
          } else {
            // User doesn't exist in database - create fallback
            console.log('⚠️ User not found in database during JWT callback for:', account.providerAccountId);
            token.twitterId = account.providerAccountId;
            token.id = account.providerAccountId; // Use twitterId as fallback
            token.credits = 2; // Default credits
            token.sessionId = `fallback_${account.providerAccountId}_${Date.now()}`;
            
            console.log('🔧 FALLBACK TOKEN created for:', token.twitterId);
          }
        } else {
          // Existing session - ensure we have critical data
          console.log('🔄 JWT CALLBACK - EXISTING SESSION for:', {
            tokenId: token.id,
            twitterId: token.twitterId,
            sessionId: token.sessionId
          });
        }
        
        // CRITICAL: Ensure every token has a unique identifier
        if (!token.twitterId && token.id && typeof token.id === 'string') {
          token.twitterId = token.id;
        }
        
        // Ensure session isolation
        if (!token.sessionId) {
          token.sessionId = `${token.twitterId || 'unknown'}_${Date.now()}`;
        }
        
        console.log('✅ JWT CALLBACK END - Final token:', {
          id: token.id,
          twitterId: token.twitterId,
          sessionId: token.sessionId,
          credits: token.credits
        });
        
        return token;
      } catch (error) {
        console.error('🔴 Error in jwt callback:', error);
        // Ensure token has minimum required data
        if (!token.twitterId && account?.providerAccountId) {
          token.twitterId = account.providerAccountId;
          token.id = account.providerAccountId;
          token.sessionId = `error_${account.providerAccountId}_${Date.now()}`;
        }
        return token;
      }
    },

    async session({ session, token }) {
      try {
        console.log('👤 SESSION CALLBACK START - Token data:', {
          tokenId: token?.id,
          tokenTwitterId: token?.twitterId,
          sessionId: token?.sessionId,
          tokenDbId: token?.dbId
        });

        if (token?.twitterId) {
          // Get fresh user data from database using twitterId (most reliable)
          const { db } = await connectToDatabase();
          
          console.log('🔍 SESSION LOOKUP - Searching for user with twitterId:', token.twitterId);
          
          const freshUser = await db.collection('users').findOne({
            twitterId: token.twitterId
          });

          if (freshUser) {
            // CRITICAL: Set session data from the SPECIFIC user found
            session.user.id = freshUser._id.toString();
            session.user.twitterId = freshUser.twitterId;
            session.user.username = freshUser.username;
            session.user.credits = freshUser.credits || 2;
            session.user.name = freshUser.displayName;
            session.user.image = freshUser.avatar;
            
            // Add session isolation identifier
            (session as any).sessionId = token.sessionId;
            (session as any).userFingerprint = `${freshUser.twitterId}_${freshUser._id.toString()}`;
            
            console.log('✅ SESSION CREATED for SPECIFIC user:', {
              mongoId: session.user.id,
              twitterId: session.user.twitterId,
              username: session.user.username,
              credits: session.user.credits,
              sessionId: token.sessionId,
              fingerprint: (session as any).userFingerprint
            });
          } else {
            console.error('🔴 CRITICAL: User not found with twitterId:', token.twitterId);
            
            // Try fallback with dbId if available
            if (token.dbId && typeof token.dbId === 'string' && ObjectId.isValid(token.dbId)) {
              console.log('🔄 FALLBACK: Trying dbId lookup:', token.dbId);
              
              const fallbackUser = await db.collection('users').findOne({
                _id: new ObjectId(token.dbId)
              });
              
              if (fallbackUser) {
                session.user.id = fallbackUser._id.toString();
                session.user.twitterId = fallbackUser.twitterId;
                session.user.username = fallbackUser.username;
                session.user.credits = fallbackUser.credits || 2;
                session.user.name = fallbackUser.displayName;
                session.user.image = fallbackUser.avatar;
                
                console.log('✅ FALLBACK SESSION created for user:', session.user.id);
              } else {
                console.error('🚨 DOUBLE FAILURE: User not found by twitterId OR dbId');
                
                // Emergency fallback - create minimal session data
                session.user.id = (token.id && typeof token.id === 'string') ? token.id : 'unknown';
                session.user.twitterId = (token.twitterId && typeof token.twitterId === 'string') ? token.twitterId : 'unknown';
                session.user.credits = 2;
                session.user.name = (token.displayName && typeof token.displayName === 'string') ? token.displayName : 'User';
                
                console.log('🆘 EMERGENCY SESSION created with minimal data');
              }
            }
          }
        } else {
          console.error('🔴 CRITICAL: No twitterId in token - session isolation broken');
          
          // Emergency fallback
          if (token?.id && typeof token.id === 'string') {
            session.user.id = token.id;
            session.user.credits = token.credits || 2;
          }
        }
        
        // Final safety checks
        if (!session.user.id && token?.id && typeof token.id === 'string') {
          session.user.id = token.id;
        }
        if (!session.user.twitterId && token?.twitterId && typeof token.twitterId === 'string') {
          session.user.twitterId = token.twitterId;
        }
        if (!session.user.credits) {
          session.user.credits = 2; // Default credits
        }

        console.log('✅ SESSION CALLBACK END - Final session:', {
          userId: session.user.id,
          twitterId: session.user.twitterId,
          username: session.user.username,
          credits: session.user.credits,
          sessionId: (session as any).sessionId
        });
      
        return session;
      } catch (error) {
        console.error('🔴 CRITICAL ERROR in session callback:', error);
        
        // Return session with minimum required data to prevent complete failure
        if (token?.id && typeof token.id === 'string') {
          session.user.id = token.id;
        }
        if (token?.twitterId && typeof token.twitterId === 'string') {
          session.user.twitterId = token.twitterId;
        }
        if (!session.user.credits) {
          session.user.credits = 2;
        }
        
        console.log('🆘 ERROR RECOVERY SESSION:', {
          userId: session.user.id,
          twitterId: session.user.twitterId,
          credits: session.user.credits
        });
        
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