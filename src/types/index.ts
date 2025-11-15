// Core User Types
export interface User {
  _id: string;
  twitterId: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  credits: number;
  totalEarned: number;
  totalSpent: number;
  joinedAt: Date;
  lastActive: Date;
  isActive: boolean;
  settings: UserSettings;
  stats: UserStats;
}

export interface UserSettings {
  autoEngage: boolean;
  maxEngagementsPerDay: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  privacy: 'public' | 'private';
}

export interface UserStats {
  totalEngagements: number;
  successRate: number;
  averageEarningsPerDay: number;
  streakDays: number;
  rank: number;
}

// Engagement System Types
export interface Post {
  _id: string;
  userId: string;
  tweetId: string;
  tweetUrl: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  engagementType: EngagementType;
  creditsRequired: number;
  maxEngagements: number;
  currentEngagements: number;
  status: PostStatus;
  createdAt: Date;
  expiresAt: Date;
  completedAt?: Date;
  tags?: string[];
  priority: Priority;
}

export interface Engagement {
  _id: string;
  postId: string;
  userId: string;
  engagementType: EngagementType;
  status: EngagementStatus;
  creditsEarned: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  metadata?: {
    tweetId: string;
    actionType: string;
    success: boolean;
  };
}

export interface CreditTransaction {
  _id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balance: number;
  description: string;
  metadata?: {
    postId?: string;
    engagementId?: string;
    referralUserId?: string;
  };
  createdAt: Date;
}

// Enums
export type EngagementType = 'like' | 'retweet' | 'reply' | 'follow' | 'quote';
export type PostStatus = 'active' | 'completed' | 'expired' | 'paused';
export type EngagementStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';
export type TransactionType = 'earn' | 'spend' | 'bonus' | 'refund' | 'admin_adjustment';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Dashboard Analytics Types
export interface DashboardStats {
  user: {
    credits: number;
    totalEarned: number;
    totalSpent: number;
    engagementsToday: number;
    successRate: number;
  };
  platform: {
    totalUsers: number;
    totalEngagements: number;
    totalCredits: number;
    averageSuccessRate: number;
  };
  recent: {
    engagements: Engagement[];
    transactions: CreditTransaction[];
    posts: Post[];
  };
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

// Chrome Extension Types
export interface ExtensionMessage {
  type: string;
  data?: any;
  success?: boolean;
  error?: string;
}

export interface ExtensionConfig {
  apiUrl: string;
  userId: string;
  authToken: string;
  settings: {
    autoEngage: boolean;
    rateLimitDelay: number;
    maxRetries: number;
  };
}

// Twitter API Types
export interface TwitterUser {
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

export interface TwitterTweet {
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
  attachments?: {
    media_keys?: string[];
  };
}

// System Configuration
export interface SystemConfig {
  credits_per_engagement: number;
  credits_per_post: number;
  max_engagements_per_day: number;
  engagement_timeout_hours: number;
  user_starting_credits: number;
  platform_fee_percentage: number;
  min_payout_amount: number;
  max_post_duration_hours: number;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// Session Types
export interface UserSession {
  userId: string;
  username: string;
  credits: number;
  isActive: boolean;
  expiresAt: Date;
}