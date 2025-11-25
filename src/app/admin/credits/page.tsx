'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Coins, Users, RefreshCw, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface CreditStats {
  totalUsers: number;
  totalTransactions: number;
  creditDistribution: { _id: number; count: number }[];
  usersWithZeroCredits: number;
  sampleZeroCreditsUsers: any[];
}

interface FixResult {
  success: boolean;
  message: string;
  stats: {
    totalUsers: number;
    usersFixed: number;
    creditsGiven: number;
    totalCreditsInSystem: number;
  };
}

export default function CreditAdminPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [creditStats, setCreditStats] = useState<CreditStats | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCreditStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/fix-all-credits', {
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setCreditStats(result.data);
      } else {
        setError(result.error || 'Failed to load credit stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const fixAllCredits = async () => {
    setIsLoading(true);
    setError(null);
    setFixResult(null);
    
    try {
      const response = await fetch('/api/fix-all-credits', {
        method: 'POST',
        credentials: 'include'
      });
      
      const result = await response.json();
      
      if (result.success) {
        setFixResult(result);
        // Reload stats after fix
        await loadCreditStats();
      } else {
        setError(result.error || 'Failed to fix credits');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load stats on component mount
  React.useEffect(() => {
    if (session?.user) {
      loadCreditStats();
    }
  }, [session]);

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to access the credit admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Administration</h1>
          <p className="text-gray-600">Manage user credits and fix credit-related issues</p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Refresh Stats */}
          <motion.button
            onClick={loadCreditStats}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 px-6 rounded-lg font-semibold shadow-lg transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Loading...' : 'Refresh Credit Stats'}</span>
          </motion.button>

          {/* Fix All Credits */}
          <motion.button
            onClick={fixAllCredits}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 px-6 rounded-lg font-semibold shadow-lg transition-colors"
          >
            <Coins className="h-5 w-5" />
            <span>{isLoading ? 'Fixing...' : 'Fix All Users to 2 Credits'}</span>
          </motion.button>
        </div>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-6"
          >
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        {/* Success Message */}
        {fixResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-100 border border-green-300 text-green-700 px-6 py-4 rounded-lg mb-6"
          >
            <div className="flex items-center mb-2">
              <CheckCircle className="h-6 w-6 mr-3" />
              <h3 className="text-lg font-semibold">Credit Fix Completed!</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{fixResult.stats.totalUsers}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Users Fixed</p>
                <p className="text-2xl font-bold text-green-600">{fixResult.stats.usersFixed}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Credits Given</p>
                <p className="text-2xl font-bold text-green-600">+{fixResult.stats.creditsGiven}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Total Credits</p>
                <p className="text-2xl font-bold">{fixResult.stats.totalCreditsInSystem}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Credit Stats */}
        {creditStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Total Users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{creditStats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </motion.div>

            {/* Users with Zero Credits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Users with 0 Credits</p>
                  <p className="text-3xl font-bold text-red-600">{creditStats.usersWithZeroCredits}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </motion.div>

            {/* Total Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-3xl font-bold text-green-600">{creditStats.totalTransactions}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </motion.div>

            {/* Credit Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {creditStats.creditDistribution.map((dist, index) => (
                  <div key={index} className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{dist._id || 0}</p>
                    <p className="text-sm text-gray-600">credits</p>
                    <p className="text-lg font-semibold">{dist.count}</p>
                    <p className="text-xs text-gray-500">users</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Sample Zero Credit Users */}
            {creditStats.sampleZeroCreditsUsers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-lg shadow-md p-6 md:col-span-2 lg:col-span-3"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sample Users with Zero Credits</h3>
                <div className="space-y-3">
                  {creditStats.sampleZeroCreditsUsers.slice(0, 5).map((user, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{user.username || user.displayName}</p>
                        <p className="text-sm text-gray-600">Twitter ID: {user.twitterId}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{user.credits || 0} credits</p>
                        <p className="text-xs text-gray-500">
                          Joined: {new Date(user.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}