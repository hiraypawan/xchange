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
          
          // Check if user exists by twitterId OR email (prevent duplicates)
          const existingUser = await db.collection('users').findOne({
            $or: [
              { twitterId: twitterProfile.id },
              { email: user.email }
            ]
          });

          if (existingUser) {
            console.log('✅ Existing user found, preventing duplicate account creation:', existingUser._id);
            
            // Update existing user with latest Twitter data if needed
            await db.collection('users').updateOne(
              { _id: existingUser._id },
              {
                $set: {
                  twitterId: twitterProfile.id,
                  username: twitterProfile.username || existingUser.username,
                  displayName: twitterProfile.name || existingUser.displayName,
                  profileImage: twitterProfile.profile_image_url || existingUser.profileImage,
                  email: user.email || existingUser.email,
                  lastLogin: new Date(),
                  updatedAt: new Date()
                }
              }
            );
            
            // Use existing user ID to prevent duplicate
            user.id = existingUser._id.toString();
            return true;
          } else {
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

            // Double-check no user was created in the meantime (race condition protection)
            const raceCheck = await db.collection('users').findOne({
              $or: [
                { twitterId: twitterProfile.id },
                { email: user.email }
              ]
            });

            if (raceCheck) {
              console.log('🔒 Race condition detected, using existing user:', raceCheck._id);
              user.id = raceCheck._id.toString();
              return true;
            }

            const result = await db.collection('users').insertOne(newUser);

            if (result.acknowledged) {
              console.log('✅ New user created with starting credits:', {
                id: result.insertedId,
                username: newUser.username,
                credits: newUser.credits,
                email: newUser.email
              });

              // Set the user ID for NextAuth
              user.id = result.insertedId.toString();

              // Create welcome credit transaction
              await db.collection('credit_transactions').insertOne({
                userId: result.insertedId.toString(),
                type: 'bonus',
                amount: parseInt(process.env.USER_STARTING_CREDITS || '2'),
                balance: parseInt(process.env.USER_STARTING_CREDITS || '2'),
                description: 'Welcome bonus - Account creation',
                createdAt: new Date(),
              });
            }
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
          
          // Try multiple methods to find the user
          let dbUser = null;
          
          // Try by email first (most reliable from Twitter OAuth)
          if (session.user.email) {
            dbUser = await db.collection('users').findOne({ 
              email: session.user.email 
            });
          }
          
          // Try by user.id if it looks like a twitterId
          if (!dbUser && user.id) {
            dbUser = await db.collection('users').findOne({ 
              twitterId: user.id 
            });
          }
          
          // Try by ObjectId if user.id looks like MongoDB ObjectId
          if (!dbUser && user.id && user.id.match(/^[0-9a-fA-F]{24}$/)) {
            try {
              dbUser = await db.collection('users').findOne({ 
                _id: new ObjectId(user.id)
              });
            } catch (error) {
              console.log('ObjectId lookup failed:', error);
            }
          }
          
          console.log('Session callback - search results:');
          console.log('- Email search:', session.user.email, dbUser ? 'FOUND' : 'NOT FOUND');
          console.log('- TwitterId search:', user.id, dbUser ? 'FOUND' : 'NOT FOUND');
          console.log('- Final dbUser:', dbUser ? { id: dbUser._id, twitterId: dbUser.twitterId, credits: dbUser.credits } : 'NULL');
          
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