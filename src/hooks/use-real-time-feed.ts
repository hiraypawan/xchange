'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface Post {
  _id: string;
  tweetId: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    profileImage: string;
  };
  engagementType: 'like' | 'retweet' | 'reply' | 'follow';
  creditCost: number;
  targetEngagements: number;
  completedEngagements: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string;
  expiresAt: string;
}

interface FeedResponse {
  success: boolean;
  data: {
    posts: Post[];
    hasMore: boolean;
    total: number;
  };
}

export function useRealTimeFeed() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchFeed = useCallback(async (refresh = false) => {
    if (!session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      if (refresh) {
        setIsLoading(true);
      }

      const response = await fetch('/api/posts?limit=20&status=active', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch feed');
      }

      const result: FeedResponse = await response.json();
      
      if (result.success) {
        setPosts(result.data.posts);
        setHasMore(result.data.hasMore);
        setError(null);
      } else {
        setError('Failed to load feed');
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const engageWithPost = useCallback(async (postId: string, engagementType: string) => {
    try {
      const response = await fetch('/api/engage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          engagementType,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to engage with post');
      }

      const result = await response.json();
      
      if (result.success) {
        // Update the post in the local state
        setPosts(prevPosts => 
          prevPosts.map(post => 
            post._id === postId 
              ? { 
                  ...post, 
                  completedEngagements: post.completedEngagements + 1,
                  status: (post.completedEngagements + 1 >= post.targetEngagements) ? 'completed' : post.status
                }
              : post
          )
        );
        
        // Refresh feed to get updated data
        setTimeout(() => fetchFeed(false), 1000);
        
        return result;
      } else {
        throw new Error(result.error || 'Engagement failed');
      }
    } catch (err) {
      console.error('Error engaging with post:', err);
      throw err;
    }
  }, [fetchFeed]);

  // Initial fetch
  useEffect(() => {
    fetchFeed(true);
  }, [fetchFeed]);

  // Real-time updates every 10 seconds
  useEffect(() => {
    if (!session?.user?.id) return;

    const interval = setInterval(() => {
      fetchFeed(false);
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [session?.user?.id, fetchFeed]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (!document.hidden) {
        fetchFeed(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchFeed]);

  return {
    posts,
    isLoading,
    error,
    hasMore,
    refetch: () => fetchFeed(true),
    engageWithPost
  };
}