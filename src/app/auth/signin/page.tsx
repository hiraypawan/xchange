'use client';

import React from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Twitter } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSignIn = async () => {
    try {
      const result = await signIn('twitter', { 
        callbackUrl: '/dashboard',
        redirect: true 
      });
    } catch (error) {
      console.error('Sign in error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Xchangee
          </h1>
          <p className="text-gray-600 mb-8">
            Sign in with Twitter to start earning credits through engagement
          </p>

          {/* Sign In Button */}
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-twitter hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Twitter className="h-5 w-5 mr-3" />
            Continue with Twitter
          </button>

          {/* Features */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              Get 100 free credits to start
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              Earn credits by engaging with tweets
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              Spend credits to boost your content
            </div>
          </div>

          {/* Terms */}
          <p className="mt-6 text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </div>
  );
}