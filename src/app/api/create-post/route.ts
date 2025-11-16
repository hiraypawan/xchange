import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { tweetUrl, engagementType, description } = await request.json();

    // Validate input
    if (!tweetUrl || !engagementType) {
      return NextResponse.json(
        { success: false, error: 'Tweet URL and engagement type are required' },
        { status: 400 }
      );
    }

    // Only allow like, retweet, follow (no comments, quotes)
    const allowedEngagements = ['like', 'retweet', 'follow'];
    if (!allowedEngagements.includes(engagementType)) {
      return NextResponse.json(
        { success: false, error: 'Only like, retweet, and follow engagements are supported' },
        { status: 400 }
      );
    }

    // Check if user has enough credits (1 credit required for posting)
    const userCredits = session.user.credits || 0;
    if (userCredits < 1) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Insufficient credits',
          message: 'You need 1 credit to post. Engage with others to earn credits!',
          showNotification: true
        },
        { status: 402 }
      );
    }

    // Create the post (mock implementation)
    const newPost = {
      _id: `post_${Date.now()}`,
      userId: session.user.id,
      username: session.user.username || session.user.name,
      displayName: session.user.name || session.user.username,
      avatar: session.user.image || 'https://via.placeholder.com/40',
      tweetUrl,
      engagementType,
      creditsRequired: 1, // Always 1 credit
      maxEngagements: 100, // Default max engagements
      currentEngagements: 0,
      description: description || `Please ${engagementType} my tweet!`,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
      status: 'active'
    };

    // In a real implementation, you would:
    // 1. Save to database
    // 2. Deduct 1 credit from user
    // 3. Add to engagement queue

    console.log('Created post:', newPost);

    return NextResponse.json({
      success: true,
      post: newPost,
      message: '1 credit deducted. Your post is now live!'
    });

  } catch (error) {
    console.error('Failed to create post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create post' },
      { status: 500 }
    );
  }
}