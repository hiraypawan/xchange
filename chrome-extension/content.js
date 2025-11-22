// Enhanced Content script for Xchangee Chrome Extension - With Popup Management
// This version handles ALL extension logic including popup functionality

// Debug mode flag - set to true for development
window.XCHANGEE_DEBUG = false;

// Prevent multiple initialization
if (window.XCHANGEE_CONTENT_LOADED) {
  console.log('🔄 Content script already loaded, skipping initialization');
} else {
  window.XCHANGEE_CONTENT_LOADED = true;

// Popup Management System - All popup logic now handled here
let popupData = {
  isAuthenticated: false,
  user: null,
  stats: {
    todayEarnings: 0,
    isAutoEngageActive: false,
    queueCount: 0
  },
  settings: {
    rateLimitDelay: 3,
    maxEngagementsPerHour: 20,
    engageTypes: {
      like: true,
      retweet: true,
      reply: true,
      follow: true
    },
    workingHoursOnly: false
  },
  opportunities: []
};

// Popup Message Handlers
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 CONTENT: Received message:', request.type);
  
  if (request.type === 'POPUP_REQUEST_DATA') {
    handlePopupRequestData(sendResponse);
    return true; // Keep message channel open for async response
  }
  
  if (request.type === 'POPUP_TOGGLE_AUTO_ENGAGE') {
    handleToggleAutoEngage(request.enabled, sendResponse);
    return true;
  }
  
  if (request.type === 'POPUP_LOGIN') {
    handlePopupLogin(sendResponse);
    return true;
  }
  
  if (request.type === 'POPUP_LOGOUT') {
    handlePopupLogout(sendResponse);
    return true;
  }
  
  if (request.type === 'POPUP_SAVE_SETTINGS') {
    handleSaveSettings(request.settings, sendResponse);
    return true;
  }
  
  if (request.type === 'POPUP_REFRESH_DATA') {
    handleRefreshData(sendResponse);
    return true;
  }
  
  if (request.type === 'POPUP_OPEN_DASHBOARD') {
    handleOpenDashboard(sendResponse);
    return true;
  }
  
  // Handle existing message types for backward compatibility
  if (request.type === 'GET_USER_STATS') {
    handleGetUserStats(sendResponse);
    return true;
  }
  
  if (request.type === 'CHECK_AUTH_STATUS') {
    handleCheckAuthStatus(sendResponse);
    return true;
  }
});

async function handlePopupRequestData(sendResponse) {
  try {
    console.log('📨 CONTENT: Popup requesting data...');
    
    // Update popup data with current state
    await updatePopupData();
    
    sendResponse({
      success: true,
      data: popupData
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to get popup data:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleToggleAutoEngage(enabled, sendResponse) {
  try {
    console.log('🎯 CONTENT: Toggling auto-engage:', enabled);
    
    popupData.stats.isAutoEngageActive = enabled;
    
    // Store setting
    await chrome.storage.local.set({ autoEngageEnabled: enabled });
    
    // Update the actual auto-engage functionality
    if (enabled) {
      startAutoEngage();
    } else {
      stopAutoEngage();
    }
    
    await updatePopupData();
    sendPopupUpdate();
    
    sendResponse({
      success: true,
      data: popupData
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to toggle auto-engage:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handlePopupLogin(sendResponse) {
  try {
    console.log('🔐 CONTENT: Initiating login...');
    
    // Open login page
    const loginUrl = 'https://xchangee.vercel.app/auth/signin';
    window.open(loginUrl, '_blank');
    
    sendResponse({
      success: true,
      message: 'Login page opened'
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Login failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handlePopupLogout(sendResponse) {
  try {
    console.log('🚪 CONTENT: Logging out...');
    
    // Clear local storage
    await chrome.storage.local.clear();
    
    // Update popup data
    popupData.isAuthenticated = false;
    popupData.user = null;
    
    await updatePopupData();
    sendPopupUpdate();
    
    // Open logout page if on Xchangee site
    if (window.location.hostname.includes('xchangee')) {
      window.location.href = '/auth/signin';
    }
    
    sendResponse({
      success: true,
      data: popupData
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Logout failed:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleSaveSettings(settings, sendResponse) {
  try {
    console.log('⚙️ CONTENT: Saving settings:', settings);
    
    // Update popup data
    popupData.settings = { ...popupData.settings, ...settings };
    
    // Store settings
    await chrome.storage.local.set({ xchangeeSettings: popupData.settings });
    
    sendPopupUpdate();
    
    sendResponse({
      success: true,
      data: popupData
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to save settings:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleRefreshData(sendResponse) {
  try {
    console.log('🔄 CONTENT: Refreshing popup data...');
    
    await updatePopupData();
    sendPopupUpdate();
    
    sendResponse({
      success: true,
      data: popupData
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to refresh data:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function handleOpenDashboard(sendResponse) {
  try {
    console.log('🏠 CONTENT: Opening dashboard...');
    
    const dashboardUrl = 'https://xchangee.vercel.app/dashboard';
    window.open(dashboardUrl, '_blank');
    
    sendResponse({
      success: true,
      message: 'Dashboard opened'
    });
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to open dashboard:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}

async function updatePopupData() {
  try {
    console.log('📊 CONTENT: Updating popup data...');
    
    // Check if user is authenticated
    const authData = await chrome.storage.local.get(['xchangeeToken', 'xchangeeUser']);
    
    if (authData.xchangeeToken && authData.xchangeeUser) {
      popupData.isAuthenticated = true;
      popupData.user = authData.xchangeeUser;
      
      // Get current stats
      await updateUserStats();
      
      // Get opportunities
      await updateOpportunities();
      
    } else {
      // Try to detect auth from current page if on Xchangee site
      if (window.location.hostname.includes('xchangee')) {
        await detectAuthFromPage();
      } else {
        popupData.isAuthenticated = false;
        popupData.user = null;
      }
    }
    
    // Load settings
    const settingsData = await chrome.storage.local.get(['xchangeeSettings', 'autoEngageEnabled']);
    if (settingsData.xchangeeSettings) {
      popupData.settings = { ...popupData.settings, ...settingsData.xchangeeSettings };
    }
    
    popupData.stats.isAutoEngageActive = settingsData.autoEngageEnabled || false;
    
    console.log('✅ CONTENT: Updated popup data:', popupData);
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to update popup data:', error);
  }
}

async function detectAuthFromPage() {
  try {
    // Look for user data on the page
    const userNameElements = document.querySelectorAll('[class*="user"], [class*="profile"]');
    const creditElements = document.querySelectorAll('*');
    
    let userName = null;
    let userCredits = 0;
    
    // Try to find user name
    for (const el of userNameElements) {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && !text.includes('$') && !text.includes('credits')) {
        userName = text;
        break;
      }
    }
    
    // Try to find credits
    for (const el of creditElements) {
      const text = el.textContent?.trim();
      if (text && text.includes('credits')) {
        const match = text.match(/(\d+)\s*credits?/i);
        if (match) {
          userCredits = parseInt(match[1]);
          break;
        }
      }
    }
    
    if (userName || userCredits > 0) {
      popupData.isAuthenticated = true;
      popupData.user = {
        name: userName || 'User',
        credits: userCredits,
        image: null
      };
      
      // Save detected user data
      await chrome.storage.local.set({ 
        xchangeeUser: popupData.user,
        xchangeeToken: 'detected' 
      });
    }
    
  } catch (error) {
    console.error('Failed to detect auth from page:', error);
  }
}

async function updateUserStats() {
  try {
    // If we're on Xchangee site, try to get stats from the page
    if (window.location.hostname.includes('xchangee')) {
      const stats = await getCurrentUserStatsFromPage();
      if (stats.success) {
        popupData.user.credits = stats.data.credits;
        popupData.stats.todayEarnings = stats.data.totalEarned || 0;
      }
    } else {
      // Try to fetch from API
      const authData = await chrome.storage.local.get(['xchangeeToken']);
      if (authData.xchangeeToken && authData.xchangeeToken !== 'detected') {
        try {
          const response = await fetch('https://xchangee.vercel.app/api/user/stats', {
            headers: {
              'Authorization': `Bearer ${authData.xchangeeToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            popupData.user.credits = data.credits || 0;
            popupData.stats.todayEarnings = data.todayEarnings || 0;
          }
        } catch (error) {
          console.log('Could not fetch remote stats:', error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to update user stats:', error);
  }
}

async function getCurrentUserStatsFromPage() {
  try {
    console.log('📊 Getting user stats from Xchangee page...');
    
    let foundCredits = null;
    
    // Method 1: Look for credit display elements
    const creditSelectors = [
      '[class*="credit"]',
      '[class*="balance"]', 
      '[data-testid*="credit"]',
      'span:contains("credits")',
      'div:contains("credits")'
    ];
    
    for (const selector of creditSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text) {
            const match = text.match(/(\d+)\s*credits?/i);
            if (match) {
              foundCredits = parseInt(match[1]);
              console.log('Found credits via selector:', selector, foundCredits);
              break;
            }
          }
        }
        if (foundCredits !== null) break;
      } catch (e) {
        // Selector might not be valid, continue
      }
    }
    
    // Method 2: Search all text for credit patterns
    if (foundCredits === null) {
      const allText = document.body.textContent || '';
      const creditMatches = allText.match(/(\d+)\s*credits?/gi);
      if (creditMatches && creditMatches.length > 0) {
        // Take the first reasonable number
        for (const match of creditMatches) {
          const num = parseInt(match.match(/(\d+)/)[1]);
          if (num >= 0 && num < 1000000) { // Reasonable range
            foundCredits = num;
            console.log('Found credits in page text:', foundCredits);
            break;
          }
        }
      }
    }
    
    return {
      success: foundCredits !== null,
      data: {
        credits: foundCredits || 0,
        totalEarned: 0,
        totalSpent: 0
      }
    };
    
  } catch (error) {
    console.error('Error getting stats from page:', error);
    return { success: false, error: error.message };
  }
}

async function updateOpportunities() {
  try {
    // For Twitter/X pages, look for engagement opportunities
    if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      const opportunities = [];
      
      for (let i = 0; i < Math.min(tweets.length, 5); i++) { // Limit to 5
        const tweet = tweets[i];
        const authorElement = tweet.querySelector('[data-testid="User-Name"]');
        const author = authorElement?.textContent?.trim() || 'Unknown';
        
        opportunities.push({
          type: 'Like',
          reward: 2,
          author: author.substring(0, 15), // Limit author name length
          id: `tweet_${i}`
        });
      }
      
      popupData.opportunities = opportunities;
    } else {
      // Mock opportunities for Xchangee site
      popupData.opportunities = [
        {
          type: 'Engagement',
          reward: 5,
          author: 'platform',
          id: 'mock_1'
        }
      ];
    }
    
    popupData.stats.queueCount = popupData.opportunities.length;
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to update opportunities:', error);
    popupData.opportunities = [];
    popupData.stats.queueCount = 0;
  }
}

function sendPopupUpdate() {
  // Send update to popup if it's open
  try {
    chrome.runtime.sendMessage({
      type: 'POPUP_UPDATE_DATA',
      data: popupData
    }).catch(() => {
      // Popup might not be open, ignore
    });
  } catch (error) {
    // Popup might not be open, ignore
  }
}

// Auto-engage functionality placeholders
let autoEngageInterval = null;

function startAutoEngage() {
  console.log('🚀 CONTENT: Starting auto-engage...');
  
  if (autoEngageInterval) {
    clearInterval(autoEngageInterval);
  }
  
  autoEngageInterval = setInterval(() => {
    if (popupData.stats.isAutoEngageActive) {
      performAutoEngage();
    }
  }, (popupData.settings.rateLimitDelay || 3) * 1000);
}

function stopAutoEngage() {
  console.log('⏹️ CONTENT: Stopping auto-engage...');
  
  if (autoEngageInterval) {
    clearInterval(autoEngageInterval);
    autoEngageInterval = null;
  }
}

async function performAutoEngage() {
  try {
    // Basic auto-engage logic - expand this based on existing implementation
    if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
      const likeButtons = document.querySelectorAll('[data-testid="like"]');
      
      for (let i = 0; i < Math.min(likeButtons.length, 1); i++) {
        const button = likeButtons[i];
        if (button && !button.getAttribute('aria-pressed') === 'true') {
          button.click();
          console.log('🎯 Auto-engaged: Liked a tweet');
          
          // Update stats
          popupData.stats.todayEarnings += 2;
          sendPopupUpdate();
          
          break; // Only one engagement per cycle
        }
      }
    }
  } catch (error) {
    console.error('Auto-engage error:', error);
  }
}

// Legacy handlers for backward compatibility
async function handleGetUserStats(sendResponse) {
  try {
    await updatePopupData();
    
    if (popupData.user) {
      sendResponse({
        success: true,
        data: {
          credits: popupData.user.credits || 0,
          totalEarned: popupData.stats.todayEarnings || 0,
          totalSpent: 0,
          successRate: 100
        }
      });
    } else {
      sendResponse({ success: false, error: 'User not authenticated' });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleCheckAuthStatus(sendResponse) {
  try {
    await updatePopupData();
    
    sendResponse({
      success: true,
      data: {
        isAuthenticated: popupData.isAuthenticated,
        user: popupData.user
      }
    });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Initialize popup data on load
console.log('🔌 ENHANCED CONTENT: Initializing with popup management...');
updatePopupData();

// Update popup data periodically
setInterval(() => {
  updatePopupData();
  if (popupData.stats.isAutoEngageActive) {
    sendPopupUpdate(); // Send updates to popup when auto-engage is active
  }
}, 30000); // Every 30 seconds

// Check auth status when page loads
setTimeout(updatePopupData, 2000); // Delay to let page load

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
          setTimeout(() => {
            window.xchangeeRemoteLoader.checkForUpdates().then(status => {
              if (status.hasUpdate) {
                console.log('🎯 Update found on window focus - applying');
                window.xchangeeRemoteLoader.forceRefresh();
              }
            });
          }, 1000);
        }
      });
    }
  }, 2000);
})();

// Rest of the original content script functionality would go here...
// For now, adding key fallback functions

function initializeFallbackCore() {
  console.log('🏗️ Initializing fallback core functionality...');
  // Basic fallback initialization
}

function initializeRemoteCore() {
  return new Promise((resolve, reject) => {
    // Try to initialize remote core
    if (typeof window.xchangeeRemoteLoader !== 'undefined') {
      resolve();
    } else {
      reject(new Error('Remote loader not available'));
    }
  });
}

console.log('✅ ENHANCED CONTENT: Popup management system initialized');

}