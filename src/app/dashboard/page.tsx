'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import DashboardStats from '@/components/dashboard/stats';
import EngagementFeed from '@/components/dashboard/engagement-feed';
import RecentActivity from '@/components/dashboard/recent-activity';
import CreditBalance from '@/components/dashboard/credit-balance';

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome back, {session?.user?.name || session?.user?.username}!
        </h1>
        <p className="text-gray-600">
          Here's your engagement activity and earning opportunities.
        </p>
      </div>

      {/* Credit Balance */}
      <CreditBalance />

      {/* Dashboard Stats */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Feed */}
        <div className="lg:col-span-2">
          <EngagementFeed />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}