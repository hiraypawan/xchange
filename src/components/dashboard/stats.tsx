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
} from 'lucide-react';

const stats = [
  {
    name: 'Total Engagements',
    value: '2,847',
    change: '+12.3%',
    changeType: 'increase',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
  },
  {
    name: 'Success Rate',
    value: '94.2%',
    change: '+2.1%',
    changeType: 'increase',
    icon: Target,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
  },
  {
    name: 'Active Posts',
    value: '23',
    change: '+5',
    changeType: 'increase',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    name: 'Weekly Earnings',
    value: '1,247',
    change: '+18.7%',
    changeType: 'increase',
    icon: Award,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
];

const engagementBreakdown = [
  { type: 'Likes', count: 1247, icon: Heart, color: 'text-red-500' },
  { type: 'Retweets', count: 892, icon: Repeat2, color: 'text-green-500' },
  { type: 'Replies', count: 456, icon: MessageCircle, color: 'text-blue-500' },
  { type: 'Follows', count: 252, icon: UserPlus, color: 'text-purple-500' },
];

export default function DashboardStats() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Stats */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stats.map((stat, index) => {
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
                      <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                      <p
                        className={`ml-2 text-sm font-medium ${
                          stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </p>
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
              const percentage = ((engagement.count / total) * 100).toFixed(1);
              
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
                      {engagement.count.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{percentage}%</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Progress Bars */}
          <div className="mt-6 space-y-3">
            {engagementBreakdown.map((engagement, index) => {
              const total = engagementBreakdown.reduce((sum, item) => sum + item.count, 0);
              const percentage = (engagement.count / total) * 100;
              
              return (
                <div key={engagement.type} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{engagement.type}</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
                      className="h-2 rounded-full bg-gradient-to-r from-primary-500 to-primary-600"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}