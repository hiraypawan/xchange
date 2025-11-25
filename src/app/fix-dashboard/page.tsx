'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { RefreshCw, LogOut, LogIn, CheckCircle, AlertTriangle } from 'lucide-react';

export default function FixDashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/refresh-session', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        // Force page refresh to update UI
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setError(data.error || 'Failed to refresh session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const forceSignOut = async () => {
    setIsLoading(true);
    await signOut({ redirect: false });
    setIsLoading(false);
    router.push('/');
  };

  const forceSignIn = () => {
    signIn('twitter', { callbackUrl: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Fix Dashboard Credits
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your credits are in the database but not showing on dashboard. Let's fix it!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          
          {/* Refresh Session Button */}
          <motion.button
            onClick={refreshSession}
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className={`h-5 w-5 mr-3 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Refreshing...' : 'Refresh Session Data'}
          </motion.button>

          {/* Sign Out & Sign In Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <motion.button
              onClick={forceSignOut}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </motion.button>

            <motion.button
              onClick={forceSignIn}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Sign In Fresh
            </motion.button>
          </div>

          {/* Results */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-300 rounded-md p-4"
            >
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">
                    Session Refreshed Successfully!
                  </h3>
                  <p className="text-sm text-green-700 mt-1">
                    Credits: {result.userData.credits} | Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-300 rounded-md p-4"
            >
              <div className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-300 rounded-md p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">How to Fix:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Try "Refresh Session Data" first</li>
              <li>2. If that fails, Sign Out and Sign In Fresh</li>
              <li>3. Your 2 credits will appear on dashboard</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}