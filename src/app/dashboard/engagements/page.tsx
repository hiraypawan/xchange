'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

export default function EngagementsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Engagements</h1>
        <p className="text-gray-600">Track all your engagement activities and earnings</p>
      </div>

      {/* Mock engagements */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Heart className="h-5 w-5 text-red-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Liked a tweet by @username
                  </p>
                  <p className="text-xs text-gray-500">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <span className="text-sm font-medium text-green-600">+1 credit</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}