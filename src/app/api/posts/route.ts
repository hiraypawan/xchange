import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { createPostSchema, searchPostsSchema } from '@/lib/validations';
import { extractTweetId, extractUsername } from '@/lib/utils';
import { ObjectId } from 'mongodb';

// GET /api/posts - Get posts with filters and pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    
    const validation = searchPostsSchema.safeParse(query);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: validation.error.errors },
        { status: 400 }
      );
    }

    const {
      query: searchQuery,
      engagementType,
      status,
      priority,
      minCredits,
      maxCredits,
      page,
      limit,
      sortBy,
      sortOrder,
    } = validation.data;

    const { db } = await connectToDatabase();
    
    // Build MongoDB query
    const filter: any = {};
    
    if (searchQuery) {
      filter.$text = { $search: searchQuery };
    }
    
    if (engagementType) {
      filter.engagementType = engagementType;
    }
    
    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active'; // Default to active posts
    }
    
    if (priority) {
      filter.priority = priority;
    }
    
    if (minCredits !== undefined || maxCredits !== undefined) {
      filter.creditsRequired = {};
      if (minCredits !== undefined) filter.creditsRequired.$gte = minCredits;
      if (maxCredits !== undefined) filter.creditsRequired.$lte = maxCredits;
    }

    // Exclude expired posts
    filter.expiresAt = { $gt: new Date() };

    const skip = (page - 1) * limit;
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [posts, total] = await Promise.all([
      db.collection('posts')
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection('posts').countDocuments(filter)
    ]);

    const pages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: posts,
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
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/posts - Create a new engagement post
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = createPostSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { tweetUrl, engagementType, maxEngagements, priority, tags } = validation.data;

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

    // Calculate credits required
    const creditsPerPost = parseInt(process.env.CREDITS_PER_POST || '10');
    const totalCreditsRequired = creditsPerPost * maxEngagements;

    // Check if user has enough credits
    if (user.credits < totalCreditsRequired) {
      return NextResponse.json(
        { error: 'Insufficient credits', required: totalCreditsRequired, available: user.credits },
        { status: 400 }
      );
    }

    // Extract tweet information
    const tweetId = extractTweetId(tweetUrl);
    const username = extractUsername(tweetUrl);

    if (!tweetId || !username) {
      return NextResponse.json(
        { error: 'Invalid Twitter URL' },
        { status: 400 }
      );
    }

    // Check for duplicate posts
    const existingPost = await db.collection('posts').findOne({
      tweetId,
      userId: user._id.toString(),
      status: { $in: ['active', 'pending'] }
    });

    if (existingPost) {
      return NextResponse.json(
        { error: 'You already have an active post for this tweet' },
        { status: 400 }
      );
    }

    // Create post
    const expirationHours = parseInt(process.env.ENGAGEMENT_TIMEOUT_HOURS || '24');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    const newPost = {
      userId: user._id.toString(),
      tweetId,
      tweetUrl,
      content: '', // Will be filled by Twitter API later
      author: {
        username,
        displayName: username,
        avatar: '',
      },
      engagementType,
      creditsRequired: creditsPerPost,
      maxEngagements,
      currentEngagements: 0,
      status: 'active',
      createdAt: new Date(),
      expiresAt,
      priority: priority || 'medium',
      tags: tags || [],
    };

    // Start transaction
    const client = await db.client;
    const transactionSession = client.startSession();

    try {
      await transactionSession.withTransaction(async () => {
        // Create post
        const postResult = await db.collection('posts').insertOne(newPost, { session: transactionSession });

        // Deduct credits from user
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $inc: { 
              credits: -totalCreditsRequired,
              totalSpent: totalCreditsRequired
            }
          },
          { session: transactionSession }
        );

        // Create credit transaction
        await db.collection('credit_transactions').insertOne({
          userId: user._id.toString(),
          type: 'spend',
          amount: -totalCreditsRequired,
          balance: user.credits - totalCreditsRequired,
          description: `Created engagement post for ${engagementType}`,
          metadata: {
            postId: postResult.insertedId.toString(),
          },
          createdAt: new Date(),
        }, { session: transactionSession });
      });
      
      return NextResponse.json({
        success: true,
        message: 'Post created successfully',
        data: { creditsSpent: totalCreditsRequired }
      });
    } finally {
      await transactionSession.endSession();
    }
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}