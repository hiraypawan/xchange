'use client';

import { useState, useEffect } from 'react';
import { Download, CheckCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

interface VersionInfo {
  version: string;
  updateUrl: string;
  releaseNotes: string;
  features: string[];
  releaseDate: string;
  changelog: Record<string, {
    releaseNotes: string;
    features: string[];
    releaseDate: string;
  }>;
}

export default function ExtensionDownloadPage() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'complete'>('idle');

  useEffect(() => {
    fetchVersionInfo();
  }, []);

  const fetchVersionInfo = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/extension?action=version');
      const data = await response.json();
      setVersionInfo(data);
    } catch (error) {
      console.error('Failed to fetch version info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    setDownloadStatus('downloading');
    
    try {
      const response = await fetch('/api/extension?action=download');
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xchangee-extension-v${versionInfo?.version}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setDownloadStatus('complete');
      setTimeout(() => setDownloadStatus('idle'), 3000);
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus('idle');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-white text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading extension information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Xchangee Extension
          </h1>
          <p className="text-xl text-blue-200 max-w-2xl mx-auto">
            Automate your Twitter engagement and earn credits with our powerful Chrome extension
          </p>
        </div>

        {/* Main Download Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-lg font-semibold text-white">
                    Latest Version: v{versionInfo?.version}
                  </span>
                </div>
                
                <h2 className="text-2xl font-bold text-white mb-4">
                  Download Xchangee Extension
                </h2>
                
                <p className="text-blue-200 mb-6">
                  {versionInfo?.releaseNotes}
                </p>
                
                <div className="space-y-3 mb-6">
                  {versionInfo?.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-100">{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-sm text-blue-300">
                  <Clock className="w-4 h-4" />
                  <span>Released: {versionInfo && formatDate(versionInfo.releaseDate)}</span>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <Download className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  
                  <button
                    onClick={handleDownload}
                    disabled={downloadStatus === 'downloading'}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
                  >
                    {downloadStatus === 'downloading' && (
                      <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                    )}
                    {downloadStatus === 'complete' && (
                      <CheckCircle className="w-5 h-5 inline mr-2" />
                    )}
                    {downloadStatus === 'idle' && (
                      <Download className="w-5 h-5 inline mr-2" />
                    )}
                    {downloadStatus === 'downloading' ? 'Downloading...' : 
                     downloadStatus === 'complete' ? 'Downloaded!' : 
                     'Download Extension'}
                  </button>
                  
                  <p className="text-xs text-blue-300 mt-3">
                    Compatible with Chrome, Edge, and other Chromium browsers
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Installation Instructions */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Installation Instructions</h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-blue-400">1</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Download & Extract</h4>
                <p className="text-sm text-blue-200">Download the extension ZIP file and extract it to a folder</p>
              </div>
              
              <div className="text-center">
                <div className="bg-purple-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-purple-400">2</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Enable Developer Mode</h4>
                <p className="text-sm text-blue-200">Go to chrome://extensions/ and enable Developer mode</p>
              </div>
              
              <div className="text-center">
                <div className="bg-green-500/20 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-green-400">3</span>
                </div>
                <h4 className="font-semibold text-white mb-2">Load Extension</h4>
                <p className="text-sm text-blue-200">Click "Load unpacked" and select the extracted folder</p>
              </div>
            </div>

            <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-200 text-sm">
                <strong>Note:</strong> After installation, visit the <a href="/auth/extension" className="text-yellow-400 hover:underline">Extension Connection page</a> to link your extension with your Xchangee account.
              </p>
            </div>
          </div>

          {/* Version History */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Version History</h3>
              <button
                onClick={fetchVersionInfo}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {versionInfo?.changelog && Object.entries(versionInfo.changelog)
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([version, info]) => (
                <div key={version} className="border-l-2 border-blue-500/30 pl-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-semibold text-white">v{version}</span>
                    <span className="text-sm text-blue-300">{formatDate(info.releaseDate)}</span>
                    {version === versionInfo.version && (
                      <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                        Latest
                      </span>
                    )}
                  </div>
                  <p className="text-blue-200 text-sm mb-3">{info.releaseNotes}</p>
                  <ul className="space-y-1">
                    {info.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="text-xs text-blue-300 flex items-start gap-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full mt-1.5 flex-shrink-0"></span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Back to Dashboard */}
          <div className="text-center mt-8">
            <a
              href="/dashboard"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}