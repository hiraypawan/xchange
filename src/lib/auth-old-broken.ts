import { NextAuthOptions, Profile } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from './mongodb';
import { connectToDatabase } from './mongodb';
import { User } from '@/types';
import { ObjectId } from 'mongodb';
import { UserManager } from './user-management';

// Define Twitter profile interface
interface TwitterProfile extends Profile {
  id: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
}

export const authOptions: NextAuthOptions = {
  // Remove MongoDB adapter to prevent automatic user creation
  // We'll handle user creation manually to prevent duplicates
  // adapter: MongoDBAdapter(clientPromise),
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
  // Remove custom pages to use NextAuth's default flow
  // pages: {
  //   signIn: '/auth/signin',
  //   signOut: '/auth/signout', 
  //   error: '/auth/error',
  // },
  session: {
    strategy: 'jwt', // Use JWT since we removed database adapter
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        console.log('🔐 SIGNIN ATTEMPT - AUTH CALLBACK TRIGGERED:', {
          provider: account?.provider,
          userName: user.name,
          userEmail: user.email,
          profileId: (profile as TwitterProfile)?.id,
          timestamp: new Date().toISOString(),
          userAgent: 'NextAuth signIn callback'
        });

        if (account?.provider === 'twitter' && profile) {
          const twitterProfile = profile as TwitterProfile;
          
          console.log('🔍 SIGNIN ATTEMPT - Checking for existing user...', {
            twitterId: twitterProfile.id,
            name: twitterProfile.name,
            username: twitterProfile.username
          });

          try {
            // Use centralized user management to prevent duplicates
            const { user: dbUser, isNew } = await UserManager.ensureUser({
              twitterId: twitterProfile.id,
              username: twitterProfile.username || user.name?.replace(/\s+/g, '_').toLowerCase(),
              displayName: twitterProfile.name || user.name || '',
              email: user.email || undefined,
              profileImage: twitterProfile.profile_image_url || user.image || undefined
            });

            console.log(isNew ? '✅ NEW USER CREATED' : '✅ EXISTING USER UPDATED', {
              id: dbUser._id,
              twitterId: dbUser.twitterId,
              username: dbUser.username,
              displayName: dbUser.displayName,
              credits: dbUser.credits
            });

            // ENSURE ALL USERS HAVE MINIMUM 2 CREDITS
            if (dbUser.credits < 2) {
              try {
                const { db } = await connectToDatabase();
                await db.collection('users').updateOne(
                  { _id: dbUser._id },
                  { $set: { credits: 2 } }
                );
                dbUser.credits = 2;
                console.log('🔄 CREDITS UPDATED TO 2 for user:', dbUser._id);
                
                // Create credit transaction
                await db.collection('credit_transactions').insertOne({
                  userId: dbUser._id.toString(),
                  type: 'starting_bonus',
                  amount: 2 - (dbUser.credits || 0),
                  balance: 2,
                  description: 'Starting credits - ensuring minimum 2 credits',
                  createdAt: new Date(),
                  metadata: { reason: 'auth_callback_credit_fix' }
                });
              } catch (creditError) {
                console.error('⚠️ Failed to ensure 2 credits:', creditError);
              }
            }

            // Set the user object for JWT session with all needed properties
            user.id = dbUser._id.toString();
            user.email = dbUser.email || user.email;
            user.name = dbUser.displayName || user.name;
            user.image = dbUser.avatar || dbUser.profileImage || user.image;
            
            // Store Twitter ID for API calls
            (user as any).twitterId = dbUser.twitterId;
            (user as any).username = dbUser.username;
            (user as any).credits = dbUser.credits;
            
          } catch (dbError) {
            console.warn('⚠️ UserManager failed, falling back to simple auth:', dbError);
            
            // Fallback: Allow sign-in without database operations
            // This allows access to fix the database issues
            user.id = twitterProfile.id; // Use Twitter ID as fallback
            (user as any).twitterId = twitterProfile.id;
            (user as any).username = twitterProfile.username || user.name?.replace(/\s+/g, '_').toLowerCase();
            (user as any).credits = 2; // Default 2 credits for fallback
            
            console.log('✅ FALLBACK AUTH - User signed in without database:', {
              twitterId: twitterProfile.id,
              name: twitterProfile.name,
              fallback: true
            });
          }
        }
        return true;
      } catch (error) {
        console.error('❌ ERROR in signIn callback (allowing fallback):', error);
        console.error('❌ User data:', { name: user.name, email: user.email });
        console.error('❌ Account data:', account);
        console.error('❌ Profile data:', profile);
        
        // Allow sign-in even with errors to prevent lockout
        // User can fix database issues after signing in
        console.log('🔓 EMERGENCY FALLBACK - Allowing sign-in despite errors');
        if (account?.provider === 'twitter' && profile) {
          user.id = (profile as TwitterProfile).id; // Use Twitter ID as fallback
          (user as any).twitterId = (profile as TwitterProfile).id;
          (user as any).username = (profile as TwitterProfile).username || user.name?.replace(/\s+/g, '_').toLowerCase();
          (user as any).credits = 2; // Default 2 credits for emergency fallback
        }
        return true; // Changed from false to true to prevent lockout
      }
    },
    
    async jwt({ token, user, account, profile }) {
      // This runs whenever a JWT is accessed
      // Store user data in the token for session access
      if (user) {
        token.id = user.id;
        token.twitterId = (user as any).twitterId;
        token.username = (user as any).username;
        token.credits = (user as any).credits;
        token.userId = user.id;
      }
      
      return token;
    },
    
    async session({ session, token }) {
      try {
        console.log('Session callback - token:', token);
        
        // Transfer token data to session
        if (token) {
          session.user.id = token.id as string;
          session.user.twitterId = token.twitterId as string;
          session.user.username = token.username as string;
          
          // Try to get fresh user data from database if twitterId is available
          if (token.twitterId) {
            try {
              const { db } = await connectToDatabase();
              const dbUser = await db.collection('users').findOne({ 
                twitterId: token.twitterId 
              });
              
              if (dbUser) {
                session.user.id = dbUser._id.toString();
                session.user.twitterId = dbUser.twitterId;
                session.user.username = dbUser.username;
                session.user.credits = dbUser.credits;
                
                console.log('Session callback - fresh data from DB:', {
                  id: dbUser._id.toString(),
                  twitterId: dbUser.twitterId,
                  credits: dbUser.credits
                });
              }
            } catch (dbError) {
              console.warn('Session callback - DB lookup failed, using token data:', dbError);
              // Fall back to token data
              session.user.credits = token.credits as number;
            }
          }
        }
        
        console.log('Session callback - final session:', {
          id: session.user.id,
          twitterId: session.user.twitterId,
          username: session.user.username,
          credits: session.user.credits
        });
        
        return session;
      } catch (error) {
        console.error('Session callback error:', error);
        return session;
      }
    },
  },
  events: {
    async signOut({ token }) {
      // Clean up user sessions if needed
      try {
        const { db } = await connectToDatabase();
        await db.collection('user_sessions').deleteMany({
          userId: token?.userId,
        });
      } catch (error) {
        console.error('Sign out cleanup error:', error);
      }
    },
  },
};

// Helper function to get current user from database
export async function getCurrentUser(twitterId: string): Promise<User | null> {
  try {
    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne({ twitterId });
    return user ? (user as any) as User : null;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

// Helper function to update user credits
export async function updateUserCredits(
  userId: string, 
  amount: number, 
  type: string,
  description: string,
  metadata?: any
): Promise<boolean> {
  try {
    const { db } = await connectToDatabase();
    
    // Start transaction
    const client = await clientPromise;
    const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Get current user
        const objectId = new ObjectId(userId);
        const user = await db.collection('users').findOne(
          { _id: objectId },
          { session }
        );
        
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
            $set: { credits: newBalance },
            $inc: amount > 0 ? { totalEarned: amount } : { totalSpent: Math.abs(amount) }
          },
          { session }
        );
        
        // Create transaction record
        await db.collection('credit_transactions').insertOne({
          userId: objectId,
          type,
          amount,
          balance: newBalance,
          description,
          metadata,
          createdAt: new Date(),
        }, { session });
      });
      
      return true;
    } finally {
      await session.endSession();
    }
  } catch (error) {
    console.error('Update user credits error:', error);
    return false;
  }
}