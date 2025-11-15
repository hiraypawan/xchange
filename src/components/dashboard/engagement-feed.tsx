'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  Clock,
  Zap,
  ExternalLink,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';

interface Post {
  _id: string;
  tweetUrl: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  engagementType: 'like' | 'retweet' | 'reply' | 'follow';
  creditsRequired: number;
  maxEngagements: number;
  currentEngagements: number;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const mockPosts: Post[] = [];

const engagementIcons = {
  like: Heart,
  retweet: Repeat2,
  reply: MessageCircle,
  follow: UserPlus,
};

const engagementColors = {
  like: 'text-red-500 bg-red-50 border-red-200',
  retweet: 'text-green-500 bg-green-50 border-green-200',
  reply: 'text-blue-500 bg-blue-50 border-blue-200',
  follow: 'text-purple-500 bg-purple-50 border-purple-200',
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-400',
};

export default function EngagementFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagingWith, setEngagingWith] = useState<string | null>(null);

  useEffect(() => {
    // Load real posts from API
    setPosts(mockPosts);
    setLoading(false);
  }, []);

  const handleEngage = async (postId: string, engagementType: string) => {
    setEngagingWith(postId);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update post engagement count
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, currentEngagements: post.currentEngagements + 1 }
          : post
      ));
      
      // Show success message
      // toast.success('Engagement completed! +1 credit earned');
      
    } catch (error) {
      // toast.error('Failed to complete engagement');
    } finally {
      setEngagingWith(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Engagements</h2>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Available Engagements</h2>
          <div className="flex items-center text-sm text-gray-500">
            <Clock className="h-4 w-4 mr-1" />
            Last updated: just now
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        {posts.map((post, index) => {
          const EngagementIcon = engagementIcons[post.engagementType];
          const isEngaging = engagingWith === post._id;
          const progress = (post.currentEngagements / post.maxEngagements) * 100;
          
          return (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`p-6 border-l-4 ${priorityColors[post.priority]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Author Info */}
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                      {post.author.avatar ? (
                        <img
                          src={post.author.avatar}
                          alt={post.author.displayName}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-600">
                            {post.author.displayName[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">
                        {post.author.displayName}
                      </p>
                      <p className="text-xs text-gray-500">@{post.author.username}</p>
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      {formatRelativeTime(post.createdAt)}
                    </div>
                  </div>

                  {/* Tweet Content */}
                  <p className="text-gray-700 mb-3 leading-relaxed">{post.content}</p>

                  {/* Engagement Type & Progress */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${engagementColors[post.engagementType]}`}>
                        <EngagementIcon className="h-3 w-3 mr-1" />
                        {post.engagementType.charAt(0).toUpperCase() + post.engagementType.slice(1)}
                      </div>
                      <span className="ml-3 text-sm text-gray-600">
                        {post.currentEngagements}/{post.maxEngagements} completed
                      </span>
                    </div>
                    
                    <div className="flex items-center text-sm text-green-600 font-medium">
                      <Zap className="h-4 w-4 mr-1" />
                      +{post.creditsRequired} credit{post.creditsRequired !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <a
                  href={post.tweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Tweet
                </a>

                <button
                  onClick={() => handleEngage(post._id, post.engagementType)}
                  disabled={isEngaging || post.currentEngagements >= post.maxEngagements}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEngaging ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Engaging...
                    </>
                  ) : (
                    <>
                      <EngagementIcon className="h-4 w-4 mr-2" />
                      {post.engagementType === 'like' ? 'Like' :
                       post.engagementType === 'retweet' ? 'Retweet' :
                       post.engagementType === 'reply' ? 'Reply' : 'Follow'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {posts.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No engagements available</h3>
          <p className="text-gray-500">Check back later for new engagement opportunities!</p>
        </div>
      )}
    </div>
  );
}