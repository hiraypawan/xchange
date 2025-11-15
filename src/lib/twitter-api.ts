// Twitter API integration for Xchangee

interface TwitterApiConfig {
  accessToken: string;
  refreshToken?: string;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
  profile_image_url?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

interface TwitterTweet {
  id: string;
  text: string;
  author_id: string;
  created_at: string;
  public_metrics?: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
}

class TwitterAPI {
  private baseUrl = 'https://api.twitter.com/2';
  private config: TwitterApiConfig;

  constructor(config: TwitterApiConfig) {
    this.config = config;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Twitter API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  // Get user by username
  async getUserByUsername(username: string): Promise<TwitterUser> {
    const response = await this.makeRequest(
      `/users/by/username/${username}?user.fields=profile_image_url,public_metrics`
    );
    return response.data;
  }

  // Get tweet by ID
  async getTweet(tweetId: string): Promise<TwitterTweet> {
    const response = await this.makeRequest(
      `/tweets/${tweetId}?tweet.fields=author_id,created_at,public_metrics&expansions=author_id`
    );
    return response.data;
  }

  // Like a tweet
  async likeTweet(tweetId: string, userId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/users/${userId}/likes`, {
        method: 'POST',
        body: JSON.stringify({ tweet_id: tweetId }),
      });
      return true;
    } catch (error) {
      console.error('Failed to like tweet:', error);
      return false;
    }
  }

  // Retweet a tweet
  async retweet(tweetId: string, userId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/users/${userId}/retweets`, {
        method: 'POST',
        body: JSON.stringify({ tweet_id: tweetId }),
      });
      return true;
    } catch (error) {
      console.error('Failed to retweet:', error);
      return false;
    }
  }

  // Follow a user
  async followUser(targetUserId: string, userId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/users/${userId}/following`, {
        method: 'POST',
        body: JSON.stringify({ target_user_id: targetUserId }),
      });
      return true;
    } catch (error) {
      console.error('Failed to follow user:', error);
      return false;
    }
  }

  // Create a tweet (reply)
  async createTweet(text: string, replyToTweetId?: string): Promise<TwitterTweet> {
    const body: any = { text };
    
    if (replyToTweetId) {
      body.reply = { in_reply_to_tweet_id: replyToTweetId };
    }

    const response = await this.makeRequest('/tweets', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    return response.data;
  }

  // Quote tweet
  async quoteTweet(text: string, quoteTweetId: string): Promise<TwitterTweet> {
    const response = await this.makeRequest('/tweets', {
      method: 'POST',
      body: JSON.stringify({
        text: text,
        quote_tweet_id: quoteTweetId,
      }),
    });
    
    return response.data;
  }

  // Get rate limit status
  async getRateLimit(): Promise<any> {
    try {
      const response = await fetch('https://api.twitter.com/1.1/application/rate_limit_status.json', {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });
      return response.json();
    } catch (error) {
      console.error('Failed to get rate limit:', error);
      return null;
    }
  }
}

// Helper function to extract tweet ID from URL
export function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

// Helper function to extract username from URL
export function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/twitter\.com\/([^\/]+)/) || url.match(/x\.com\/([^\/]+)/);
  return match ? match[1] : null;
}

// Helper function to validate tweet URL
export function isValidTweetUrl(url: string): boolean {
  const tweetUrlRegex = /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/;
  return tweetUrlRegex.test(url);
}

export { TwitterAPI };
export type { TwitterApiConfig, TwitterUser, TwitterTweet };