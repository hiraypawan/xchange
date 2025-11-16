'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Chrome, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Twitter,
  Shield,
  Zap
} from 'lucide-react';

export default function ExtensionPage() {
  const [extensionVersion, setExtensionVersion] = useState('1.4.18');
  const [downloadUrl, setDownloadUrl] = useState('/api/extension?action=download');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch latest extension info
    const fetchExtensionInfo = async () => {
      try {
        const response = await fetch('/api/extension?action=info');
        const data = await response.json();
        if (data.success) {
          setExtensionVersion(data.version);
          setDownloadUrl(data.downloadUrl);
        }
      } catch (error) {
        console.error('Failed to fetch extension info:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExtensionInfo();
  }, []);

  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  const installationSteps = [
    {
      step: 1,
      title: 'Download Extension',
      description: 'Click the download button to get the latest Xchangee extension file',
      action: 'Download will start automatically',
      icon: Download
    },
    {
      step: 2,
      title: 'Open Chrome Extensions',
      description: 'Go to Chrome menu → More tools → Extensions, or type chrome://extensions/ in address bar',
      action: 'Enable "Developer mode" toggle in top right',
      icon: Chrome
    },
    {
      step: 3,
      title: 'Install Extension',
      description: 'Click "Load unpacked" and select the extracted Xchangee extension folder',
      action: 'Extension will appear in your Chrome toolbar',
      icon: CheckCircle
    },
    {
      step: 4,
      title: 'Connect Twitter',
      description: 'Click the Xchangee extension icon and sign in with your Twitter account',
      action: 'Grant necessary permissions for engagement automation',
      icon: Twitter
    }
  ];

  const features = [
    {
      icon: Zap,
      title: 'Automated Engagement',
      description: 'Your Twitter account engages automatically with community posts'
    },
    {
      icon: RefreshCw,
      title: 'Mutual Growth',
      description: 'Help others grow while they help you build your influence'
    },
    {
      icon: Shield,
      title: 'Secure & Safe',
      description: 'OAuth authentication ensures your account stays protected'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Xchangee Extension</h1>
              <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                v{extensionVersion}
              </span>
            </div>
            <a 
              href="/" 
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            Install Xchangee Extension
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            Get the Chrome extension to automate your Twitter engagement and build your influence on X
          </motion.p>

          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            onClick={handleDownload}
            disabled={isLoading}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-bold transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Download className="w-6 h-6" />
            )}
            Download Extension v{extensionVersion}
          </motion.button>

          <p className="text-sm text-gray-500 mt-4">
            Free download • Chrome browser required • Latest version always available
          </p>
        </div>

        {/* Features */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Why Install the Extension?
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Installation Steps */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How to Install (Step by Step)
          </h3>

          <div className="space-y-8">
            {installationSteps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-start gap-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{step.step}</span>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <step.icon className="w-5 h-5 text-blue-600" />
                    <h4 className="text-lg font-semibold text-gray-900">{step.title}</h4>
                  </div>
                  <p className="text-gray-600 mb-2">{step.description}</p>
                  <p className="text-sm text-blue-600 font-medium">{step.action}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-16">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="text-lg font-semibold text-yellow-800 mb-2">
                Installation Help
              </h4>
              <div className="text-yellow-700 space-y-2 text-sm">
                <p><strong>Extension not loading?</strong> Make sure you have Chrome Developer mode enabled</p>
                <p><strong>Can't find the file?</strong> Check your Downloads folder for xchangee-extension-v{extensionVersion}.zip</p>
                <p><strong>Need to extract?</strong> Right-click the ZIP file and select "Extract All"</p>
                <p><strong>Still having issues?</strong> Contact support on{' '}
                  <a 
                    href="https://t.me/xchangeetool" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Telegram
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Auto-Update Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <CheckCircle className="w-8 h-8 text-blue-600 mx-auto mb-3" />
          <h4 className="text-lg font-semibold text-blue-900 mb-2">
            Automatic Updates
          </h4>
          <p className="text-blue-700">
            Once installed, the extension will automatically update to the latest version. 
            No need to manually download updates!
          </p>
        </div>
      </div>
    </div>
  );
}