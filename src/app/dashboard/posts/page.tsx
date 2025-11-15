'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Plus,
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  Quote,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  MoreHorizontal,
  ExternalLink,
} from 'lucide-react';
import { formatRelativeTime, formatDate } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'react-hot-toast';

interface Post {
  _id: string;
  tweetUrl: string;
  content: string;
  engagementType: 'like' | 'retweet' | 'reply' | 'follow' | 'quote';
  creditsRequired: number;
  maxEngagements: number;
  currentEngagements: number;
  status: 'active' | 'completed' | 'expired' | 'paused';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
}

const engagementIcons = {
  like: Heart,
  retweet: Repeat2,
  reply: MessageCircle,
  follow: UserPlus,
  quote: Quote,
};

const statusConfig = {
  active: {
    color: 'text-green-600 bg-green-100',
    icon: Clock,
    label: 'Active',
  },
  completed: {
    color: 'text-blue-600 bg-blue-100',
    icon: CheckCircle,
    label: 'Completed',
  },
  expired: {
    color: 'text-red-600 bg-red-100',
    icon: XCircle,
    label: 'Expired',
  },
  paused: {
    color: 'text-yellow-600 bg-yellow-100',
    icon: Pause,
    label: 'Paused',
  },
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-400',
};

export default function MyPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const response = await fetch('/api/user/posts');
      const data = await response.json();

      if (data.success) {
        setPosts(data.data);
      } else {
        toast.error('Failed to load posts');
      }
    } catch (error) {
      console.error('Failed to load posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  });

  const stats = {
    total: posts.length,
    active: posts.filter(p => p.status === 'active').length,
    completed: posts.filter(p => p.status === 'completed').length,
    expired: posts.filter(p => p.status === 'expired').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Posts</h1>
            <p className="text-gray-600">Manage your engagement posts and track progress</p>
          </div>
          <Link
            href="/dashboard/posts/create"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Post
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-gray-400" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-900">{stats.active}</p>
              </div>
              <Clock className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Completed</p>
                <p className="text-2xl font-bold text-blue-900">{stats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Expired</p>
                <p className="text-2xl font-bold text-red-900">{stats.expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { value: 'all', label: 'All Posts' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'expired', label: 'Expired' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === option.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post, index) => {
          const EngagementIcon = engagementIcons[post.engagementType];
          const status = statusConfig[post.status];
          const StatusIcon = status.icon;
          const progress = (post.currentEngagements / post.maxEngagements) * 100;
          
          return (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-lg shadow border-l-4 ${priorityColors[post.priority]} p-6`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium">
                        <EngagementIcon className="h-4 w-4 mr-1" />
                        {post.engagementType.charAt(0).toUpperCase() + post.engagementType.slice(1)}
                      </div>
                      <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        <StatusIcon className="h-4 w-4 mr-1" />
                        {status.label}
                      </div>
                      <span className="text-sm text-gray-500 capitalize">
                        {post.priority} priority
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(post.createdAt)}
                      </span>
                      <button className="p-1 rounded-md hover:bg-gray-100">
                        <MoreHorizontal className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <p className="text-gray-700 mb-4 leading-relaxed">
                    {post.content || 'Loading tweet content...'}
                  </p>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress: {post.currentEngagements}/{post.maxEngagements} engagements</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Credits Spent</p>
                      <p className="font-medium">{post.creditsRequired * post.maxEngagements}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">{formatDate(post.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Expires</p>
                      <p className="font-medium">{formatDate(post.expiresAt)}</p>
                    </div>
                    {post.completedAt && (
                      <div>
                        <p className="text-gray-500">Completed</p>
                        <p className="font-medium">{formatDate(post.completedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <a
                  href={post.tweetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Tweet
                </a>

                <div className="flex items-center space-x-3">
                  {post.status === 'active' && (
                    <>
                      <button className="text-sm font-medium text-gray-600 hover:text-gray-900">
                        Pause
                      </button>
                      <button className="text-sm font-medium text-red-600 hover:text-red-700">
                        Cancel
                      </button>
                    </>
                  )}
                  
                  {post.status === 'paused' && (
                    <button className="text-sm font-medium text-green-600 hover:text-green-700">
                      Resume
                    </button>
                  )}
                  
                  {(post.status === 'completed' || post.status === 'expired') && (
                    <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                      View Analytics
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {filter === 'all' ? 'No posts yet' : `No ${filter} posts`}
          </h3>
          <p className="text-gray-500 mb-4">
            {filter === 'all' 
              ? 'Create your first engagement post to start getting community engagement.'
              : `You don't have any ${filter} posts at the moment.`
            }
          </p>
          {filter === 'all' && (
            <Link
              href="/dashboard/posts/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Post
            </Link>
          )}
        </div>
      )}
    </div>
  );
}