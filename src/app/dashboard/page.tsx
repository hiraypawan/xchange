'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Download, CheckCircle, ExternalLink, Chrome } from 'lucide-react';
import DashboardStats from '@/components/dashboard/stats';
import EngagementFeed from '@/components/dashboard/engagement-feed';
import RecentActivity from '@/components/dashboard/recent-activity';
import CreditBalance from '@/components/dashboard/credit-balance';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [extensionVersion, setExtensionVersion] = useState<string | null>(null);
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);

  useEffect(() => {
    fetchExtensionStatus();
  }, []);

  const fetchExtensionStatus = async () => {
    try {
      const [versionResponse, statusResponse] = await Promise.all([
        fetch('/api/extension?action=version'),
        fetch('/api/auth/extension-token', { method: 'GET' })
      ]);
      
      const versionData = await versionResponse.json();
      const statusData = await statusResponse.json();
      
      setExtensionVersion(versionData.version);
      setIsExtensionConnected(statusData.isExtensionConnected || false);
    } catch (error) {
      console.error('Failed to fetch extension status:', error);
    }
  };

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

      {/* Extension Download/Status Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 rounded-full p-3">
              <Chrome className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Xchangee Chrome Extension</h2>
              {isExtensionConnected ? (
                <div className="flex items-center gap-2 text-green-200">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">Connected & Active</span>
                </div>
              ) : (
                <p className="text-blue-100">Automate your Twitter engagement and maximize earnings</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {extensionVersion && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
                v{extensionVersion}
              </span>
            )}
            
            {isExtensionConnected ? (
              <a
                href="/auth/extension"
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Manage Extension
              </a>
            ) : (
              <div className="flex space-x-2">
                <a
                  href="/extension/download"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Extension
                </a>
                <a
                  href="/auth/extension"
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Connect Extension
                </a>
              </div>
            )}
          </div>
        </div>
        
        {!isExtensionConnected && (
          <div className="mt-4 p-3 bg-white/10 rounded-lg">
            <p className="text-sm text-blue-100">
              💡 <strong>Get started:</strong> Download the extension, install it in Chrome, then connect it to your account to start earning credits automatically!
            </p>
          </div>
        )}
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