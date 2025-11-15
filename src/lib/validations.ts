import { z } from 'zod';

// User validation schemas
export const userSettingsSchema = z.object({
  autoEngage: z.boolean(),
  maxEngagementsPerDay: z.number().min(1).max(100),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  privacy: z.enum(['public', 'private']),
});

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50),
  bio: z.string().max(160).optional(),
  settings: userSettingsSchema.partial().optional(),
});

// Post creation validation
export const createPostSchema = z.object({
  tweetUrl: z.string().url().refine(
    (url) => /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url),
    { message: 'Must be a valid Twitter/X post URL' }
  ),
  engagementType: z.enum(['like', 'retweet', 'reply', 'follow', 'quote']),
  maxEngagements: z.number().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  tags: z.array(z.string()).optional(),
});

// Engagement validation
export const engageSchema = z.object({
  postId: z.string().min(1),
  engagementType: z.enum(['like', 'retweet', 'reply', 'follow', 'quote']),
});

// Admin schemas
export const updateSystemConfigSchema = z.object({
  credits_per_engagement: z.number().min(1).max(10),
  credits_per_post: z.number().min(1).max(100),
  max_engagements_per_day: z.number().min(1).max(200),
  engagement_timeout_hours: z.number().min(1).max(72),
  user_starting_credits: z.number().min(0).max(1000),
  platform_fee_percentage: z.number().min(0).max(50),
});

// Credit transaction validation
export const creditTransactionSchema = z.object({
  userId: z.string().min(1),
  type: z.enum(['earn', 'spend', 'bonus', 'refund', 'admin_adjustment']),
  amount: z.number(),
  description: z.string().min(1).max(200),
  metadata: z.object({}).optional(),
});

// Search and filter schemas
export const searchPostsSchema = z.object({
  query: z.string().optional(),
  engagementType: z.enum(['like', 'retweet', 'reply', 'follow', 'quote']).optional(),
  status: z.enum(['active', 'completed', 'expired', 'paused']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  minCredits: z.number().min(0).optional(),
  maxCredits: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'credits', 'priority']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchUsersSchema = z.object({
  query: z.string().optional(),
  minCredits: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['joinedAt', 'credits', 'lastActive']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Analytics schemas
export const analyticsDateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
});

// Extension schemas
export const extensionConfigSchema = z.object({
  autoEngage: z.boolean(),
  rateLimitDelay: z.number().min(1000).max(60000), // 1s to 1min
  maxRetries: z.number().min(1).max(5),
  enabledEngagements: z.array(z.enum(['like', 'retweet', 'reply', 'follow', 'quote'])),
});

// API response validation
export const apiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export const paginatedResponseSchema = z.object({
  data: z.array(z.any()),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    pages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

// Rate limiting schema
export const rateLimitSchema = z.object({
  maxRequests: z.number().min(1).max(1000),
  windowMs: z.number().min(1000).max(3600000), // 1s to 1hr
});

// Authentication schemas
export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Twitter API schemas
export const twitterCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

// Webhook schemas
export const webhookSchema = z.object({
  event: z.string(),
  data: z.object({}),
  timestamp: z.string().datetime(),
  signature: z.string(),
});

// File upload schemas
export const uploadSchema = z.object({
  file: z.any(),
  type: z.enum(['avatar', 'media']),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
});

// Notification schemas
export const notificationSchema = z.object({
  userId: z.string(),
  type: z.enum(['engagement_completed', 'credit_earned', 'post_expired', 'system_update']),
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(300),
  data: z.object({}).optional(),
  isRead: z.boolean().default(false),
});

// Error handling schema
export const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
  stack: z.string().optional(),
});

// Environment validation
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  MONGODB_URI: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXT_PUBLIC_TWITTER_CLIENT_ID: z.string().min(1),
  TWITTER_CLIENT_SECRET: z.string().min(1),
});

// Validation helper functions
export function validateEnv() {
  try {
    envSchema.parse(process.env);
  } catch (error) {
    console.error('Environment validation failed:', error);
    throw new Error('Invalid environment configuration');
  }
}

export function sanitizeInput<T>(schema: z.ZodSchema<T>, input: unknown): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Validation error: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

export function validatePagination(page: number, limit: number) {
  const result = z.object({
    page: z.number().min(1),
    limit: z.number().min(1).max(100),
  }).safeParse({ page, limit });
  
  if (!result.success) {
    return { page: 1, limit: 20 };
  }
  
  return result.data;
}