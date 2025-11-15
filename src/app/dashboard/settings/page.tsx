'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Save, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    autoEngage: false,
    maxEngagementsPerDay: 50,
    rateLimitDelay: 3,
    emailNotifications: true,
    pushNotifications: true,
    enabledEngagements: {
      like: true,
      retweet: true,
      reply: true,
      follow: true,
      quote: true,
    },
    workingHours: {
      enabled: false,
      start: 9,
      end: 18,
    },
  });

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Configure your engagement preferences and automation settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Automation Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Automation Settings</h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto-engage</p>
                  <p className="text-xs text-gray-500">Automatically engage with available posts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoEngage}
                    onChange={(e) => setSettings({...settings, autoEngage: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Engagements Per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.maxEngagementsPerDay}
                  onChange={(e) => setSettings({...settings, maxEngagementsPerDay: parseInt(e.target.value)})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Limit daily automatic engagements to avoid rate limits
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rate Limit Delay (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.rateLimitDelay}
                  onChange={(e) => setSettings({...settings, rateLimitDelay: parseInt(e.target.value)})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Time between automatic engagements
                </p>
              </div>
            </div>
          </div>

          {/* Engagement Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enabled Engagement Types</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.enabledEngagements).map(([type, enabled]) => (
                <div key={type} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      enabledEngagements: {
                        ...settings.enabledEngagements,
                        [type]: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 text-sm font-medium text-gray-900 capitalize">
                    {type}s
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Working Hours</h3>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.workingHours.enabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    workingHours: {
                      ...settings.workingHours,
                      enabled: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm font-medium text-gray-900">
                  Only engage during working hours
                </label>
              </div>

              {settings.workingHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Hour
                    </label>
                    <select
                      value={settings.workingHours.start}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: {
                          ...settings.workingHours,
                          start: parseInt(e.target.value)
                        }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i}>{i}:00</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Hour
                    </label>
                    <select
                      value={settings.workingHours.end}
                      onChange={(e) => setSettings({
                        ...settings,
                        workingHours: {
                          ...settings.workingHours,
                          end: parseInt(e.target.value)
                        }
                      })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                    >
                      {Array.from({length: 24}, (_, i) => (
                        <option key={i} value={i}>{i}:00</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Important</h3>
                <div className="mt-1 text-sm text-yellow-700">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Auto-engage respects Twitter rate limits</li>
                    <li>Lower delays reduce risk of restrictions</li>
                    <li>Working hours help maintain natural patterns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Today's Engagements</span>
                <span className="font-medium">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate</span>
                <span className="font-medium">94.2%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Auto Status</span>
                <span className={`font-medium ${settings.autoEngage ? 'text-green-600' : 'text-gray-600'}`}>
                  {settings.autoEngage ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}