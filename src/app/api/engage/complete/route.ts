import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, updateUserCredits } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// POST /api/engage/complete - Complete an engagement and update credits
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { engagementId, success, errorMessage } = await req.json();

    if (!engagementId) {
      return NextResponse.json(
        { error: 'Engagement ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Get user
    const user = await db.collection('users').findOne({
      _id: new ObjectId(session.user.id)
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get engagement
    const engagement = await db.collection('engagements').findOne({
      _id: new ObjectId(engagementId),
      userId: user._id.toString()
    });

    if (!engagement) {
      return NextResponse.json(
        { error: 'Engagement not found' },
        { status: 404 }
      );
    }

    if (engagement.status !== 'pending' && engagement.status !== 'in_progress') {
      return NextResponse.json(
        { error: 'Engagement is not in valid state for completion' },
        { status: 400 }
      );
    }

    // Start transaction
    const { client } = await connectToDatabase();
    const transactionSession = client.startSession();

    try {
      await transactionSession.withTransaction(async () => {
        if (success) {
          // Update engagement as completed
          await db.collection('engagements').updateOne(
            { _id: new ObjectId(engagementId) },
            {
              $set: {
                status: 'completed',
                completedAt: new Date(),
                verifiedAt: new Date(),
              }
            },
            { session: transactionSession }
          );

          // Award credits to user
          await updateUserCredits(
            user._id.toString(),
            engagement.creditsEarned,
            'earn',
            `Completed ${engagement.engagementType} engagement`,
            { engagementId }
          );

          // Update user stats
          await db.collection('users').updateOne(
            { _id: user._id },
            {
              $inc: {
                'stats.totalEngagements': 1,
                totalEarned: engagement.creditsEarned
              },
              $set: { lastActive: new Date() }
            },
            { session: transactionSession }
          );

        } else {
          // Mark engagement as failed
          await db.collection('engagements').updateOne(
            { _id: new ObjectId(engagementId) },
            {
              $set: {
                status: 'failed',
                errorMessage: errorMessage || 'Engagement failed',
                completedAt: new Date(),
              },
              $inc: { retryCount: 1 }
            },
            { session: transactionSession }
          );
        }
      });

      return NextResponse.json({
        success: true,
        message: success ? 'Engagement completed successfully' : 'Engagement marked as failed',
        creditsEarned: success ? engagement.creditsEarned : 0
      });

    } finally {
      await transactionSession.endSession();
    }

  } catch (error) {
    console.error('Complete engagement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}