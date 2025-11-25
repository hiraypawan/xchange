'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function AdminCleanupPage() {
  const { data: session, status } = useSession();
  const [cleanupResult, setCleanupResult] = useState<any>(null);
  const [indexResult, setIndexResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check if user is admin (you may want to update this logic)
  const isAdmin = session?.user?.email?.toLowerCase().includes('pawan') || 
                  session?.user?.name?.toLowerCase().includes('pawan hiray');

  const runCleanup = async () => {
    setLoading('cleanup');
    try {
      const response = await fetch('/api/admin/manual-cleanup', {
        method: 'POST',
      });
      const result = await response.json();
      setCleanupResult(result);
    } catch (error) {
      setCleanupResult({ success: false, error: 'Failed to run cleanup' });
    }
    setLoading(null);
  };

  const resetIndexes = async () => {
    setLoading('indexes');
    try {
      const response = await fetch('/api/admin/reset-indexes', {
        method: 'POST',
      });
      const result = await response.json();
      setIndexResult(result);
    } catch (error) {
      setIndexResult({ success: false, error: 'Failed to reset indexes' });
    }
    setLoading(null);
  };

  const previewCleanup = async () => {
    setLoading('preview');
    try {
      const response = await fetch('/api/admin/manual-cleanup', {
        method: 'GET',
      });
      const result = await response.json();
      setPreviewResult(result);
    } catch (error) {
      setPreviewResult({ success: false, error: 'Failed to preview cleanup' });
    }
    setLoading(null);
  };

  const checkIndexes = async () => {
    setLoading('check-indexes');
    try {
      const response = await fetch('/api/admin/reset-indexes', {
        method: 'GET',
      });
      const result = await response.json();
      setIndexResult(result);
    } catch (error) {
      setIndexResult({ success: false, error: 'Failed to check indexes' });
    }
    setLoading(null);
  };

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
        <p>Please sign in to access this page.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
        <p>You don't have admin access to this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔧 User Duplicate Cleanup Dashboard
          </h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Database Cleanup Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-blue-900 mb-4">
                📊 Database Cleanup
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={previewCleanup}
                  disabled={loading === 'preview'}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading === 'preview' ? 'Analyzing...' : '🔍 Preview Cleanup'}
                </button>
                
                <button
                  onClick={runCleanup}
                  disabled={loading === 'cleanup'}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading === 'cleanup' ? 'Cleaning...' : '🧹 Run Cleanup'}
                </button>
              </div>
              
              {previewResult && (
                <div className="mt-4 p-4 bg-white rounded border">
                  <h3 className="font-semibold mb-2">Preview Results:</h3>
                  {previewResult.success ? (
                    <div className="text-sm space-y-1">
                      <p>📊 Total users: {previewResult.preview.totalUsers}</p>
                      <p>🔍 Duplicate groups: {previewResult.preview.duplicateGroups}</p>
                      <p>❌ Would remove: {previewResult.preview.wouldRemove} users</p>
                      <p>✅ Would keep: {previewResult.preview.wouldKeep} users</p>
                    </div>
                  ) : (
                    <p className="text-red-600">❌ {previewResult.error}</p>
                  )}
                </div>
              )}
              
              {cleanupResult && (
                <div className="mt-4 p-4 bg-white rounded border">
                  <h3 className="font-semibold mb-2">Cleanup Results:</h3>
                  {cleanupResult.success ? (
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">✅ Cleanup completed successfully!</p>
                      <p>📊 Original: {cleanupResult.analysis.cleanup.originalCount}</p>
                      <p>🔍 Found: {cleanupResult.analysis.cleanup.duplicatesFound}</p>
                      <p>❌ Removed: {cleanupResult.analysis.cleanup.duplicatesRemoved}</p>
                      <p>✅ Final: {cleanupResult.analysis.cleanup.finalCount}</p>
                      <p>🎯 Clean: {cleanupResult.analysis.verification.cleanupSuccessful ? 'YES' : 'NO'}</p>
                    </div>
                  ) : (
                    <p className="text-red-600">❌ {cleanupResult.error}</p>
                  )}
                </div>
              )}
            </div>
            
            {/* Database Indexes Section */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-green-900 mb-4">
                🗂️ Database Indexes
              </h2>
              
              <div className="space-y-3">
                <button
                  onClick={checkIndexes}
                  disabled={loading === 'check-indexes'}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading === 'check-indexes' ? 'Checking...' : '🔍 Check Indexes'}
                </button>
                
                <button
                  onClick={resetIndexes}
                  disabled={loading === 'indexes'}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading === 'indexes' ? 'Resetting...' : '🔧 Reset Indexes'}
                </button>
              </div>
              
              {indexResult && (
                <div className="mt-4 p-4 bg-white rounded border">
                  <h3 className="font-semibold mb-2">Index Results:</h3>
                  {indexResult.success ? (
                    <div className="text-sm space-y-1">
                      {indexResult.results ? (
                        <>
                          <p className="text-green-600">✅ Indexes reset successfully!</p>
                          <p>📊 Total indexes: {indexResult.results.totalIndexes}</p>
                          <p>🆕 Created: {indexResult.results.createdIndexes.length}</p>
                          {indexResult.results.errors.length > 0 && (
                            <p className="text-yellow-600">⚠️ Warnings: {indexResult.results.errors.length}</p>
                          )}
                        </>
                      ) : indexResult.currentState ? (
                        <>
                          <p>📊 Total indexes: {indexResult.currentState.totalIndexes}</p>
                          <p>🔒 Has required unique indexes: {indexResult.currentState.hasRequiredUniqueIndexes ? '✅ YES' : '❌ NO'}</p>
                          {indexResult.currentState.missingIndexes.length > 0 && (
                            <p className="text-red-600">❌ Missing: {indexResult.currentState.missingIndexes.join(', ')}</p>
                          )}
                        </>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-red-600">❌ {indexResult.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Instructions */}
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-900 mb-4">
              📋 Instructions
            </h2>
            <div className="text-sm text-yellow-800 space-y-2">
              <p><strong>1. Preview First:</strong> Always run "Preview Cleanup" to see what will be affected</p>
              <p><strong>2. Check Indexes:</strong> Verify current database indexes</p>
              <p><strong>3. Reset Indexes:</strong> Create proper unique constraints (run this first if needed)</p>
              <p><strong>4. Run Cleanup:</strong> Remove duplicate users and merge credits safely</p>
              <p><strong>⚠️ Important:</strong> Run index reset before cleanup for best results</p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}