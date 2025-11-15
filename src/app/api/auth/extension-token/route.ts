import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Get user data from database
    const user = await usersCollection.findOne({ _id: new ObjectId(session.user.id) });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Generate JWT token for extension
    const extensionToken = jwt.sign(
      {
        userId: session.user.id,
        username: session.user.username,
        email: session.user.email,
        type: 'extension',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year expiry
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { algorithm: 'HS256' }
    );

    // Update user's extension status
    await usersCollection.updateOne(
      { _id: new ObjectId(session.user.id) },
      {
        $set: {
          extensionConnected: true,
          extensionConnectedAt: new Date(),
          lastExtensionToken: extensionToken.substring(0, 20), // Store partial token for tracking
        },
      }
    );

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