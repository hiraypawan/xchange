// Content script for Xchangee Chrome Extension - Remote Code Loader Version

// Debug mode flag - set to true for development
window.XCHANGEE_DEBUG = false;

// Prevent multiple initialization
if (window.XCHANGEE_CONTENT_LOADED) {
  console.log('🔄 Content script already loaded, skipping initialization');
} else {
  window.XCHANGEE_CONTENT_LOADED = true;

let isProcessing = false;
let observer = null;
let heartbeatInterval = null;
let remoteCore = null; // Will hold the remote functionality

// Initialize content script with fallback-first approach
(async function() {
  console.log('🔌 Xchangee content script loaded on:', window.location.hostname);
  console.log('🔌 Full URL:', window.location.href);
  
  // Initialize with fallback first, then try to load remote core
  initializeFallbackCore();
  
  // Try to load remote core in background (non-blocking)
  initializeRemoteCore().catch(error => {
    console.log('Remote core failed, continuing with fallback:', error.message);
  });
  
  // Start frequent update checker for immediate updates
  setTimeout(() => {
    if (typeof window.xchangeeRemoteLoader !== 'undefined') {
      window.xchangeeRemoteLoader.startUpdateChecker(0.5); // Check every 30 seconds
      console.log('🔄 Started rapid update checker (30 second intervals)');
      
      // Also check for updates on page focus/visibility change
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && typeof window.xchangeeRemoteLoader !== 'undefined') {
          console.log('👀 Page focused - checking for updates');
          window.xchangeeRemoteLoader.checkForUpdates().then(status => {
            if (status.hasUpdate) {
              console.log('🎯 Update found on focus - applying immediately');
              window.xchangeeRemoteLoader.forceRefresh();
            }
          });
        }
      });
      
      // Check for updates when user returns to tab
      window.addEventListener('focus', () => {
        if (typeof window.xchangeeRemoteLoader !== 'undefined') {
          console.log('🎯 Window focused - checking for updates');
          window.xchangeeRemoteLoader.checkForUpdates().then(status => {
            if (status.hasUpdate) {
              console.log('⚡ Immediate update on focus');
              window.xchangeeRemoteLoader.forceRefresh();
            }
          });
        }
      });
    }
  }, 5000); // Wait 5 seconds after initialization
  
  // Check which domain we're on and initialize accordingly
  if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
    console.log('🐦 Setting up Twitter integration');
    setupTwitterIntegration();
  } else if (window.location.hostname.includes('xchangee.vercel.app') || 
             window.location.hostname.includes('localhost') || 
             window.location.hostname.includes('127.0.0.1')) {
    console.log('🌐 Setting up Xchangee website integration');
    setupXchangeeWebsiteIntegration();
  } else {
    console.log('❓ Unknown domain, setting up basic extension communication:', window.location.hostname);
    setupXchangeeWebsiteIntegration();
  }
})();

// Initialize fallback core immediately (no dependencies)
function initializeFallbackCore() {
  remoteCore = {
    isReady: false,
    version: 'fallback-1.0.0',
    healthCheck: () => ({ status: 'fallback', message: 'Using fallback functionality' }),
    setupDynamicObserver: null
  };
  console.log('📦 Fallback core initialized');
}

// Try to initialize remote core functionality (optional enhancement)
async function initializeRemoteCore() {
  try {
    console.log('🚀 Attempting to load remote core...');
    
    // Wait for remote loader to be available (shorter timeout)
    if (typeof window.xchangeeRemoteLoader === 'undefined') {
      console.log('⏳ Waiting for remote loader...');
      
      // Wait up to 2 seconds for remote loader
      let attempts = 0;
      while (typeof window.xchangeeRemoteLoader === 'undefined' && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (typeof window.xchangeeRemoteLoader === 'undefined') {
        throw new Error('Remote loader not available after timeout');
      }
    }
    
    // Load remote core from server
    const newRemoteCore = await window.xchangeeRemoteLoader.loadRemoteCore();
    
    if (newRemoteCore && newRemoteCore.isReady) {
      remoteCore = newRemoteCore; // Replace fallback with real core
      console.log(`✅ Remote core loaded successfully (v${remoteCore.version})`);
    } else {
      console.warn('⚠️ Remote core loaded but not ready, keeping fallback');
    }
    
  } catch (error) {
    console.log('Remote core initialization failed, using fallback:', error.message);
    // Keep using fallback core
  }
}

// Set up Twitter page integration
function setupTwitterIntegration() {
  // Wait for page to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTwitter);
  } else {
    initializeTwitter();
  }
}

function initializeTwitter() {
  console.log('Initializing Twitter integration');
  
  // Add Xchangee UI elements
  addXchangeeIndicators();
  
  // Set up mutation observer for dynamic content
  setupMutationObserver();
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Listen for messages from website for extension detection
  window.addEventListener('message', handleWebsiteMessage);
  
  // Announce extension presence to website
  announceExtensionPresence();
}

// Handle messages from the website
async function handleWebsiteMessage(event) {
  // Reduced logging for production - only log non-heartbeat messages
  if (event.data?.type !== 'heartbeat' && event.data?.type !== 'status') {
    console.log('📨 Content script received message:', event.data);
  }
  
  if (event.data?.type === 'XCHANGEE_EXTENSION_CHECK' && event.data?.source === 'website') {
    console.log('Handling extension check request');
    
    // Get extension status
    const status = await getExtensionStatus();
    console.log('Extension check - Status:', status);
    
    // Respond immediately with extension status
    window.postMessage({ 
      type: 'XCHANGEE_EXTENSION_RESPONSE', 
      source: 'extension',
      version: chrome.runtime.getManifest().version,
      ...status,
      timestamp: Date.now()
    }, '*');
    
    // Also send immediate heartbeat
    window.postMessage({
      type: 'XCHANGEE_EXTENSION_HEARTBEAT',
      source: 'extension',
      version: chrome.runtime.getManifest().version,
      ...status,
      timestamp: Date.now()
    }, '*');
  }
  
  // Handle auth success from extension auth page
  if (event.data?.type === 'EXTENSION_AUTH_SUCCESS') {
    console.log('Extension auth success received:', event.data);
    
    // Check if extension context is still valid before sending message
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('🔄 Extension context invalidated - cannot store auth data');
      return;
    }
    
    // Store auth data and notify background script
    try {
      chrome.runtime.sendMessage({
        type: 'STORE_AUTH_DATA',
        authToken: event.data.authToken,
        userId: event.data.userId,
        userData: event.data.userData
      }, (response) => {
        // Check for runtime errors
        if (chrome.runtime.lastError) {
          if (window.XCHANGEE_DEBUG) {
            console.log('Auth data storage failed:', chrome.runtime.lastError.message);
          }
          return;
        }
        
        if (response && response.success) {
          console.log('Auth data stored successfully');
          
          // Show success notification
          window.postMessage({
            type: 'SHOW_AUTH_SUCCESS',
            userData: event.data.userData
          }, '*');
        }
      });
    } catch (error) {
      console.log('Failed to send auth data to background script:', error.message);
    }
  }
  
  // Handle authentication from extension auth page
  if (event.data?.type === 'EXTENSION_AUTH_SUCCESS') {
    handleAuthenticationFromWebsite(event.data);
  }
}

// Handle authentication data from website
async function handleAuthenticationFromWebsite(authData) {
  try {
    console.log('Received authentication from website:', authData);
    
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('🔄 Extension context invalidated - cannot handle authentication');
      return;
    }
    
    // Store auth data in extension storage
    try {
      await chrome.runtime.sendMessage({
        type: 'SET_AUTH',
        authToken: authData.authToken,
        userId: authData.userId,
        userData: authData.userData
      });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.log('🔄 Extension context invalidated during auth handling');
        return;
      }
      throw error;
    }
    
    // Store user data in local storage for popup
    await chrome.storage.local.set({
      userData: authData.userData,
      authToken: authData.authToken,
      userId: authData.userId,
      lastAuthTime: Date.now()
    });
    
    // Show success notification (check context again)
    if (chrome.runtime && chrome.runtime.id) {
      try {
        chrome.runtime.sendMessage({
          type: 'SHOW_AUTH_SUCCESS_NOTIFICATION',
          userData: authData.userData
        }, (response) => {
          // Handle any callback errors silently
          if (chrome.runtime.lastError) {
            if (window.XCHANGEE_DEBUG) {
              console.log('Notification failed:', chrome.runtime.lastError.message);
            }
          }
        });
      } catch (error) {
        if (window.XCHANGEE_DEBUG) {
          console.log('Failed to send notification:', error.message);
        }
      }
    }
    
    // Refresh page indicators
    setTimeout(() => {
      location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Failed to handle authentication:', error);
  }
}

// Get extension status for announcements
async function getExtensionStatus() {
  try {
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('🔄 Extension context invalidated - extension was reloaded');
      return {
        isInstalled: false,
        isAuthenticated: false,
        isConnected: false,
        userId: null,
        userData: null,
        contextInvalidated: true
      };
    }

    console.log('Getting extension status...');
    
    // Get current auth status with timeout and error handling
    let authStatus = null;
    try {
      // Check context before making call
      if (!chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context invalidated');
      }
      
      authStatus = await Promise.race([
        new Promise((resolve, reject) => {
          try {
            chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve(response);
              }
            });
          } catch (error) {
            reject(error);
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);
    } catch (error) {
      if (error.message.includes('Extension context invalidated') || 
          error.message.includes('message port closed') ||
          error.message.includes('receiving end does not exist') ||
          !chrome.runtime || !chrome.runtime.id) {
        throw new Error('Extension context invalidated');
      }
      if (window.XCHANGEE_DEBUG) {
        console.warn('Auth status check failed:', error.message);
      }
      authStatus = { isAuthenticated: false };
    }
    
    console.log('Extension status retrieved - Auth status:', authStatus);
    
    return {
      isInstalled: true,
      isAuthenticated: authStatus?.isAuthenticated || false,
      isConnected: authStatus?.isAuthenticated || false,
      userId: authStatus?.userId || null,
      userData: authStatus?.userData || null
    };
  } catch (error) {
    if (error.message.includes('Extension context invalidated') || 
        error.message.includes('message port closed') ||
        error.message.includes('receiving end does not exist')) {
      console.log('🔄 Extension was reloaded - stopping content script activities');
      stopContentScriptActivities();
      return {
        isInstalled: false,
        isAuthenticated: false,
        isConnected: false,
        userId: null,
        userData: null,
        contextInvalidated: true
      };
    }
    
    console.error('Failed to get extension status:', error);
    return {
      isInstalled: true,
      isAuthenticated: false,
      isConnected: false,
      userId: null,
      userData: null
    };
  }
}

// heartbeatInterval is now declared at the top of the file

// Set up Xchangee website integration
function setupXchangeeWebsiteIntegration() {
  console.log('🌐 Initializing Xchangee website integration');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Listen for messages from website for extension detection
  window.addEventListener('message', handleWebsiteMessage);
  
  // Announce extension presence to website immediately
  announceExtensionPresence();
  
  // Send periodic heartbeats to keep the website updated
  heartbeatInterval = setInterval(() => {
    announceExtensionPresence();
  }, 5000); // Every 5 seconds
  
  console.log('✅ Xchangee website integration initialized');
}

// Stop all content script activities when extension context is invalidated
function stopContentScriptActivities() {
  console.log('🛑 Stopping content script activities due to context invalidation');
  
  // Clear heartbeat interval
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
  
  // Disconnect mutation observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  
  console.log('✅ Content script activities stopped');
}

// Announce extension presence to website
async function announceExtensionPresence() {
  try {
    // Check if extension context is still valid before doing anything
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('🔄 Extension context invalidated during heartbeat - stopping activities');
      stopContentScriptActivities();
      return;
    }

    console.log('📡 Announcing extension presence...');
    
    // Get extension status
    const status = await getExtensionStatus();
    
    // If context was invalidated during status check, stop here
    if (status.contextInvalidated) {
      console.log('🔄 Extension context invalidated - skipping heartbeat');
      return;
    }
    
    // Only log status in debug mode
    if (window.XCHANGEE_DEBUG) {
      console.log('📊 Extension status:', status);
    }
    
    // Check context again before accessing manifest
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('🔄 Extension context invalidated before sending heartbeat');
      stopContentScriptActivities();
      return;
    }
    
    // Send heartbeat message to website
    window.postMessage({
      type: 'XCHANGEE_EXTENSION_HEARTBEAT',
      source: 'extension',
      version: chrome.runtime.getManifest().version,
      ...status,
      timestamp: Date.now()
    }, '*');
    
    // Only log heartbeat in debug mode
    if (window.XCHANGEE_DEBUG) {
      console.log('✅ Extension heartbeat sent');
    }
  } catch (error) {
    if (error.message.includes('Extension context invalidated')) {
      console.log('🔄 Extension context invalidated during heartbeat - cleaning up');
      stopContentScriptActivities();
    } else {
      console.error('❌ Failed to announce extension presence:', error);
    }
  }
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  if (window.XCHANGEE_DEBUG) {
    console.log('📨 Background script message:', request.type);
  }
  
  switch (request.type) {
    case 'EXTENSION_HEARTBEAT':
      // Forward heartbeat to website
      window.postMessage({
        type: 'XCHANGEE_EXTENSION_HEARTBEAT',
        source: 'extension',
        version: request.version,
        isAuthenticated: request.isAuthenticated,
        userId: request.userId
      }, '*');
      sendResponse({ success: true });
      break;
      
    case 'EXTENSION_UPDATED':
      console.log('🔄 Extension updated, forcing remote code refresh');
      
      // Force refresh remote core
      if (typeof window.xchangeeRemoteLoader !== 'undefined') {
        window.xchangeeRemoteLoader.forceRefresh().then(() => {
          console.log('✅ Remote code refreshed after extension update');
          // Reinitialize with new code
          initializeRemoteCore();
        }).catch(error => {
          console.log('⚠️ Remote code refresh failed:', error.message);
        });
      }
      
      // Notify website about extension update
      window.postMessage({
        type: 'XCHANGEE_EXTENSION_UPDATED',
        source: 'extension',
        version: request.version,
        timestamp: Date.now()
      }, '*');
      
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// Twitter integration functions using remote core
function addXchangeeIndicators() {
  if (remoteCore && remoteCore.isReady) {
    console.log('🐦 Twitter integration loaded with remote core');
    // Let remote core handle the detection
    const health = remoteCore.healthCheck();
    console.log('🔍 Remote core health:', health);
  } else {
    console.log('🐦 Twitter integration loaded (fallback mode)');
  }
}

function setupMutationObserver() {
  if (remoteCore && remoteCore.setupDynamicObserver) {
    // Let remote core handle the observer
    remoteCore.setupDynamicObserver();
    console.log('👁️ Using remote core observer');
  } else {
    // Fallback local observer
    if (typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        console.log('👀 Local observer detected changes');
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      console.log('👁️ Local fallback observer setup');
    }
  }
}

// Clean up on page unload and when extension context is invalidated
window.addEventListener('beforeunload', () => {
  if (window.XCHANGEE_DEBUG) {
    console.log('🧹 Page unloading - cleaning up content script');
  }
  stopContentScriptActivities();
});

// Global error handler for uncaught extension errors
window.addEventListener('error', (event) => {
  if (event.error && event.error.message && 
      (event.error.message.includes('Extension context invalidated') ||
       event.error.message.includes('Some of the required properties are missing'))) {
    console.log('🔄 Caught extension error - cleaning up');
    stopContentScriptActivities();
    event.preventDefault(); // Prevent error from propagating
  }
});

// Promise rejection handler for extension errors
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && 
      event.reason.message.includes('Extension context invalidated')) {
    console.log('🔄 Caught extension context rejection - cleaning up');
    stopContentScriptActivities();
    event.preventDefault(); // Prevent error from propagating
  }
});

// Also listen for extension context invalidation
if (typeof chrome !== 'undefined' && chrome.runtime) {
  try {
    // Check if the context gets invalidated periodically
    const contextChecker = setInterval(() => {
      try {
        if (!chrome.runtime || !chrome.runtime.id) {
          console.log('🔄 Extension context invalidated - cleaning up');
          clearInterval(contextChecker);
          stopContentScriptActivities();
        }
      } catch (error) {
        console.log('🔄 Context check failed - cleaning up');
        clearInterval(contextChecker);
        stopContentScriptActivities();
      }
    }, 10000); // Check every 10 seconds
  } catch (error) {
    console.log('Context checker setup failed, continuing without it');
  }
}

console.log('🚀 Xchangee content script fully loaded');

} // End of initialization guard