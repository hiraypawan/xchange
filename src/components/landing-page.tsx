'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { 
  Heart, 
  Repeat2, 
  MessageCircle, 
  UserPlus, 
  Quote,
  Zap,
  Shield,
  TrendingUp,
  Users,
  Star,
  ArrowRight,
  Play,
  Download,
  Chrome
} from 'lucide-react';

export default function LandingPage() {
  const handleSignIn = () => {
    signIn('twitter', { callbackUrl: '/dashboard' });
  };

  const handleDownloadExtension = async () => {
    try {
      const response = await fetch('/api/extension?action=download');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'xchangee-extension.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const features = [
    {
      icon: Heart,
      title: 'Like Posts',
      description: 'Earn credits by liking tweets from other users',
      color: 'text-red-500'
    },
    {
      icon: Repeat2,
      title: 'Retweet Content',
      description: 'Share tweets and earn credits for each retweet',
      color: 'text-green-500'
    },
    {
      icon: MessageCircle,
      title: 'Reply to Tweets',
      description: 'Engage with meaningful replies and earn rewards',
      color: 'text-blue-500'
    },
    {
      icon: UserPlus,
      title: 'Follow Users',
      description: 'Follow accounts and get credited for growing networks',
      color: 'text-purple-500'
    },
  ];

  const benefits = [
    {
      icon: Zap,
      title: 'Automated Engagement',
      description: 'Use our Chrome extension to automate your engagement activities'
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Twitter OAuth 2.0 authentication with enterprise-level security'
    },
    {
      icon: TrendingUp,
      title: 'Boost Your Reach',
      description: 'Get guaranteed engagement on your content to increase visibility'
    },
    {
      icon: Users,
      title: 'Active Community',
      description: 'Join thousands of users exchanging authentic engagement'
    },
  ];

  const steps = [
    {
      step: '01',
      title: 'Sign Up with Twitter',
      description: 'Connect your Twitter account and get 100 free credits to start'
    },
    {
      step: '02',
      title: 'Browse & Engage',
      description: 'Find tweets to engage with and earn credits for each action'
    },
    {
      step: '03',
      title: 'Post Your Content',
      description: 'Spend credits to get guaranteed engagement on your tweets'
    },
    {
      step: '04',
      title: 'Watch Growth',
      description: 'See your engagement and follower count grow organically'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center"
            >
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold text-gray-900">Xchangee</span>
            </motion.div>
            
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={handleSignIn}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <span>Sign in with Twitter</span>
              <ArrowRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-gray-900 mb-6"
            >
              Grow Your Twitter
              <span className="text-primary-600"> Engagement</span>
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto"
            >
              Join the credit-based engagement platform where you earn by engaging with others 
              and spend to boost your own content. Real engagement, real growth.
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <button
                onClick={handleSignIn}
                className="bg-primary-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary-700 transition-colors flex items-center gap-2 min-w-[200px]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="h-5 w-5" />
              </button>
              
              <button className="border border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2">
                <Play className="h-5 w-5" />
                <span>Watch Demo</span>
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-12 flex items-center justify-center gap-8 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span>2 Free Credits</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-500" />
                <span>Secure OAuth</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span>Active Community</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Engagement Types You Can Earn From
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600 max-w-2xl mx-auto"
            >
              Multiple ways to earn credits by engaging with the Twitter community
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              How Xchangee Works
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-gray-600"
            >
              Simple steps to start growing your Twitter presence
            </motion.p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-primary-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Chrome Extension Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white mb-12">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold mb-4"
            >
              Supercharge with Our Chrome Extension
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-xl text-blue-100 max-w-2xl mx-auto"
            >
              Automate your Twitter engagement and earn credits while browsing. 
              No manual work required - let our extension do the work for you!
            </motion.p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Features List */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {[
                {
                  icon: Zap,
                  title: 'Auto-Engagement',
                  description: 'Automatically like, retweet, and engage with posts while you browse Twitter'
                },
                {
                  icon: Shield,
                  title: 'Safe & Smart',
                  description: 'Intelligent rate limiting and human-like behavior to keep your account safe'
                },
                {
                  icon: TrendingUp,
                  title: 'Real-time Sync',
                  description: 'Earnings sync instantly with your dashboard - see credits roll in live'
                },
                {
                  icon: Star,
                  title: 'Auto-Updates',
                  description: 'Extension automatically updates with new features and improvements'
                }
              ].map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.title} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">{feature.title}</h3>
                      <p className="text-blue-100">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </motion.div>

            {/* Download CTA */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-center lg:text-left"
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="flex justify-center lg:justify-start mb-6">
                  <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center">
                    <Chrome className="h-12 w-12 text-blue-600" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  Download for Chrome
                </h3>
                
                <p className="text-blue-100 mb-6">
                  Install our extension and start earning credits automatically. 
                  Compatible with Chrome and all Chromium-based browsers.
                </p>
                
                <button
                  onClick={handleDownloadExtension}
                  className="w-full bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 mb-4"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Extension</span>
                </button>
                
                <p className="text-sm text-blue-200">
                  Free • Auto-updates • Safe & Secure
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-gray-900 mb-4"
            >
              Why Choose Xchangee?
            </motion.h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-4"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Ready to Grow Your Twitter?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-blue-100 mb-8"
          >
            Join thousands of users already growing their engagement with Xchangee
          </motion.p>
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            onClick={handleSignIn}
            className="bg-white text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto"
          >
            <span>Start for Free Today</span>
            <ArrowRight className="h-5 w-5" />
          </motion.button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <span className="ml-3 text-2xl font-bold">Xchangee</span>
            </div>
            <p className="text-gray-400 mb-4">
              The credit-based engagement platform for Twitter growth
            </p>
            <p className="text-sm text-gray-500">
              © 2024 Xchangee. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}