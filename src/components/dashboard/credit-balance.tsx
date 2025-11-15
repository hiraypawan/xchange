'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, TrendingDown, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useRealTimeStats } from '@/hooks/use-real-time-stats';

export default function CreditBalance() {
  const { data: session } = useSession();
  const { stats, isLoading, error, refetch } = useRealTimeStats();

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-lg shadow-lg text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium mb-2">Error Loading Credits</h3>
            <p className="text-red-100">{error}</p>
          </div>
          <button
            onClick={refetch}
            className="flex items-center px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg shadow-lg text-white p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Main Balance */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <Coins className="h-6 w-6 mr-2" />
              <h3 className="text-lg font-medium">Available Credits</h3>
            </div>
            {!isLoading && (
              <button
                onClick={refetch}
                className="flex items-center px-2 py-1 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-xs transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold mb-2"
          >
            {isLoading ? '...' : (stats?.credits || 0).toLocaleString()}
          </motion.div>
          <div className="flex items-center text-primary-100">
            {(stats?.weeklyChange || 0) >= 0 ? (
              <TrendingUp className="h-4 w-4 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 mr-1" />
            )}
            <span className="text-sm">
              {isLoading ? 'Loading...' : `${(stats?.weeklyChange || 0) >= 0 ? '+' : ''}${stats?.weeklyChange || 0}% this week`}
            </span>
          </div>
        </div>

        {/* Today's Activity */}
        <div>
          <h4 className="text-primary-100 text-sm font-medium mb-2">Today's Activity</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Earned</span>
              <span className="font-semibold text-green-200">
                {isLoading ? '...' : `+${stats?.todayEarned || 0}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Spent</span>
              <span className="font-semibold text-red-200">
                {isLoading ? '...' : `-${stats?.todaySpent || 0}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-primary-500">
              <span className="text-sm font-medium">Net</span>
              <span className="font-bold text-white">
                {isLoading ? '...' : `${(stats?.todayEarned || 0) - (stats?.todaySpent || 0) >= 0 ? '+' : ''}${(stats?.todayEarned || 0) - (stats?.todaySpent || 0)}`}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h4 className="text-primary-100 text-sm font-medium mb-3">Quick Actions</h4>
          <div className="space-y-2">
            <Link
              href="/dashboard/posts/create"
              className="flex items-center justify-center w-full px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Link>
            <Link
              href="/dashboard/browse"
              className="flex items-center justify-center w-full px-3 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md text-sm font-medium transition-colors"
            >
              Browse Posts
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}