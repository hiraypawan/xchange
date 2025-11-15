import { NextAuthOptions } from 'next-auth';
import TwitterProvider from 'next-auth/providers/twitter';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';
import clientPromise from './mongodb';
import { connectToDatabase } from './mongodb';
import { User } from '@/types';

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    TwitterProvider({
      clientId: process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0',
      authorization: {
        url: 'https://twitter.com/i/oauth2/authorize',
        params: {
          scope: 'users.read tweet.read tweet.write like.write follows.write offline.access',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === 'twitter' && profile) {
          const { db } = await connectToDatabase();
          
          // Check if user exists
          const existingUser = await db.collection('users').findOne({
            $or: [
              { twitterId: (profile as any).id },
              { email: user.email }
            ]
          });

          if (!existingUser) {
            // Create new user with starting credits
            const newUser: Partial<User> = {
              twitterId: (profile as any).id,
              username: (profile as any).username || user.name?.replace(/\s+/g, '_').toLowerCase(),
              displayName: (profile as any).name || user.name || '',
              avatar: (profile as any).profile_image_url || user.image,
              email: user.email,
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
              userId: (profile as any).id,
              type: 'bonus',
              amount: parseInt(process.env.USER_STARTING_CREDITS || '100'),
              balance: parseInt(process.env.USER_STARTING_CREDITS || '100'),
              description: 'Welcome bonus',
              createdAt: new Date(),
            });
          } else {
            // Update last active
            await db.collection('users').updateOne(
              { twitterId: profile.id },
              { 
                $set: { 
                  lastActive: new Date(),
                  avatar: profile.profile_image_url || user.image,
                  displayName: profile.name || user.name || existingUser.displayName,
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
    
    async jwt({ token, account, profile, user }) {
      if (account && profile) {
        token.twitterId = profile.id;
        token.username = profile.username;
        
        // Fetch user data from database
        const { db } = await connectToDatabase();
        const dbUser = await db.collection('users').findOne({ twitterId: profile.id });
        
        if (dbUser) {
          token.credits = dbUser.credits;
          token.userId = dbUser._id.toString();
        }
      }
      return token;
    },
    
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.twitterId = token.twitterId as string;
        session.user.username = token.username as string;
        session.user.credits = token.credits as number;
        
        // Update session with fresh data
        try {
          const { db } = await connectToDatabase();
          const user = await db.collection('users').findOne({ twitterId: token.twitterId });
          
          if (user) {
            session.user.credits = user.credits;
          }
        } catch (error) {
          console.error('Session update error:', error);
        }
      }
      return session;
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
    return user as User;
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
        const user = await db.collection('users').findOne(
          { _id: userId },
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
          { _id: userId },
          { 
            $set: { credits: newBalance },
            $inc: amount > 0 ? { totalEarned: amount } : { totalSpent: Math.abs(amount) }
          },
          { session }
        );
        
        // Create transaction record
        await db.collection('credit_transactions').insertOne({
          userId,
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