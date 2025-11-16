'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Heart,
  Repeat2,
  MessageCircle,
  UserPlus,
  Quote,
  Plus,
  ExternalLink,
  AlertCircle,
  Check,
} from 'lucide-react';
import { isValidTweetUrl, extractTweetId, extractUsernameFromUrl } from '@/lib/utils';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { toast } from 'react-hot-toast';

const engagementTypes = [
  {
    type: 'like',
    name: 'Like',
    icon: Heart,
    description: 'Users will like your tweet',
    color: 'text-red-500 bg-red-50 border-red-200',
  },
  {
    type: 'retweet',
    name: 'Retweet',
    icon: Repeat2,
    description: 'Users will retweet your post',
    color: 'text-green-500 bg-green-50 border-green-200',
  },
  {
    type: 'reply',
    name: 'Reply',
    icon: MessageCircle,
    description: 'Users will reply to your tweet',
    color: 'text-blue-500 bg-blue-50 border-blue-200',
  },
  {
    type: 'follow',
    name: 'Follow',
    icon: UserPlus,
    description: 'Users will follow your account',
    color: 'text-purple-500 bg-purple-50 border-purple-200',
  },
  {
    type: 'quote',
    name: 'Quote Tweet',
    icon: Quote,
    description: 'Users will quote tweet your post',
    color: 'text-orange-500 bg-orange-50 border-orange-200',
  },
];

const priorities = [
  { value: 'low', name: 'Low', description: 'Standard delivery' },
  { value: 'medium', name: 'Medium', description: 'Faster delivery' },
  { value: 'high', name: 'High', description: 'Priority delivery' },
  { value: 'urgent', name: 'Urgent', description: 'Immediate delivery' },
];

export default function CreatePostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    tweetUrl: '',
    engagementType: 'like',
    maxEngagements: 10,
    priority: 'medium',
    tags: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.tweetUrl) {
      newErrors.tweetUrl = 'Tweet URL is required';
    } else if (!isValidTweetUrl(formData.tweetUrl)) {
      newErrors.tweetUrl = 'Please enter a valid Twitter/X URL';
    }

    if (formData.maxEngagements < 1 || formData.maxEngagements > 1000) {
      newErrors.maxEngagements = 'Max engagements must be between 1 and 1000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateCost = () => {
    const creditsPerPost = 10; // From environment
    return creditsPerPost * formData.maxEngagements;
  };

  const handlePreview = async () => {
    if (!formData.tweetUrl || !isValidTweetUrl(formData.tweetUrl)) {
      setErrors({ tweetUrl: 'Please enter a valid Twitter URL first' });
      return;
    }

    try {
      const tweetId = extractTweetId(formData.tweetUrl);
      const username = extractUsernameFromUrl(formData.tweetUrl);
      
      // Mock preview data (in real app, fetch from Twitter API)
      setPreview({
        id: tweetId,
        username,
        displayName: username,
        content: 'This is a preview of your tweet content...',
        avatar: null,
      });
    } catch (error) {
      toast.error('Failed to preview tweet');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetUrl: formData.tweetUrl,
          engagementType: formData.engagementType,
          maxEngagements: formData.maxEngagements,
          priority: formData.priority,
          tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Engagement post created successfully!');
        router.push('/dashboard/posts');
      } else {
        toast.error(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Create post error:', error);
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedEngagement = engagementTypes.find(e => e.type === formData.engagementType);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Engagement Post</h1>
        <p className="text-gray-600">
          Submit your tweet to get guaranteed engagement from the community
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
            {/* Tweet URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tweet URL *
              </label>
              <div className="flex space-x-2">
                <input
                  type="url"
                  value={formData.tweetUrl}
                  onChange={(e) => setFormData({ ...formData, tweetUrl: e.target.value })}
                  placeholder="https://twitter.com/username/status/123456789"
                  className={`flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                    errors.tweetUrl ? 'border-red-300' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={handlePreview}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Preview
                </button>
              </div>
              {errors.tweetUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.tweetUrl}</p>
              )}
            </div>

            {/* Tweet Preview */}
            {preview && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="flex items-center mb-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {preview.displayName[0]}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{preview.displayName}</p>
                    <p className="text-xs text-gray-500">@{preview.username}</p>
                  </div>
                  <ExternalLink className="ml-auto h-4 w-4 text-gray-400" />
                </div>
                <p className="text-gray-700 text-sm">{preview.content}</p>
              </motion.div>
            )}

            {/* Engagement Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Engagement Type *
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {engagementTypes.map((engagement) => {
                  const Icon = engagement.icon;
                  return (
                    <label
                      key={engagement.type}
                      className={`relative flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        formData.engagementType === engagement.type
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="engagementType"
                        value={engagement.type}
                        checked={formData.engagementType === engagement.type}
                        onChange={(e) => setFormData({ ...formData, engagementType: e.target.value })}
                        className="sr-only"
                      />
                      <Icon className={`h-5 w-5 mr-3 ${
                        formData.engagementType === engagement.type ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <p className={`text-sm font-medium ${
                          formData.engagementType === engagement.type ? 'text-primary-900' : 'text-gray-900'
                        }`}>
                          {engagement.name}
                        </p>
                        <p className="text-xs text-gray-500">{engagement.description}</p>
                      </div>
                      {formData.engagementType === engagement.type && (
                        <Check className="absolute top-2 right-2 h-4 w-4 text-primary-600" />
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Max Engagements */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Engagements *
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.maxEngagements}
                onChange={(e) => setFormData({ ...formData, maxEngagements: parseInt(e.target.value) })}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm ${
                  errors.maxEngagements ? 'border-red-300' : ''
                }`}
              />
              {errors.maxEngagements && (
                <p className="mt-1 text-sm text-red-600">{errors.maxEngagements}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                How many {selectedEngagement?.name.toLowerCase()}s do you want to receive?
              </p>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                {priorities.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.name} - {priority.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tech, startup, social media"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">
                Separate tags with commas to help categorize your post
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Create Post
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Engagement Type:</span>
                <span className="font-medium">{selectedEngagement?.name}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Quantity:</span>
                <span className="font-medium">{formData.maxEngagements}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Priority:</span>
                <span className="font-medium capitalize">{formData.priority}</span>
              </div>
              
              <hr className="my-3" />
              
              <div className="flex justify-between text-base font-medium">
                <span>Total Cost:</span>
                <span className="text-primary-600">{calculateCost()} credits</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 mb-1">How it works:</p>
                  <ul className="text-blue-700 space-y-1 text-xs">
                    <li>• Your tweet will be shown to community members</li>
                    <li>• Members earn 1 credit by engaging with your post</li>
                    <li>• You get guaranteed engagement within 24 hours</li>
                    <li>• Higher priority posts are shown first</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}