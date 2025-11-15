'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  Quote,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'react-hot-toast';

interface Post {
  _id: string;
  tweetUrl: string;
  content: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  engagementType: 'like' | 'retweet' | 'reply' | 'follow' | 'quote';
  creditsRequired: number;
  maxEngagements: number;
  currentEngagements: number;
  createdAt: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const engagementIcons = {
  like: Heart,
  retweet: Repeat2,
  reply: MessageCircle,
  follow: UserPlus,
  quote: Quote,
};

const engagementColors = {
  like: 'text-red-500 bg-red-50 border-red-200',
  retweet: 'text-green-500 bg-green-50 border-green-200',
  reply: 'text-blue-500 bg-blue-50 border-blue-200',
  follow: 'text-purple-500 bg-purple-50 border-purple-200',
  quote: 'text-orange-500 bg-orange-50 border-orange-200',
};

export default function BrowsePostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    engagementType: '',
    priority: '',
    search: '',
  });
  const [engagingWith, setEngagingWith] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [filters]);

  const loadPosts = async () => {
    try {
      setRefreshing(true);
      
      const params = new URLSearchParams({
        status: 'active',
        limit: '20',
        ...(filters.engagementType && { engagementType: filters.engagementType }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.search && { query: filters.search }),
      });

      const response = await fetch(`/api/posts?${params}`);
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
      setRefreshing(false);
    }
  };

  const handleEngage = async (post: Post) => {
    if (engagingWith) return;
    
    setEngagingWith(post._id);
    
    try {
      const response = await fetch('/api/engage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: post._id,
          engagementType: post.engagementType,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`+${post.creditsRequired} credits earned!`);
        
        // Update post engagement count
        setPosts(posts.map(p => 
          p._id === post._id 
            ? { ...p, currentEngagements: p.currentEngagements + 1 }
            : p
        ));
      } else {
        toast.error(data.error || 'Failed to complete engagement');
      }
    } catch (error) {
      console.error('Engagement error:', error);
      toast.error('Failed to complete engagement');
    } finally {
      setEngagingWith(null);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (filters.engagementType && post.engagementType !== filters.engagementType) {
      return false;
    }
    if (filters.priority && post.priority !== filters.priority) {
      return false;
    }
    if (filters.search && !post.content.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    return true;
  });

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
            <h1 className="text-2xl font-bold text-gray-900">Browse Engagements</h1>
            <p className="text-gray-600">Find posts to engage with and earn credits</p>
          </div>
          <button
            onClick={() => loadPosts()}
            disabled={refreshing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3 h-full w-5 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search posts..."
                className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Engagement Type
            </label>
            <select
              value={filters.engagementType}
              onChange={(e) => setFilters({ ...filters, engagementType: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="like">Likes</option>
              <option value="retweet">Retweets</option>
              <option value="reply">Replies</option>
              <option value="follow">Follows</option>
              <option value="quote">Quote Tweets</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ engagementType: '', priority: '', search: '' })}
              className="flex items-center px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post, index) => {
          const EngagementIcon = engagementIcons[post.engagementType];
          const isEngaging = engagingWith === post._id;
          const progress = (post.currentEngagements / post.maxEngagements) * 100;
          
          return (
            <motion.div
              key={post._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Author Info */}
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                      {post.author.avatar ? (
                        <img
                          src={post.author.avatar}
                          alt={post.author.displayName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
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
                    <div className="flex items-center space-x-3">
                      <div className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-medium ${engagementColors[post.engagementType]}`}>
                        <EngagementIcon className="h-4 w-4 mr-1" />
                        {post.engagementType.charAt(0).toUpperCase() + post.engagementType.slice(1)}
                      </div>
                      <span className="text-sm text-gray-600">
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
                  onClick={() => handleEngage(post)}
                  disabled={isEngaging || post.currentEngagements >= post.maxEngagements}
                  className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                       post.engagementType === 'reply' ? 'Reply' :
                       post.engagementType === 'follow' ? 'Follow' : 'Quote'}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredPosts.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Heart className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No engagements found</h3>
          <p className="text-gray-500 mb-4">
            {filters.engagementType || filters.priority || filters.search 
              ? 'Try adjusting your filters to see more results.'
              : 'Check back later for new engagement opportunities!'
            }
          </p>
          <button
            onClick={() => setFilters({ engagementType: '', priority: '', search: '' })}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-600 bg-primary-100 hover:bg-primary-200"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}