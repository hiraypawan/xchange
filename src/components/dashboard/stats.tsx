'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  TrendingUp,
  Target,
  Clock,
  Award,
  RefreshCw,
} from 'lucide-react';
import { useRealTimeStats } from '@/hooks/use-real-time-stats';

export default function DashboardStats() {
  const { stats, isLoading, error, refetch } = useRealTimeStats();

  const statsData = [
    {
      name: 'Total Engagements',
      value: stats.totalEngagements.toLocaleString(),
      change: '--',
      changeType: 'neutral',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
    {
      name: 'Success Rate',
      value: `${stats.successRate}%`,
      change: '--',
      changeType: 'neutral',
      icon: Target,
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Completed Tasks',
      value: stats.completedEngagements.toLocaleString(),
      change: '--',
      changeType: 'neutral',
      icon: TrendingUp,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'Weekly Earnings',
      value: stats.weeklyEarnings.toLocaleString(),
      change: `${stats.weeklyChange >= 0 ? '+' : ''}${stats.weeklyChange}%`,
      changeType: stats.weeklyChange >= 0 ? 'increase' : 'decrease',
      icon: Award,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const engagementBreakdown = [
    { type: 'Likes', count: stats.engagementBreakdown.likes, icon: Heart, color: 'text-red-500' },
    { type: 'Retweets', count: stats.engagementBreakdown.retweets, icon: Repeat2, color: 'text-green-500' },
    { type: 'Replies', count: stats.engagementBreakdown.replies, icon: MessageCircle, color: 'text-blue-500' },
    { type: 'Follows', count: stats.engagementBreakdown.follows, icon: UserPlus, color: 'text-purple-500' },
  ];
  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Stats</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={refetch}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Stats */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Performance Overview</h3>
            <button
              onClick={refetch}
              className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {statsData.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center"
                >
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <div className="flex items-baseline">
                      <p className="text-2xl font-semibold text-gray-900">
                        {isLoading ? '...' : stat.value}
                      </p>
                      {stat.change !== '--' && !isLoading && (
                        <p
                          className={`ml-2 text-sm font-medium ${
                            stat.changeType === 'increase' ? 'text-green-600' : 
                            stat.changeType === 'decrease' ? 'text-red-600' : 'text-gray-500'
                          }`}
                        >
                          {stat.change}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Engagement Breakdown */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Engagement Breakdown</h3>
          <div className="space-y-4">
            {engagementBreakdown.map((engagement, index) => {
              const Icon = engagement.icon;
              const total = engagementBreakdown.reduce((sum, item) => sum + item.count, 0);
              const percentage = total > 0 ? ((engagement.count / total) * 100).toFixed(1) : '0.0';
              
              return (
                <motion.div
                  key={engagement.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Icon className={`h-5 w-5 ${engagement.color} mr-3`} />
                    <span className="text-sm font-medium text-gray-900">
                      {engagement.type}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {isLoading ? '...' : engagement.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isLoading ? '...' : `${percentage}%`}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Bars */}
          <div className="mt-6 space-y-3">
            {engagementBreakdown.map((engagement, index) => {
              const total = engagementBreakdown.reduce((sum, item) => sum + item.count, 0);
              const percentage = total > 0 ? (engagement.count / total) * 100 : 0;
              
              return (
                <div key={engagement.type} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{engagement.type}</span>
                    <span>{isLoading ? '...' : `${percentage.toFixed(1)}%`}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: isLoading ? '0%' : `${percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {stats.totalEngagements === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-6">
              <p className="text-sm">No engagement data yet.</p>
              <p className="text-xs">Start engaging to see your breakdown!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}