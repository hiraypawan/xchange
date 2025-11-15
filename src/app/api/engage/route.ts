import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { engageSchema } from '@/lib/validations';
import { ObjectId } from 'mongodb';

// POST /api/engage - Create a new engagement
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.twitterId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = engageSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { postId, engagementType } = validation.data;

    const { db } = await connectToDatabase();
    
    // Get user
    const user = await db.collection('users').findOne({
      twitterId: session.user.twitterId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get post
    const post = await db.collection('posts').findOne({
      _id: new ObjectId(postId)
    });

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Validation checks
    if (post.status !== 'active') {
      return NextResponse.json(
        { error: 'Post is not active' },
        { status: 400 }
      );
    }

    if (post.userId === user._id.toString()) {
      return NextResponse.json(
        { error: 'Cannot engage with your own post' },
        { status: 400 }
      );
    }

    if (post.engagementType !== engagementType) {
      return NextResponse.json(
        { error: 'Engagement type mismatch' },
        { status: 400 }
      );
    }

    if (post.currentEngagements >= post.maxEngagements) {
      return NextResponse.json(
        { error: 'Post has reached maximum engagements' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(post.expiresAt)) {
      return NextResponse.json(
        { error: 'Post has expired' },
        { status: 400 }
      );
    }

    // Check if user already engaged with this post
    const existingEngagement = await db.collection('engagements').findOne({
      postId,
      userId: user._id.toString(),
      status: { $in: ['pending', 'in_progress', 'completed'] }
    });

    if (existingEngagement) {
      return NextResponse.json(
        { error: 'You have already engaged with this post' },
        { status: 400 }
      );
    }

    // Check daily engagement limit
    const maxEngagementsPerDay = parseInt(process.env.MAX_ENGAGEMENTS_PER_DAY || '50');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayEngagements = await db.collection('engagements').countDocuments({
      userId: user._id.toString(),
      createdAt: { $gte: todayStart }
    });

    if (todayEngagements >= maxEngagementsPerDay) {
      return NextResponse.json(
        { error: 'Daily engagement limit reached' },
        { status: 400 }
      );
    }

    // Create engagement
    const creditsPerEngagement = parseInt(process.env.CREDITS_PER_ENGAGEMENT || '1');
    
    const newEngagement = {
      postId,
      userId: user._id.toString(),
      engagementType,
      status: 'pending',
      creditsEarned: creditsPerEngagement,
      createdAt: new Date(),
      retryCount: 0,
      metadata: {
        tweetId: post.tweetId,
        actionType: engagementType,
        success: false,
      },
    };

    // Start transaction
    const client = await db.client;
    const transactionSession = client.startSession();

    try {
      let engagementId: ObjectId;
      
      await transactionSession.withTransaction(async () => {
        // Create engagement
        const engagementResult = await db.collection('engagements').insertOne(
          newEngagement, 
          { session: transactionSession }
        );
        engagementId = engagementResult.insertedId;

        // Increment post engagement count
        await db.collection('posts').updateOne(
          { _id: new ObjectId(postId) },
          { $inc: { currentEngagements: 1 } },
          { session: transactionSession }
        );

        // Update post status if completed
        if (post.currentEngagements + 1 >= post.maxEngagements) {
          await db.collection('posts').updateOne(
            { _id: new ObjectId(postId) },
            { 
              $set: { 
                status: 'completed',
                completedAt: new Date()
              }
            },
            { session: transactionSession }
          );
        }
      });
      
      return NextResponse.json({
        success: true,
        message: 'Engagement created successfully',
        data: {
          engagementId: engagementId!.toString(),
          creditsToEarn: creditsPerEngagement,
          tweetUrl: post.tweetUrl,
          actionType: engagementType
        }
      });
    } finally {
      await transactionSession.endSession();
    }
  } catch (error) {
    console.error('Create engagement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/engage - Get user's engagements
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.twitterId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const status = searchParams.get('status');

    const { db } = await connectToDatabase();
    
    // Get user
    const user = await db.collection('users').findOne({
      twitterId: session.user.twitterId
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build query
    const filter: any = { userId: user._id.toString() };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    // Get engagements with post details
    const [engagements, total] = await Promise.all([
      db.collection('engagements').aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'posts',
            localField: 'postId',
            foreignField: '_id',
            as: 'post'
          }
        },
        { $unwind: '$post' },
        {
          $project: {
            _id: 1,
            engagementType: 1,
            status: 1,
            creditsEarned: 1,
            createdAt: 1,
            startedAt: 1,
            completedAt: 1,
            errorMessage: 1,
            retryCount: 1,
            'post.tweetUrl': 1,
            'post.content': 1,
            'post.author': 1,
          }
        }
      ]).toArray(),
      db.collection('engagements').countDocuments(filter)
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: engagements,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1,
      }
    });
  } catch (error) {
    console.error('Get engagements error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}