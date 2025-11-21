/**
 * Remote Code Loader for Xchangee Extension
 * This file loads ALL core logic from remote server for instant updates
 */

class RemoteLoader {
  constructor() {
    this.baseUrl = 'https://xchangee.vercel.app/api/extension-remote';
    this.cacheKey = 'xchangee_remote_code';
    this.versionKey = 'xchangee_remote_version';
    this.cacheTimeout = 10 * 1000; // 10 second cache for immediate updates
    this.retryCount = 3;
    this.loadedModules = new Map();
  }

  /**
   * Main loader function - call this to initialize remote code
   */
  async loadRemoteCore() {
    console.log('🚀 RemoteLoader: Starting remote core loading...');
    
    // Check extension context first
    if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
      console.log('⚠️ RemoteLoader: Extension context invalid, using fallback immediately');
      return this.loadFallbackCore();
    }
    
    try {
      // Try cached version first for speed
      const cachedCode = await this.getCachedCode();
      if (cachedCode) {
        console.log('⚡ RemoteLoader: Using cached code for immediate startup');
        try {
          const result = await this.executeRemoteCode(cachedCode);
          // Check for updates in background
          this.checkForUpdatesInBackground();
          return result;
        } catch (cacheError) {
          console.log('⚠️ RemoteLoader: Cached code failed, trying server...');
        }
      }

      // Try to load from server
      const remoteCode = await this.fetchRemoteCode();
      if (remoteCode) {
        console.log('✅ RemoteLoader: Loaded fresh code from server');
        return await this.executeRemoteCode(remoteCode);
      }

      throw new Error('No remote code available (server down + no cache)');
      
    } catch (error) {
      if (window.XCHANGEE_DEBUG) {
        console.error('❌ RemoteLoader: Failed to load remote code:', error);
      }
      
      // Ultimate fallback - basic functionality
      return this.loadFallbackCore();
    }
  }

  /**
   * Check for updates in background without blocking startup
   */
  async checkForUpdatesInBackground() {
    setTimeout(async () => {
      try {
        const updateStatus = await this.checkForUpdates();
        if (updateStatus.hasUpdate) {
          console.log(`🆕 Background update available: ${updateStatus.currentVersion} → ${updateStatus.newVersion}`);
          // Silently update in background
          await this.forceRefresh();
        }
      } catch (error) {
        // Silent failure for background updates
        if (window.XCHANGEE_DEBUG) {
          console.log('Background update check failed:', error.message);
        }
      }
    }, 2000); // Check after 2 seconds
  }

  /**
   * Fetch code from remote server with retry logic
   */
  async fetchRemoteCode() {
    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        console.log(`📦 RemoteLoader: Fetching remote code (attempt ${attempt}/${this.retryCount})`);
        
        // Check if extension context is still valid before making requests
        if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
          throw new Error('Extension context invalidated');
        }
        
        // Prepare headers safely
        let headers = {
          'Cache-Control': 'no-cache'
        };
        
        // Only add extension version if chrome.runtime is available
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
            headers['X-Extension-Version'] = chrome.runtime.getManifest().version;
          }
        } catch (error) {
          console.log('Could not get extension version, continuing without it');
        }
        
        const response = await fetch(`${this.baseUrl}/core.js?v=${Date.now()}`, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const code = await response.text();
        const serverVersion = response.headers.get('X-Code-Version') || 'unknown';
        
        // Check if version changed
        const cachedVersion = localStorage.getItem(this.versionKey);
        if (cachedVersion && cachedVersion !== serverVersion) {
          console.log(`🔄 RemoteLoader: Version updated: ${cachedVersion} → ${serverVersion}`);
        }

        // Cache the new code and version
        localStorage.setItem(this.cacheKey, code);
        localStorage.setItem(this.versionKey, serverVersion);
        localStorage.setItem(`${this.cacheKey}_timestamp`, Date.now().toString());

        console.log(`✅ RemoteLoader: Remote code loaded successfully (v${serverVersion})`);
        return code;

      } catch (error) {
        console.error(`📦 RemoteLoader: Attempt ${attempt} failed:`, error.message);
        
        // If extension context is invalidated, stop retrying
        if (error.message.includes('Extension context invalidated') || 
            error.message.includes('message port closed') ||
            (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id)) {
          console.log('📦 RemoteLoader: Extension context invalidated, stopping retries');
          return null;
        }
        
        if (attempt === this.retryCount) {
          console.error('📦 RemoteLoader: All retry attempts failed');
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
    
    return null;
  }

  /**
   * Get cached code if available and not expired
   */
  async getCachedCode() {
    try {
      const cachedCode = localStorage.getItem(this.cacheKey);
      const timestamp = parseInt(localStorage.getItem(`${this.cacheKey}_timestamp`) || '0');
      const version = localStorage.getItem(this.versionKey);
      
      if (!cachedCode || !timestamp) {
        console.log('📭 RemoteLoader: No cached code available');
        return null;
      }

      const age = Date.now() - timestamp;
      if (age > this.cacheTimeout) {
        console.log(`⏰ RemoteLoader: Cache expired (${Math.round(age/1000)}s old)`);
        return null;
      }

      console.log(`📦 RemoteLoader: Using cached code (v${version}, ${Math.round(age/1000)}s old)`);
      return cachedCode;

    } catch (error) {
      console.error('❌ RemoteLoader: Failed to get cached code:', error);
      return null;
    }
  }

  /**
   * Execute remote code using CSP-compliant blob URLs
   */
  async executeRemoteCode(code) {
    try {
      console.log('🔄 RemoteLoader: Executing remote code via blob URL...');
      
      return new Promise((resolve, reject) => {
        // Create a unique callback name
        const callbackName = `xchangeeRemoteInit_${Date.now()}`;
        
        // Prepare the code with proper callback
        const wrappedCode = `
          (function() {
            try {
              ${code}
              
              // Call the callback when ready
              if (typeof initXchangeeCore === 'function') {
                console.log('🔄 RemoteLoader: Remote code loaded, initializing...');
                
                try {
                  const result = initXchangeeCore();
                  window.${callbackName}_result = result;
                  window.${callbackName}_ready = true;
                  console.log('✅ RemoteLoader: Remote core initialized successfully');
                } catch (error) {
                  window.${callbackName}_error = error;
                  console.error('❌ RemoteLoader: Remote core init failed:', error);
                }
              } else {
                window.${callbackName}_error = new Error('initXchangeeCore function not found');
                console.error('❌ RemoteLoader: initXchangeeCore function not found in remote code');
              }
            } catch (error) {
              window.${callbackName}_error = error;
              console.error('❌ RemoteLoader: Code execution failed:', error);
            }
          })();
        `;
        
        // Create blob URL for CSP compliance
        const blob = new Blob([wrappedCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        // Create and inject script element with blob URL
        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = () => {
          // Clean up blob URL
          URL.revokeObjectURL(blobUrl);
          
          // Check if initialization completed
          const checkReady = () => {
            if (window[callbackName + '_ready']) {
              const result = window[callbackName + '_result'];
              // Cleanup
              document.head.removeChild(script);
              delete window[callbackName + '_result'];
              delete window[callbackName + '_ready'];
              resolve(result);
            } else if (window[callbackName + '_error']) {
              const error = window[callbackName + '_error'];
              // Cleanup
              document.head.removeChild(script);
              delete window[callbackName + '_error'];
              reject(error);
            } else {
              // Keep checking
              setTimeout(checkReady, 100);
            }
          };
          
          setTimeout(checkReady, 100);
        };
        
        script.onerror = (error) => {
          console.error('❌ RemoteLoader: Script loading failed:', error);
          URL.revokeObjectURL(blobUrl);
          document.head.removeChild(script);
          delete window[callbackName + '_error'];
          reject(new Error('Script loading failed'));
        };
        
        // Inject the script
        document.head.appendChild(script);
      });

    } catch (error) {
      console.error('❌ RemoteLoader: Failed to execute remote code:', error);
      throw error;
    }
  }

  /**
   * Basic fallback functionality when remote code fails
   */
  loadFallbackCore() {
    console.log('🆘 RemoteLoader: Loading basic fallback functionality...');
    
    return {
      version: 'fallback-1.0.0',
      engage: () => console.log('⚠️ Fallback: Engagement disabled - remote code unavailable'),
      detectButtons: () => [],
      isReady: false,
      error: 'Remote core unavailable'
    };
  }

  /**
   * Load specific remote module (for modular updates) - CSP-safe version
   */
  async loadModule(moduleName) {
    try {
      if (this.loadedModules.has(moduleName)) {
        return this.loadedModules.get(moduleName);
      }

      console.log(`📦 RemoteLoader: Loading module "${moduleName}"`);
      
      const response = await fetch(`${this.baseUrl}/${moduleName}.js?v=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load module ${moduleName}: HTTP ${response.status}`);
      }

      const moduleCode = await response.text();
      
      // Use blob URL for CSP compliance
      const moduleExports = await new Promise((resolve, reject) => {
        const callbackName = `xchangeeModule_${moduleName}_${Date.now()}`;
        
        const wrappedModuleCode = `
          (function() {
            try {
              ${moduleCode}
              window.${callbackName} = typeof module !== 'undefined' ? module : {};
            } catch (error) {
              window.${callbackName}_error = error;
            }
          })();
        `;
        
        const blob = new Blob([wrappedModuleCode], { type: 'application/javascript' });
        const blobUrl = URL.createObjectURL(blob);
        
        const script = document.createElement('script');
        script.src = blobUrl;
        
        script.onload = () => {
          URL.revokeObjectURL(blobUrl);
          
          if (window[callbackName + '_error']) {
            const error = window[callbackName + '_error'];
            delete window[callbackName + '_error'];
            document.head.removeChild(script);
            reject(error);
          } else {
            const exports = window[callbackName] || {};
            delete window[callbackName];
            document.head.removeChild(script);
            resolve(exports);
          }
        };
        
        script.onerror = (error) => {
          URL.revokeObjectURL(blobUrl);
          delete window[callbackName];
          document.head.removeChild(script);
          reject(error);
        };
        
        document.head.appendChild(script);
      });

      this.loadedModules.set(moduleName, moduleExports);
      
      console.log(`✅ RemoteLoader: Module "${moduleName}" loaded successfully`);
      return moduleExports;

    } catch (error) {
      console.error(`📦 RemoteLoader: Failed to load module "${moduleName}":`, error);
      return null;
    }
  }

  /**
   * Check for code updates (can be called periodically)
   */
  async checkForUpdates() {
    try {
      const response = await fetch(`${this.baseUrl}/version`, {
        method: 'HEAD'
      });
      
      const serverVersion = response.headers.get('X-Code-Version');
      const cachedVersion = localStorage.getItem(this.versionKey);
      
      if (serverVersion && serverVersion !== cachedVersion) {
        console.log(`🔄 RemoteLoader: Update available: ${cachedVersion} → ${serverVersion}`);
        return { hasUpdate: true, newVersion: serverVersion, currentVersion: cachedVersion };
      }
      
      return { hasUpdate: false, currentVersion: cachedVersion };
      
    } catch (error) {
      console.error('❌ RemoteLoader: Failed to check for updates:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  /**
   * Force refresh remote code (bypass cache)
   */
  async forceRefresh() {
    console.log('🔄 RemoteLoader: Force refreshing remote code...');
    
    // Clear cache from both localStorage and chrome.storage
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.versionKey);
    localStorage.removeItem(`${this.cacheKey}_timestamp`);
    
    // Also clear from chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        await chrome.storage.local.remove([
          'xchangee_remote_code', 
          'xchangee_remote_version', 
          'xchangee_remote_code_timestamp'
        ]);
      } catch (error) {
        console.log('Failed to clear chrome storage:', error.message);
      }
    }
    
    this.loadedModules.clear();
    
    // Load fresh code
    return await this.loadRemoteCore();
  }

  /**
   * Start periodic update checking with rapid intervals for immediate updates
   */
  startUpdateChecker(intervalMinutes = 0.5) {
    const intervalSeconds = intervalMinutes * 60;
    console.log(`🔄 RemoteLoader: Starting rapid update checker (every ${intervalSeconds} seconds)`);
    
    const checkInterval = setInterval(async () => {
      try {
        const updateStatus = await this.checkForUpdates();
        if (updateStatus.hasUpdate) {
          console.log(`🆕 RemoteLoader: Update detected! ${updateStatus.currentVersion} → ${updateStatus.newVersion}`);
          console.log('📥 Auto-updating remote code immediately...');
          
          // Auto-update in background
          await this.forceRefresh();
          console.log('✅ RemoteLoader: Successfully updated to latest version');
          
          // Notify content script about update
          if (typeof window.postMessage === 'function') {
            window.postMessage({
              type: 'XCHANGEE_REMOTE_UPDATED',
              source: 'remote-loader',
              oldVersion: updateStatus.currentVersion,
              newVersion: updateStatus.newVersion,
              timestamp: Date.now()
            }, '*');
          }
          
          // Show user notification about update
          console.log(`🎉 Extension updated! New features may be available.`);
        } else {
          // Silent check - only log in debug mode
          if (window.XCHANGEE_DEBUG) {
            console.log('🔍 Update check: No updates available');
          }
        }
      } catch (error) {
        if (window.XCHANGEE_DEBUG) {
          console.log('Update check failed:', error.message);
        }
      }
    }, intervalSeconds * 1000);
    
    // Store interval ID for cleanup
    this.updateCheckInterval = checkInterval;
    
    return checkInterval;
  }

  /**
   * Stop periodic update checking
   */
  stopUpdateChecker() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('🛑 RemoteLoader: Update checker stopped');
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    const version = localStorage.getItem(this.versionKey);
    const timestamp = parseInt(localStorage.getItem(`${this.cacheKey}_timestamp`) || '0');
    const age = timestamp ? Date.now() - timestamp : null;
    
    return {
      version: version || 'unknown',
      lastUpdate: timestamp ? new Date(timestamp).toISOString() : null,
      cacheAge: age,
      isReady: !!localStorage.getItem(this.cacheKey)
    };
  }

  /**
   * Utility function for delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance
window.RemoteLoader = RemoteLoader;

// Auto-initialize if in content script context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.xchangeeRemoteLoader = new RemoteLoader();
  console.log('🚀 RemoteLoader: Instance created and ready');
}

console.log('📦 RemoteLoader: Module loaded successfully');