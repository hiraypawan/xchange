import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('Extension token request started');
    const session = await getServerSession(authOptions);

    console.log('Session:', session ? 'exists' : 'null', session?.user?.id);

    if (!session?.user?.id) {
      console.log('No session or user ID found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get JWT secret early to avoid reference errors
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'fallback-secret';
    console.log('Using JWT secret:', jwtSecret ? 'exists' : 'missing');

    // Connect to database
    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Get user data from database
    console.log('Looking up user with ID:', session.user.id);
    
    // Try multiple query approaches in case the user ID format varies
    let user = await usersCollection.findOne({ _id: new ObjectId(session.user.id) });
    
    if (!user) {
      console.log('User not found with ObjectId, trying string ID...');
      user = await usersCollection.findOne({ _id: session.user.id });
    }
    
    if (!user && session.user.email) {
      console.log('User not found with ID, trying email lookup...');
      user = await usersCollection.findOne({ email: session.user.email });
    }

    if (!user) {
      console.log('User not found in database, creating minimal token with session data...');
      // Fallback: create token with session data even if user not found in DB
      const fallbackToken = jwt.sign(
        {
          userId: session.user.id,
          username: session.user.username || session.user.name,
          email: session.user.email,
          type: 'extension',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year expiry
        },
        jwtSecret,
        { algorithm: 'HS256' }
      );

      return NextResponse.json({
        success: true,
        token: fallbackToken,
        userId: session.user.id,
        credits: 0, // Default credits
        userData: {
          username: session.user.username || session.user.name,
          displayName: session.user.name,
          email: session.user.email,
          avatar: session.user.image,
          credits: 0,
        },
      });
    }

    console.log('User found:', user.username || user.email);

    // Generate JWT token for extension
    console.log('Generating JWT token...');
    
    const extensionToken = jwt.sign(
      {
        userId: session.user.id,
        username: session.user.username,
        email: session.user.email,
        type: 'extension',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year expiry
      },
      jwtSecret,
      { algorithm: 'HS256' }
    );
    
    console.log('JWT token generated successfully');

    // Update user's extension status using the same ID format that worked for the query
    console.log('Updating user extension status...');
    const updateQuery = user._id ? { _id: user._id } : { email: session.user.email };
    await usersCollection.updateOne(
      updateQuery,
      {
        $set: {
          extensionConnected: true,
          extensionConnectedAt: new Date(),
          lastExtensionToken: extensionToken.substring(0, 20), // Store partial token for tracking
        },
      }
    );
    
    console.log('Extension status updated successfully');

    return NextResponse.json({
      success: true,
      token: extensionToken,
      userId: session.user.id,
      credits: user.credits || 0,
      userData: {
        username: session.user.username,
        displayName: session.user.name,
        email: session.user.email,
        avatar: session.user.image,
        credits: user.credits || 0,
      },
    });

  } catch (error) {
    console.error('Extension token generation failed:', error);
    return NextResponse.json(
      { error: 'Failed to generate extension token' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Get user's extension status
    const user = await usersCollection.findOne(
      { _id: new ObjectId(session.user.id) },
      { projection: { extensionConnected: 1, extensionConnectedAt: 1, credits: 1 } }
    );

    return NextResponse.json({
      success: true,
      isExtensionConnected: user?.extensionConnected || false,
      connectedAt: user?.extensionConnectedAt,
      credits: user?.credits || 0,
    });

  } catch (error) {
    console.error('Extension status check failed:', error);
    return NextResponse.json(
      { error: 'Failed to check extension status' },
      { status: 500 }
    );
  }
}