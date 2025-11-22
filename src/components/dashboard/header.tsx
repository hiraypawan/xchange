'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Search, Plus, Download, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRealTimeStats } from '@/hooks/use-real-time-stats';

export default function DashboardHeader() {
  const { data: session } = useSession();
  const { stats, isLoading: isLoadingStats } = useRealTimeStats();
  const [extensionStatus, setExtensionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [showExtensionDropdown, setShowExtensionDropdown] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  useEffect(() => {
    checkExtensionStatus();
    fetchLatestVersionInfo();
    const interval = setInterval(() => {
      checkExtensionStatus();
      fetchLatestVersionInfo();
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLatestVersionInfo = async () => {
    try {
      const response = await fetch('/api/extension?action=version');
      if (response.ok) {
        const data = await response.json();
        setUpdateInfo(data);
      }
    } catch (error) {
      console.error('Failed to fetch version info:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-extension-dropdown]')) {
        setShowExtensionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkExtensionStatus = async () => {
    try {
      // Check if extension is installed and authenticated by listening for heartbeat
      const extensionCheck = new Promise<{isInstalled: boolean, isAuthenticated: boolean}>((resolve) => {
        const timeout = setTimeout(() => resolve({isInstalled: false, isAuthenticated: false}), 2000);
        
        let heartbeatReceived = false;
        
        const handler = (event: MessageEvent) => {
          if (event.data?.type === 'XCHANGEE_EXTENSION_RESPONSE' && event.data?.source === 'extension') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            heartbeatReceived = true;
            resolve({
              isInstalled: true, 
              isAuthenticated: event.data.isAuthenticated || false
            });
          }
          
          // Also listen for heartbeat messages which include auth status
          if (event.data?.type === 'XCHANGEE_EXTENSION_HEARTBEAT' && event.data?.source === 'extension') {
            clearTimeout(timeout);
            window.removeEventListener('message', handler);
            heartbeatReceived = true;
            resolve({
              isInstalled: true,
              isAuthenticated: event.data.isAuthenticated || false
            });
          }
        };
        
        window.addEventListener('message', handler);
        window.postMessage({ type: 'XCHANGEE_EXTENSION_CHECK', source: 'website' }, '*');
      });

      const extensionStatus = await extensionCheck;
      const isConnected = extensionStatus.isInstalled && extensionStatus.isAuthenticated;
      
      setExtensionStatus(isConnected ? 'connected' : 'disconnected');
      
      console.log('Extension status check:', {
        isInstalled: extensionStatus.isInstalled,
        isAuthenticated: extensionStatus.isAuthenticated,
        isConnected
      });
    } catch (error) {
      console.error('Extension check failed:', error);
      setExtensionStatus('disconnected');
    }
  };

  useEffect(() => {
    // Listen for extension heartbeat messages
    const handleExtensionMessage = (event: MessageEvent) => {
      // Filter out noise from other extensions
      if (!event.data?.type?.includes('XCHANGEE') && !event.data?.source) {
        return;
      }
      console.log('Website received message:', event.data);
      
      if (event.data?.type === 'XCHANGEE_EXTENSION_HEARTBEAT' && event.data?.source === 'extension') {
        const isAuthenticated = event.data.isAuthenticated || false;
        console.log('Heartbeat received - authenticated:', isAuthenticated);
        
        setExtensionStatus(isAuthenticated ? 'connected' : 'disconnected');
        if (event.data.version) {
          setExtensionVersion(event.data.version);
        }
      }
      
      if (event.data?.type === 'XCHANGEE_EXTENSION_RESPONSE' && event.data?.source === 'extension') {
        const isAuthenticated = event.data.isAuthenticated || false;
        console.log('Extension response - authenticated:', isAuthenticated);
        
        setExtensionStatus(isAuthenticated ? 'connected' : 'disconnected');
        if (event.data.version) {
          setExtensionVersion(event.data.version);
        }
      }
    };

    window.addEventListener('message', handleExtensionMessage);
    return () => window.removeEventListener('message', handleExtensionMessage);
  }, []);

  const handleDownloadExtension = async () => {
    try {
      // First get the latest version info
      const versionResponse = await fetch('/api/extension?action=version', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      let latestVersion = 'latest';
      if (versionResponse.ok) {
        const versionData = await versionResponse.json();
        latestVersion = versionData.version;
      }
      
      // Always get the latest extension version dynamically
      const response = await fetch('/api/extension?action=download', {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `xchangee-extension-v${latestVersion}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        console.log(`Downloaded latest Xchangee extension v${latestVersion}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getExtensionStatusIcon = () => {
    switch (extensionStatus) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 border-t-primary-500 rounded-full animate-spin" />;
    }
  };

  const getExtensionStatusText = () => {
    switch (extensionStatus) {
      case 'connected':
        return 'Extension Connected';
      case 'disconnected':
        return 'Extension Not Found';
      default:
        return 'Checking...';
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Search */}
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search posts, users, or engagements..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-4">
            {/* Create Post Button */}
            <Link
              href="/dashboard/posts/create"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Post
            </Link>

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded-md">
              <Bell className="h-6 w-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </button>

            {/* Extension Status */}
            <div className="relative" data-extension-dropdown>
              <button
                onClick={() => setShowExtensionDropdown(!showExtensionDropdown)}
                className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                {getExtensionStatusIcon()}
                <span className="text-sm font-medium text-gray-700 hidden sm:block">
                  {getExtensionStatusText()}
                </span>
              </button>

              {/* Extension Dropdown */}
              {showExtensionDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      {getExtensionStatusIcon()}
                      <span className="font-medium text-gray-900">{getExtensionStatusText()}</span>
                    </div>
                    
                    {extensionStatus === 'disconnected' && (
                      <>
                        <p className="text-sm text-gray-600 mb-3">
                          Install our Chrome extension to automate engagements and earn credits while browsing Twitter.
                        </p>
                        <button
                          onClick={handleDownloadExtension}
                          className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Extension</span>
                        </button>
                      </>
                    )}
                    
                    {extensionStatus === 'connected' && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-green-600 font-medium">
                            Extension Active
                          </p>
                          {extensionVersion && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              v{extensionVersion}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600">
                          ✨ Auto-updates every 10 seconds • Earning credits while browsing Twitter
                        </p>
                        
                        {updateInfo && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <h4 className="text-sm font-medium text-blue-900 mb-1">
                              🚀 Latest Update (v{updateInfo.version})
                            </h4>
                            <p className="text-xs text-blue-700 mb-2">
                              {updateInfo.releaseNotes}
                            </p>
                            {updateInfo.features && (
                              <ul className="text-xs text-blue-600 space-y-1">
                                {updateInfo.features.slice(0, 3).map((feature: string, index: number) => (
                                  <li key={index} className="flex items-start">
                                    <span className="mr-1">•</span>
                                    <span>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Credits Display */}
            <div className="flex items-center space-x-2 bg-primary-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-sm font-medium text-primary-700">
                {isLoadingStats ? 'Loading...' : `${stats?.credits || 0} credits`}
              </span>
            </div>

            {/* User Avatar */}
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || 'User'}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-600">
                      {session?.user?.name?.[0] || session?.user?.username?.[0] || 'U'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}