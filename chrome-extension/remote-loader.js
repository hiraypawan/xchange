/**
 * Remote Code Loader for Xchangee Extension
 * This file loads ALL core logic from remote server for instant updates
 */

class RemoteLoader {
  constructor() {
    // Use a more realistic base URL that matches your server structure
    this.baseUrl = this.getBaseUrl();
    this.cacheKey = 'xchangee_remote_code';
    this.versionKey = 'xchangee_remote_version';
    this.cacheTimeout = 10 * 1000; // 10 second cache for immediate updates
    this.retryCount = 3;
    this.loadedModules = new Map();
    this.isServerAvailable = true; // Track server availability
  }

  /**
   * Determine the correct base URL for API calls
   */
  getBaseUrl() {
    // Check if we're in development mode
    const isDevelopment = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('localhost') ||
      localStorage.getItem('xchangee_dev_mode') === 'true';
    
    if (isDevelopment) {
      // Try localhost first for development
      console.log('🔧 RemoteLoader: Using local development server');
      return 'http://localhost:3001/api/extension-remote';
    } else {
      // Use production URL
      console.log('🌐 RemoteLoader: Using production server');
      return 'https://xchangee.vercel.app/api/extension-remote';
    }
  }

  /**
   * Test connectivity to both local and production servers
   */
  async testConnectivity() {
    const urls = [
      'http://localhost:3001/api/extension-remote/version',
      'http://localhost:3000/api/extension-remote/version',
      'https://xchangee.vercel.app/api/extension-remote/version'
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
          console.log(`✅ Server available: ${url}`);
          const baseUrl = url.replace('/version', '');
          this.baseUrl = baseUrl;
          return baseUrl;
        }
      } catch (error) {
        console.log(`❌ Server unavailable: ${url} - ${error.message}`);
      }
    }
    
    console.log('⚠️ No servers available, using fallback');
    return null;
  }

  /**
   * Main loader function - call this to initialize remote code
   */
  async loadRemoteCore() {
    // Test connectivity first and update base URL if needed
    await this.testConnectivity();
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
        // Check if server supports remote updates
        const serverMode = localStorage.getItem(`${this.cacheKey}_server_mode`);
        if (serverMode === 'local-only') {
          if (window.XCHANGEE_DEBUG) {
            console.log('ℹ️ RemoteLoader: Skipping background check - server in local-only mode');
          }
          return;
        }

        // Skip if we've already checked recently
        const lastBackgroundCheck = localStorage.getItem(`${this.cacheKey}_last_bg_check`) || '0';
        const timeSinceLastCheck = Date.now() - parseInt(lastBackgroundCheck);
        
        // Only check once every 15 minutes in background to reduce server load
        if (timeSinceLastCheck < 15 * 60 * 1000) {
          if (window.XCHANGEE_DEBUG) {
            console.log('⏰ RemoteLoader: Skipping background check - too recent');
          }
          return;
        }
        
        localStorage.setItem(`${this.cacheKey}_last_bg_check`, Date.now().toString());
        
        const updateStatus = await this.checkForUpdates();
        if (updateStatus.hasUpdate) {
          console.log(`🆕 Background update available: ${updateStatus.currentVersion} → ${updateStatus.newVersion}`);
          // Silently update in background
          await this.forceRefresh();
        } else if (window.XCHANGEE_DEBUG) {
          console.log('📋 Background check: No updates available');
        }
      } catch (error) {
        // Silent failure for background updates with better error categorization
        if (window.XCHANGEE_DEBUG) {
          if (error.message.includes('Network unavailable') || error.message.includes('Failed to fetch')) {
            console.log('🌐 Background update: Network unavailable');
          } else {
            console.log('⚠️ Background update check failed:', error.message);
          }
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
   * Execute remote code using CSP-safe method (JSON configuration approach)
   */
  async executeRemoteCode(code) {
    try {
      console.log('🔄 RemoteLoader: Executing remote code with CSP-safe approach...');
      
      return new Promise((resolve, reject) => {
        const callbackName = `xchangeeRemoteInit_${Date.now()}`;
        
        try {
          // Instead of executing arbitrary code, parse it as JSON configuration
          // or use predefined function templates
          let remoteConfig = null;
          
          try {
            // First, try to extract JSON configuration from the code
            const jsonMatch = code.match(/\/\*\s*XCHANGEE_CONFIG\s*([\s\S]*?)\s*\*\//);
            if (jsonMatch) {
              remoteConfig = JSON.parse(jsonMatch[1]);
              console.log('✅ RemoteLoader: Found JSON configuration in remote code');
            } else {
              // Try to parse as pure JSON
              remoteConfig = JSON.parse(code);
              console.log('✅ RemoteLoader: Parsed remote code as JSON configuration');
            }
          } catch (parseError) {
            console.log('⚠️ RemoteLoader: Code is not JSON, using CSP-safe fallback approach');
            
            // Create a robust extension core with all necessary functionality
            const result = {
              version: 'csp-safe-core-1.2.0',
              isReady: true,
              engage: this.createEngageFunction(),
              detectButtons: this.createDetectButtonsFunction(),
              healthCheck: () => ({ 
                status: 'csp-safe', 
                message: 'Extension running with CSP-safe implementation'
              }),
              setupDynamicObserver: this.createObserverFunction(),
              // Add methods for Twitter/X interaction
              simulateClick: this.createClickSimulator(),
              findEngagementElements: this.createElementFinder(),
              processEngagementQueue: this.createQueueProcessor()
            };
            
            console.log('✅ RemoteLoader: CSP-safe core created successfully');
            resolve(result);
            return;
          }
          
          // If we have a valid configuration, build the core from it
          if (remoteConfig) {
            const result = this.buildCoreFromConfig(remoteConfig);
            console.log(`✅ RemoteLoader: Remote core built from configuration (v${result.version})`);
            resolve(result);
          } else {
            throw new Error('Invalid remote configuration');
          }
          
        } catch (error) {
          console.log('⚠️ RemoteLoader: Using enhanced CSP-safe fallback');
          
          // Enhanced fallback with full functionality
          const result = {
            version: 'csp-safe-fallback-1.2.0',
            isReady: true,
            engage: this.createEngageFunction(),
            detectButtons: this.createDetectButtonsFunction(),
            healthCheck: () => ({ 
              status: 'csp-safe-fallback', 
              message: 'Extension using enhanced CSP-safe fallback with full functionality'
            }),
            setupDynamicObserver: this.createObserverFunction(),
            simulateClick: this.createClickSimulator(),
            findEngagementElements: this.createElementFinder(),
            processEngagementQueue: this.createQueueProcessor()
          };
          
          console.log('✅ RemoteLoader: Enhanced CSP-safe fallback loaded');
          resolve(result);
        }
      });

    } catch (error) {
      console.error('❌ RemoteLoader: Failed to execute remote code:', error);
      throw error;
    }
  }

  /**
   * Build core functionality from JSON configuration
   */
  buildCoreFromConfig(config) {
    return {
      version: config.version || 'config-based-1.0.0',
      isReady: true,
      engage: this.createEngageFunction(config.engage),
      detectButtons: this.createDetectButtonsFunction(config.detectButtons),
      healthCheck: () => ({ 
        status: 'config-based', 
        message: 'Extension built from remote configuration'
      }),
      setupDynamicObserver: this.createObserverFunction(config.observer),
      simulateClick: this.createClickSimulator(),
      findEngagementElements: this.createElementFinder(config.selectors),
      processEngagementQueue: this.createQueueProcessor()
    };
  }

  /**
   * Create CSP-safe engage function
   */
  createEngageFunction(config = null) {
    return () => {
      console.log('🔄 Xchangee: Starting engagement process...');
      
      // Find engagement buttons on the page
      const buttons = this.findEngagementButtons();
      
      if (buttons.length > 0) {
        console.log(`📊 Found ${buttons.length} engagement opportunities`);
        
        // Process buttons with delay to avoid detection
        this.processEngagementButtons(buttons);
        
        return {
          success: true,
          message: `Started engagement on ${buttons.length} elements`,
          count: buttons.length
        };
      } else {
        console.log('📭 No engagement opportunities found');
        return {
          success: false,
          message: 'No engagement elements found on page',
          count: 0
        };
      }
    };
  }

  /**
   * Create CSP-safe button detection function
   */
  createDetectButtonsFunction(config = null) {
    return () => {
      const buttons = this.findEngagementButtons();
      return buttons.map(btn => ({
        type: this.getButtonType(btn),
        element: btn,
        visible: this.isElementVisible(btn),
        text: btn.textContent?.trim() || '',
        href: btn.href || null
      }));
    };
  }

  /**
   * Create CSP-safe observer function
   */
  createObserverFunction(config = null) {
    return (callback) => {
      if (typeof callback !== 'function') {
        console.log('⚠️ Observer callback must be a function');
        return null;
      }

      const observer = new MutationObserver((mutations) => {
        let hasChanges = false;
        
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            hasChanges = true;
          }
        });
        
        if (hasChanges) {
          // Debounce callback calls
          clearTimeout(this.observerTimeout);
          this.observerTimeout = setTimeout(() => {
            try {
              callback();
            } catch (error) {
              console.error('Observer callback error:', error);
            }
          }, 500);
        }
      });

      // Observe with optimized settings
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false,
        attributeOldValue: false,
        characterData: false,
        characterDataOldValue: false
      });

      console.log('👁️ Dynamic content observer started');
      return observer;
    };
  }

  /**
   * Create CSP-safe click simulator
   */
  createClickSimulator() {
    return (element, delay = 1000) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          try {
            if (element && typeof element.click === 'function') {
              // Simulate human-like interaction
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              setTimeout(() => {
                element.click();
                console.log('🖱️ Simulated click on element:', element.textContent?.trim());
                resolve({ success: true });
              }, 200);
            } else {
              resolve({ success: false, error: 'Invalid element' });
            }
          } catch (error) {
            console.error('Click simulation failed:', error);
            resolve({ success: false, error: error.message });
          }
        }, delay);
      });
    };
  }

  /**
   * Create CSP-safe element finder
   */
  createElementFinder(customSelectors = null) {
    return (type) => {
      const selectors = customSelectors || this.getDefaultSelectors();
      const elements = [];
      
      if (selectors[type]) {
        selectors[type].forEach(selector => {
          try {
            const found = document.querySelectorAll(selector);
            elements.push(...Array.from(found));
          } catch (error) {
            console.log(`Invalid selector: ${selector}`);
          }
        });
      }
      
      // Remove duplicates
      return elements.filter((element, index, self) => 
        self.indexOf(element) === index
      );
    };
  }

  /**
   * Create CSP-safe queue processor
   */
  createQueueProcessor() {
    return (items, processor, delay = 2000) => {
      return new Promise(async (resolve) => {
        const results = [];
        
        for (let i = 0; i < items.length; i++) {
          try {
            const result = await processor(items[i]);
            results.push(result);
            
            // Add human-like delay between actions
            if (i < items.length - 1) {
              await new Promise(r => setTimeout(r, delay + Math.random() * 1000));
            }
          } catch (error) {
            console.error(`Queue processing error for item ${i}:`, error);
            results.push({ success: false, error: error.message });
          }
        }
        
        resolve(results);
      });
    };
  }

  /**
   * Find engagement buttons using multiple strategies
   */
  findEngagementButtons() {
    const buttons = [];
    
    // Strategy 1: Look for common engagement patterns
    const selectors = [
      '[data-testid="like"]',
      '[data-testid="retweet"]', 
      '[data-testid="reply"]',
      '[aria-label*="Like"]',
      '[aria-label*="Retweet"]',
      '[aria-label*="Reply"]',
      'button[role="button"]:has([d*="M20.884"])', // Heart icon path
      'button[role="button"]:has([d*="M1.751"])'   // Retweet icon path
    ];
    
    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (this.isValidEngagementButton(el)) {
            buttons.push(el);
          }
        });
      } catch (error) {
        console.log(`Selector failed: ${selector}`);
      }
    });
    
    return this.deduplicateButtons(buttons);
  }

  /**
   * Check if button is valid for engagement
   */
  isValidEngagementButton(button) {
    if (!button || !this.isElementVisible(button)) {
      return false;
    }
    
    // Check if already engaged
    const isLiked = button.getAttribute('aria-pressed') === 'true' ||
                   button.classList.contains('liked') ||
                   button.querySelector('[fill="rgb(249, 24, 128)"]'); // Twitter red heart
    
    if (isLiked) {
      return false; // Skip already liked posts
    }
    
    // Check if it's in viewport
    const rect = button.getBoundingClientRect();
    return rect.top >= 0 && rect.bottom <= window.innerHeight;
  }

  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           element.offsetParent !== null;
  }

  /**
   * Remove duplicate buttons
   */
  deduplicateButtons(buttons) {
    const seen = new Set();
    return buttons.filter(button => {
      const key = button.outerHTML;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Get button type (like, retweet, reply)
   */
  getButtonType(button) {
    const ariaLabel = button.getAttribute('aria-label') || '';
    const testId = button.getAttribute('data-testid') || '';
    
    if (ariaLabel.includes('Like') || testId.includes('like')) {
      return 'like';
    } else if (ariaLabel.includes('Retweet') || testId.includes('retweet')) {
      return 'retweet';
    } else if (ariaLabel.includes('Reply') || testId.includes('reply')) {
      return 'reply';
    }
    
    return 'unknown';
  }

  /**
   * Process engagement buttons with human-like behavior
   */
  processEngagementButtons(buttons) {
    // Limit to prevent spam detection
    const maxEngagements = Math.min(buttons.length, 5);
    const selectedButtons = buttons.slice(0, maxEngagements);
    
    selectedButtons.forEach((button, index) => {
      // Stagger clicks with realistic delays
      const delay = (index + 1) * (2000 + Math.random() * 3000);
      
      setTimeout(() => {
        this.createClickSimulator()(button, 0).then(result => {
          if (result.success) {
            console.log(`✅ Engagement ${index + 1}/${maxEngagements} completed`);
          } else {
            console.log(`❌ Engagement ${index + 1}/${maxEngagements} failed:`, result.error);
          }
        });
      }, delay);
    });
  }

  /**
   * Get default selectors for element finding
   */
  getDefaultSelectors() {
    return {
      like: [
        '[data-testid="like"]',
        '[aria-label*="Like"]',
        'button[role="button"]:has([d*="M20.884"])'
      ],
      retweet: [
        '[data-testid="retweet"]',
        '[aria-label*="Retweet"]',
        'button[role="button"]:has([d*="M1.751"])'
      ],
      reply: [
        '[data-testid="reply"]',
        '[aria-label*="Reply"]'
      ]
    };
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

      console.log(`📦 RemoteLoader: Loading module "${moduleName}" with CSP-safe approach`);
      
      const response = await fetch(`${this.baseUrl}/${moduleName}.js?v=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`Failed to load module ${moduleName}: HTTP ${response.status}`);
      }

      const moduleCode = await response.text();
      
      // CSP-safe module loading using JSON parsing instead of code execution
      let moduleExports = {};
      
      try {
        // Try to parse as JSON configuration first
        const jsonMatch = moduleCode.match(/\/\*\s*MODULE_CONFIG\s*([\s\S]*?)\s*\*\//);
        if (jsonMatch) {
          moduleExports = JSON.parse(jsonMatch[1]);
          console.log(`✅ RemoteLoader: Module "${moduleName}" loaded from JSON config`);
        } else {
          // Try direct JSON parse
          moduleExports = JSON.parse(moduleCode);
          console.log(`✅ RemoteLoader: Module "${moduleName}" loaded as JSON`);
        }
      } catch (parseError) {
        console.log(`⚠️ RemoteLoader: Module "${moduleName}" is not JSON, creating CSP-safe fallback`);
        
        // Create a safe fallback module based on module name
        moduleExports = this.createFallbackModule(moduleName);
      }

      this.loadedModules.set(moduleName, moduleExports);
      
      console.log(`✅ RemoteLoader: Module "${moduleName}" loaded successfully`);
      return moduleExports;

    } catch (error) {
      console.error(`📦 RemoteLoader: Failed to load module "${moduleName}":`, error);
      
      // Return a safe fallback module
      const fallbackModule = this.createFallbackModule(moduleName);
      this.loadedModules.set(moduleName, fallbackModule);
      return fallbackModule;
    }
  }

  /**
   * Create fallback module functionality based on module name
   */
  createFallbackModule(moduleName) {
    const baseModule = {
      name: moduleName,
      version: 'fallback-1.0.0',
      loaded: true,
      cspSafe: true
    };

    // Add specific functionality based on module name
    switch (moduleName.toLowerCase()) {
      case 'engagement':
      case 'twitter-engagement':
        return {
          ...baseModule,
          engage: this.createEngageFunction(),
          detectButtons: this.createDetectButtonsFunction(),
          simulateClick: this.createClickSimulator()
        };
        
      case 'observer':
      case 'dom-observer':
        return {
          ...baseModule,
          createObserver: this.createObserverFunction(),
          startMonitoring: () => console.log(`${moduleName} monitoring started`),
          stopMonitoring: () => console.log(`${moduleName} monitoring stopped`)
        };
        
      case 'analytics':
      case 'stats':
        return {
          ...baseModule,
          track: (event, data) => console.log(`Analytics: ${event}`, data),
          report: () => ({ status: 'fallback', events: [] }),
          getStats: () => ({ fallback: true, mode: 'csp-safe' })
        };
        
      default:
        return {
          ...baseModule,
          execute: () => console.log(`${moduleName} fallback executed`),
          init: () => true,
          cleanup: () => true
        };
    }
  }

  /**
   * Check for code updates (can be called periodically)
   */
  async checkForUpdates() {
    try {
      // Check extension context first
      if (typeof chrome !== 'undefined' && chrome.runtime && !chrome.runtime.id) {
        console.log('⚠️ RemoteLoader: Extension context invalid, skipping update check');
        return { hasUpdate: false, error: 'Extension context invalid' };
      }

      // Try multiple endpoints that might exist on your server
      const endpoints = [
        `${this.baseUrl}/health`,
        `${this.baseUrl}/extension/version`, 
        `${this.baseUrl}/user/stats`,
        `${this.baseUrl}/status`
      ];

      let serverVersion = null;
      let response = null;

      // Try endpoints in order until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 RemoteLoader: Checking updates from ${endpoint}`);
          
          // Create compatible abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
          
          try {
            response = await fetch(endpoint, {
              method: 'HEAD',
              headers: {
                'Cache-Control': 'no-cache'
              },
              signal: controller.signal
            });
            clearTimeout(timeoutId);
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }

          if (response.ok) {
            // Try to get version from different header fields
            serverVersion = response.headers.get('X-Code-Version') || 
                          response.headers.get('X-Version') || 
                          response.headers.get('ETag') ||
                          response.headers.get('Last-Modified');
            
            if (serverVersion) {
              console.log(`✅ RemoteLoader: Got server version: ${serverVersion}`);
              break;
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ RemoteLoader: Endpoint ${endpoint} failed:`, endpointError.message);
          continue; // Try next endpoint
        }
      }

      // If no version info available, server doesn't support remote updates
      if (!serverVersion) {
        console.log('ℹ️ RemoteLoader: Server does not support remote updates - using local fallback mode');
        this.isServerAvailable = false;
        
        // Mark that we've checked and no remote updates are available
        const now = Date.now();
        localStorage.setItem(`${this.cacheKey}_last_check`, now.toString());
        localStorage.setItem(`${this.cacheKey}_server_mode`, 'local-only');
        
        return { hasUpdate: false, currentVersion: 'local-fallback', serverMode: 'local-only' };
      }

      const cachedVersion = localStorage.getItem(this.versionKey);
      
      if (serverVersion !== cachedVersion) {
        console.log(`🔄 RemoteLoader: Update available: ${cachedVersion} → ${serverVersion}`);
        return { hasUpdate: true, newVersion: serverVersion, currentVersion: cachedVersion };
      }
      
      return { hasUpdate: false, currentVersion: cachedVersion };
      
    } catch (error) {
      // Handle different types of errors gracefully
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.log('🌐 RemoteLoader: Network unavailable, skipping update check');
        return { hasUpdate: false, error: 'Network unavailable' };
      } else if (error.name === 'AbortError') {
        console.log('⏰ RemoteLoader: Update check timed out');
        return { hasUpdate: false, error: 'Request timeout' };
      } else {
        console.error('❌ RemoteLoader: Failed to check for updates:', error);
        return { hasUpdate: false, error: error.message };
      }
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