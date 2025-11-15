'use client';

import { useEffect, useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Chrome, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

export default function ExtensionAuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [authStep, setAuthStep] = useState<'signin' | 'connecting' | 'success' | 'error'>('signin');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (session?.user) {
      handleExtensionAuth();
    }
  }, [session, status]);

  const handleExtensionAuth = async () => {
    try {
      setAuthStep('connecting');
      
      // Generate auth token for extension
      // First test if session is working
      const sessionTest = await fetch('/api/test-session', {
        method: 'GET',
        credentials: 'include',
      });
      const sessionData = await sessionTest.json();
      console.log('Session test result:', sessionData);

      const response = await fetch('/api/auth/extension-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // Send auth data to extension via postMessage
        const authData = {
          type: 'EXTENSION_AUTH_SUCCESS',
          authToken: data.token,
          userId: data.userId,
          userData: {
            id: session?.user?.id,
            username: session?.user?.username,
            displayName: session?.user?.name,
            avatar: session?.user?.image,
            credits: data.credits || 0,
            email: session?.user?.email,
          }
        };

        // Try to send to extension
        window.postMessage(authData, '*');
        
        // Also try to communicate with any open extension tabs
        if ((window as any).chrome && (window as any).chrome.runtime) {
          try {
            (window as any).chrome.runtime.sendMessage(authData);
          } catch (e) {
            // Extension might not be installed or available
            console.log('Extension communication via chrome.runtime failed, using postMessage');
          }
        }

        setAuthStep('success');
        
        // Auto-redirect after 3 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 3000);

      } else {
        throw new Error('Failed to generate extension token');
      }

    } catch (error) {
      console.error('Extension auth failed:', error);
      setAuthStep('error');
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  const handleSignIn = () => {
    signIn('twitter', { callbackUrl: '/auth/extension' });
  };

  const handleRetry = () => {
    setAuthStep('signin');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Chrome className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Connect Xchangee Extension
          </h1>
          <p className="text-gray-600">
            Sign in to link your extension with your Xchangee account
          </p>
        </div>

        {/* Sign In Step */}
        {authStep === 'signin' && (
          <div className="space-y-6">
            {!session ? (
              <>
                <div className="text-center">
                  <p className="text-gray-700 mb-6">
                    Sign in with your X/Twitter account to enable automatic engagement and credit earning.
                  </p>
                </div>
                
                <button
                  onClick={handleSignIn}
                  className="w-full bg-black text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Sign in with X
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-green-600 font-medium">Already signed in as {session.user?.name}</p>
                <button
                  onClick={handleExtensionAuth}
                  className="mt-4 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Connect Extension
                </button>
              </div>
            )}
          </div>
        )}

        {/* Connecting Step */}
        {authStep === 'connecting' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-semibold text-gray-900">Connecting Extension...</h3>
            <p className="text-gray-600">
              Setting up your extension authentication and syncing your account data.
            </p>
          </div>
        )}

        {/* Success Step */}
        {authStep === 'success' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-600">Extension Connected!</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm mb-2">
                <strong>✅ Your extension is now connected and ready!</strong>
              </p>
              <ul className="text-green-700 text-sm space-y-1">
                <li>• Automatic engagement enabled</li>
                <li>• Credit earning activated</li>
                <li>• Real-time sync with dashboard</li>
              </ul>
            </div>
            <p className="text-gray-600 text-sm">
              You can close this tab and start using the extension. Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Error Step */}
        {authStep === 'error' && (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-red-600">Connection Failed</h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">
                {errorMessage || 'Unable to connect your extension. Please try again.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Back to Dashboard */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}