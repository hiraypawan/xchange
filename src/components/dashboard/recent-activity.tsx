'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Minus,
  CheckCircle,
  XCircle,
  Clock,
  Award,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'earn' | 'spend' | 'bonus' | 'refund';
  amount: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: {
    engagementType?: string;
    tweetId?: string;
  };
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'earn',
    amount: 1,
    description: 'Liked a tweet',
    timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    status: 'completed',
    metadata: { engagementType: 'like' },
  },
  {
    id: '2',
    type: 'spend',
    amount: 10,
    description: 'Created engagement post',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    status: 'completed',
  },
  {
    id: '3',
    type: 'earn',
    amount: 1,
    description: 'Retweeted a post',
    timestamp: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    status: 'completed',
    metadata: { engagementType: 'retweet' },
  },
  {
    id: '4',
    type: 'bonus',
    amount: 5,
    description: 'Daily login bonus',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: 'completed',
  },
  {
    id: '5',
    type: 'earn',
    amount: 1,
    description: 'Followed an account',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    metadata: { engagementType: 'follow' },
  },
];

const typeConfig = {
  earn: {
    icon: Plus,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    prefix: '+',
  },
  spend: {
    icon: Minus,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    prefix: '-',
  },
  bonus: {
    icon: Award,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    prefix: '+',
  },
  refund: {
    icon: Plus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    prefix: '+',
  },
};

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-500',
  },
  pending: {
    icon: Clock,
    color: 'text-yellow-500',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-500',
  },
};

export default function RecentActivity() {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-600 mt-1">Your latest credit transactions</p>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {mockActivities.map((activity, index) => {
            const typeInfo = typeConfig[activity.type];
            const statusInfo = statusConfig[activity.status];
            const TypeIcon = typeInfo.icon;
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className={`w-10 h-10 ${typeInfo.bgColor} rounded-full flex items-center justify-center`}>
                    <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                  </div>
                  
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <div className="flex items-center mt-1">
                      <StatusIcon className={`h-3 w-3 ${statusInfo.color} mr-1`} />
                      <span className="text-xs text-gray-500">
                        {formatRelativeTime(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm font-semibold ${typeInfo.color}`}>
                    {typeInfo.prefix}{activity.amount}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">
                    {activity.status}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* View All Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button className="w-full text-center text-sm font-medium text-primary-600 hover:text-primary-500 transition-colors">
            View all transactions
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-semibold text-gray-900">24</p>
            <p className="text-xs text-gray-600">Today</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">156</p>
            <p className="text-xs text-gray-600">This Week</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">1,247</p>
            <p className="text-xs text-gray-600">All Time</p>
          </div>
        </div>
      </div>
    </div>
  );
}