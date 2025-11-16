import { NextAuthOptions, Profile } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from './mongodb';
import { connectToDatabase } from './mongodb';
import { User } from '@/types';
import { ObjectId } from 'mongodb';

// Define Twitter profile interface
interface TwitterProfile extends Profile {
  id: string;
  username?: string;
  name?: string;
  profile_image_url?: string;
}

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
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
    strategy: 'database',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 1 day
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'twitter' && profile) {
          const { db } = await connectToDatabase();
          const twitterProfile = profile as TwitterProfile;
          
          // Check if user exists by twitterId only (each Twitter account is unique)
          const existingUser = await db.collection('users').findOne({
            twitterId: twitterProfile.id
          });

          if (!existingUser) {
            // Create new user with starting credits
            const newUser: Omit<User, '_id'> = {
              twitterId: twitterProfile.id,
              username: twitterProfile.username || user.name?.replace(/\s+/g, '_').toLowerCase() || 'unknown',
              displayName: twitterProfile.name || user.name || '',
              avatar: twitterProfile.profile_image_url || user.image || undefined,
              email: user.email ?? undefined,
              credits: parseInt(process.env.USER_STARTING_CREDITS || '100'),
              totalEarned: 0,
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
            };

            await db.collection('users').insertOne(newUser);

            // Create welcome credit transaction
            await db.collection('credit_transactions').insertOne({
              userId: twitterProfile.id,
              type: 'bonus',
              amount: parseInt(process.env.USER_STARTING_CREDITS || '100'),
              balance: parseInt(process.env.USER_STARTING_CREDITS || '100'),
              description: 'Welcome bonus',
              createdAt: new Date(),
            });
          } else {
            // Update last active
            await db.collection('users').updateOne(
              { twitterId: twitterProfile.id },
              { 
                $set: { 
                  lastActive: new Date(),
                  avatar: twitterProfile.profile_image_url || user.image,
                  displayName: twitterProfile.name || user.name || existingUser.displayName,
                }
              }
            );
          }
        }
        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },
    
    async session({ session, user }) {
      try {
        console.log('Session callback - user from adapter:', user);
        console.log('Session callback - session:', session);
        
        if (user) {
          // When using database strategy, user comes from the adapter
          session.user.id = user.id;
          
          // Fetch additional user data from our custom users collection
          const { db } = await connectToDatabase();
          
          // First try to find by user ID (from NextAuth adapter)
          let dbUser = null;
          if (user.id) {
            try {
              dbUser = await db.collection('users').findOne({ 
                _id: new ObjectId(user.id)
              });
            } catch (error) {
              // If ObjectId conversion fails, try finding by twitterId or email
              dbUser = await db.collection('users').findOne({
                $or: [
                  { twitterId: user.id },
                  { email: session.user.email }
                ]
              });
            }
          } else {
            // Fallback to email if no user.id
            dbUser = await db.collection('users').findOne({ 
              email: session.user.email 
            });
          }
          
          console.log('Session callback - dbUser found:', dbUser);
          
          if (dbUser) {
            session.user.id = dbUser._id.toString();
            session.user.twitterId = dbUser.twitterId;
            session.user.username = dbUser.username;
            session.user.credits = dbUser.credits;
          }
        }
        
        console.log('Session callback - final session:', session);
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