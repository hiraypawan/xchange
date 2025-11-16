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
  Activity,
} from 'lucide-react';

export default function EngagementsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">My Engagements</h1>
        <p className="text-gray-600">Track all your engagement activities and earnings</p>
      </div>

      {/* No Engagements State */}
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Engagements Yet</h3>
        <p className="text-gray-600 mb-6">
          Start engaging with posts to see your activity here. Browse available posts to earn credits.
        </p>
        <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
          Browse Posts
        </button>
      </div>
    </div>
  );
}