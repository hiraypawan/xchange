import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/debug/user-session - Debug user session and database state
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 DEBUG USER SESSION - Starting...');
    
    const session = await getServerSession(authOptions);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user ? {
          id: session.user.id,
          twitterId: session.user.twitterId,
          username: session.user.username,
          name: session.user.name,
          email: session.user.email,
          credits: session.user.credits,
          image: session.user.image
        } : null
      },
      database: {
        connected: false,
        userFound: false,
        userSearchResults: [] as any[],
        totalUsers: 0,
        sampleUsers: [] as any[]
      } as any
    };

    if (!session?.user) {
      console.log('❌ No session found');
      return NextResponse.json({
        success: false,
        debug: debugInfo,
        message: 'No active session'
      });
    }

    // Test database connection and search
    try {
      const { db } = await connectToDatabase();
      debugInfo.database.connected = true;
      
      // Get total user count
      debugInfo.database.totalUsers = await db.collection('users').countDocuments();
      
      // Search for user with different methods
      const searchMethods = [
        {
          name: 'twitterId',
          query: session.user.twitterId ? { twitterId: session.user.twitterId } : null
        },
        {
          name: 'objectId',
          query: session.user.id && ObjectId.isValid(session.user.id) ? { _id: new ObjectId(session.user.id) } : null
        },
        {
          name: 'idAsTwitterId',
          query: session.user.id ? { twitterId: session.user.id } : null
        },
        {
          name: 'email',
          query: session.user.email ? { email: session.user.email } : null
        },
        {
          name: 'username',
          query: session.user.username ? { username: session.user.username } : null
        }
      ];

      for (const method of searchMethods) {
        if (method.query) {
          try {
            const user = await db.collection('users').findOne(method.query);
            (debugInfo.database.userSearchResults as any[]).push({
              method: method.name,
              query: method.query,
              found: !!user,
              userData: user ? {
                id: user._id.toString(),
                twitterId: user.twitterId,
                username: user.username,
                credits: user.credits,
                displayName: user.displayName,
                joinedAt: user.joinedAt,
                lastActive: user.lastActive
              } : null
            });
            
            if (user) {
              debugInfo.database.userFound = true;
            }
          } catch (error) {
            (debugInfo.database.userSearchResults as any[]).push({
              method: method.name,
              query: method.query,
              found: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }
      
      // If no user found, check for similar users
      if (!debugInfo.database.userFound) {
        const allUsers = await db.collection('users').find({}, { 
          projection: { 
            _id: 1, 
            twitterId: 1, 
            username: 1, 
            displayName: 1, 
            email: 1 
          } 
        }).limit(10).toArray();
        
        debugInfo.database.sampleUsers = allUsers.map(u => ({
          id: u._id.toString(),
          twitterId: u.twitterId,
          username: u.username,
          displayName: u.displayName,
          email: u.email
        }));
      }
      
    } catch (error) {
      debugInfo.database.error = error instanceof Error ? error.message : 'Database connection failed';
    }

    console.log('📋 Debug info generated:', debugInfo);

    return NextResponse.json({
      success: true,
      debug: debugInfo,
      message: 'Debug information collected'
    });

  } catch (error) {
    console.error('❌ Debug API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Debug API failed'
    }, { status: 500 });
  }
}