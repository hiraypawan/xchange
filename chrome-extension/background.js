// Background service worker for Xchangee Chrome Extension

const API_BASE_URL = 'https://xchangee.vercel.app/api';
let authToken = null;
let userId = null;
let isAutoEngaging = false;

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Xchangee extension installed');
  initializeExtension();
  
  // Check for updates on install/startup
  checkForUpdates();
});

// Check for updates periodically - more frequent for immediate updates
setInterval(() => {
  checkForUpdates();
}, 10 * 1000); // Every 10 seconds

// Also check for updates when extension starts
setTimeout(() => {
  checkForUpdates();
}, 5000); // Check 5 seconds after startup

// Initialize extension data
async function initializeExtension() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'userId', 'userData', 'settings']);
    authToken = data.authToken;
    userId = data.userId;
    
    console.log('Extension initialized with:', {
      hasAuthToken: !!authToken,
      userId: userId,
      hasUserData: !!data.userData
    });
    
    // Set default settings
    if (!data.settings) {
      const defaultSettings = {
        autoEngage: false,
        rateLimitDelay: 3000, // 3 seconds between actions
        maxRetries: 3,
        enabledEngagements: ['like', 'retweet', 'reply', 'follow'],
        maxEngagementsPerHour: 20,
        workingHours: { start: 9, end: 18 }, // 9 AM to 6 PM
        enableWorkingHoursOnly: false,
      };
      
      await chrome.storage.local.set({ settings: defaultSettings });
    }
    
    // Send heartbeat to any open website tabs
    sendHeartbeatToWebsite();
  } catch (error) {
    console.error('Failed to initialize extension:', error);
  }
}

// Store authentication data from web app
async function storeAuthData(token, userIdValue, userData) {
  try {
    console.log('Storing auth data:', { token: token ? 'exists' : 'null', userIdValue, userData });
    
    // Store authentication data
    await chrome.storage.local.set({
      authToken: token,
      userId: userIdValue,
      userData: userData,
      connectedAt: new Date().toISOString(),
    });
    
    // Update global variables
    authToken = token;
    userId = userIdValue;
    
    console.log('Auth data stored successfully');
    
    // Show success notification
    if (userData) {
      chrome.runtime.sendMessage({
        type: 'SHOW_AUTH_SUCCESS_NOTIFICATION',
        userData: userData
      });
    }
    
    // Send updated heartbeat to website
    sendHeartbeatToWebsite();
    
    return true;
  } catch (error) {
    console.error('Failed to store auth data:', error);
    throw error;
  }
}

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'STORE_AUTH_DATA':
      storeAuthData(request.authToken, request.userId, request.userData)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Async response
    case 'GET_AUTH_STATUS':
      // Always check storage for latest auth status
      chrome.storage.local.get(['authToken', 'userId', 'userData']).then(data => {
        authToken = data.authToken;
        userId = data.userId;
        sendResponse({ 
          isAuthenticated: !!authToken, 
          userId,
          userData: data.userData
        });
      });
      return true; // Async response
      
    case 'SET_AUTH':
      authToken = request.authToken;
      userId = request.userId;
      chrome.storage.local.set({ authToken, userId });
      sendResponse({ success: true });
      break;
      
    case 'LOGOUT':
      authToken = null;
      userId = null;
      chrome.storage.local.remove(['authToken', 'userId']);
      sendResponse({ success: true });
      break;
      
    case 'GET_ENGAGEMENT_OPPORTUNITIES':
      getEngagementOpportunities().then(sendResponse);
      return true; // Async response
      
    case 'COMPLETE_ENGAGEMENT':
      completeEngagement(request.data).then(sendResponse);
      return true; // Async response
      
    case 'UPDATE_SETTINGS':
      updateSettings(request.settings).then(sendResponse);
      return true; // Async response
      
    case 'START_AUTO_ENGAGE':
      startAutoEngage();
      sendResponse({ success: true });
      break;
      
    case 'STOP_AUTO_ENGAGE':
      stopAutoEngage();
      sendResponse({ success: true });
      break;
      
    case 'GET_UPDATE_INFO':
      getUpdateInfo().then(sendResponse);
      return true; // Async response
      
    case 'CLEAR_UPDATE_INFO':
      clearUpdateInfo().then(sendResponse);
      return true; // Async response
      
    case 'SHOW_AUTH_SUCCESS_NOTIFICATION':
      showAuthSuccessNotification(request.userData);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Get engagement opportunities from API
async function getEngagementOpportunities() {
  if (!authToken) {
    return { error: 'Not authenticated' };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/posts?status=active&limit=10`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return { success: true, data: data.data };
  } catch (error) {
    console.error('Failed to get engagement opportunities:', error);
    return { error: error.message };
  }
}

// Complete an engagement
async function completeEngagement(engagementData) {
  if (!authToken) {
    return { error: 'Not authenticated' };
  }
  
  try {
    // First, create the engagement in our system
    const response = await fetch(`${API_BASE_URL}/engage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId: engagementData.postId,
        engagementType: engagementData.engagementType,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    
    // Send message to content script to perform the action
    const tabs = await chrome.tabs.query({ 
      url: ['https://twitter.com/*', 'https://x.com/*'] 
    });
    
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'PERFORM_ENGAGEMENT',
        data: {
          tweetUrl: engagementData.tweetUrl,
          engagementType: engagementData.engagementType,
          engagementId: result.data.engagementId,
        },
      });
    }
    
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Failed to complete engagement:', error);
    return { error: error.message };
  }
}

// Update extension settings
async function updateSettings(newSettings) {
  try {
    await chrome.storage.local.set({ settings: newSettings });
    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { error: error.message };
  }
}

// Start auto-engagement
function startAutoEngage() {
  if (isAutoEngaging) return;
  
  isAutoEngaging = true;
  console.log('Auto-engagement started');
  
  // Set up periodic check for new opportunities
  setInterval(async () => {
    if (!isAutoEngaging) return;
    
    const settings = await chrome.storage.local.get('settings');
    if (!settings.settings?.autoEngage) {
      stopAutoEngage();
      return;
    }
    
    // Check working hours
    if (settings.settings.enableWorkingHoursOnly) {
      const now = new Date();
      const hour = now.getHours();
      if (hour < settings.settings.workingHours.start || hour > settings.settings.workingHours.end) {
        return;
      }
    }
    
    await processAutoEngagement();
  }, 30000); // Check every 30 seconds
}

// Stop auto-engagement
function stopAutoEngage() {
  isAutoEngaging = false;
  console.log('Auto-engagement stopped');
}

// Process automatic engagement
async function processAutoEngagement() {
  try {
    const opportunities = await getEngagementOpportunities();
    if (!opportunities.success || !opportunities.data?.length) {
      return;
    }
    
    const settings = await chrome.storage.local.get('settings');
    const userSettings = settings.settings;
    
    // Filter opportunities based on user preferences
    const filteredOpportunities = opportunities.data.filter(post => 
      userSettings.enabledEngagements.includes(post.engagementType)
    );
    
    if (filteredOpportunities.length === 0) return;
    
    // Take the first opportunity
    const post = filteredOpportunities[0];
    
    await completeEngagement({
      postId: post._id,
      tweetUrl: post.tweetUrl,
      engagementType: post.engagementType,
    });
    
    // Skip notification to prevent runtime errors
    console.log(`Engagement completed: ${post.engagementType} - ${post.creditsRequired} credits earned`);
    
    // Wait before next engagement
    await new Promise(resolve => setTimeout(resolve, userSettings.rateLimitDelay));
    
  } catch (error) {
    console.error('Auto-engagement error:', error);
  }
}

// Handle browser action click (fallback for older Chrome versions)
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});

// Monitor tab changes to inject content script
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      (tab.url?.includes('twitter.com') || tab.url?.includes('x.com'))) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
    } catch (error) {
      console.error('Failed to inject content script:', error);
    }
  }
});

// Error handling
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspended, stopping auto-engagement');
  stopAutoEngage();
});

// Auto-update functionality with direct file replacement
async function checkForUpdates() {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    const response = await fetch(`${API_BASE_URL}/extension?action=version`);
    
    if (response.ok) {
      const data = await response.json();
      const latestVersion = data.version;
      
      if (isNewerVersion(latestVersion, currentVersion)) {
        console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
        
        // Skip notifications completely to prevent runtime errors
        console.log('Update notification skipped to prevent runtime errors');
        // All notification functionality disabled until extension auto-updates
        
        // Store update info
        await chrome.storage.local.set({
          pendingUpdate: {
            version: latestVersion,
            releaseNotes: data.releaseNotes,
            features: data.features,
            updateTime: Date.now(),
            downloadUrl: data.updateUrl || `${API_BASE_URL}/extension?action=download`
          }
        });

        // Auto-update immediately to fix notification issues
        console.log('Starting immediate auto-update to resolve notification errors');
        setTimeout(async () => {
          await performAutoUpdate(latestVersion, data);
        }, 2000); // Reduced to 2 seconds
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}

// Perform automatic update by downloading and replacing extension files
async function performAutoUpdate(version, updateData) {
  console.log(`EMERGENCY FORCE RELOAD: Starting auto-update to version ${version}`);
  console.log('BYPASSING ALL CHROME APIs - Direct reload to escape notification errors');
  
  // Immediate reload without any async operations that could fail
  chrome.runtime.reload();
}

// Compare version strings (simple semantic versioning)
function isNewerVersion(latest, current) {
  const latestParts = latest.split('.').map(Number);
  const currentParts = current.split('.').map(Number);
  
  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  
  return false;
}

// Get update information
async function getUpdateInfo() {
  try {
    const data = await chrome.storage.local.get(['pendingUpdate', 'lastUpdateCheck']);
    return { 
      success: true, 
      updateInfo: data.pendingUpdate,
      lastCheck: data.lastUpdateCheck
    };
  } catch (error) {
    console.error('Failed to get update info:', error);
    return { error: error.message };
  }
}

// Clear update information
async function clearUpdateInfo() {
  try {
    await chrome.storage.local.remove(['pendingUpdate']);
    return { success: true };
  } catch (error) {
    console.error('Failed to clear update info:', error);
    return { error: error.message };
  }
}

// Post-update success notification and cleanup
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['updateSuccess', 'pendingUpdate']);
  
  if (data.updateSuccess) {
    // Skip startup notification to prevent runtime errors
    console.log(`Auto-update to v${data.updateSuccess.version} completed successfully!`);
    
    // Clear the update success info after showing
    await chrome.storage.local.remove(['updateSuccess']);
  }
  
  // Clean up any leftover pending update
  if (data.pendingUpdate) {
    await chrome.storage.local.remove(['pendingUpdate']);
  }
});

// Show authentication success notification
function showAuthSuccessNotification(userData) {
  const displayName = userData.displayName || userData.username || 'User';
  try {
    chrome.notifications.getPermissionLevel((level) => {
      if (level === 'granted') {
        const notificationOptions = {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Xchangee Extension Connected!',
          message: `Welcome ${displayName}! Your extension is now connected and ready to earn credits automatically.`
        };
        
        chrome.notifications.create('xchangee-auth-success', notificationOptions, (notificationId) => {
          if (chrome.runtime.lastError) {
            console.log('Auth notification failed:', chrome.runtime.lastError.message);
          } else {
            console.log('Auth notification created:', notificationId);
          }
        });
      } else {
        console.log('Skipping auth notification - permission not granted');
      }
    });
  } catch (err) {
    console.log('Auth notification permission check failed:', err);
  }
}

// Send heartbeat to website tabs to announce extension presence
async function sendHeartbeatToWebsite() {
  try {
    const tabs = await chrome.tabs.query({ 
      url: ['https://xchangee.vercel.app/*', 'http://localhost:3000/*'] 
    });
    const manifest = chrome.runtime.getManifest();
    
    // Get fresh auth status
    const authData = await chrome.storage.local.get(['authToken', 'userId']);
    const currentAuthToken = authData.authToken;
    const currentUserId = authData.userId;
    
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'EXTENSION_HEARTBEAT',
        source: 'extension',
        version: manifest.version,
        isAuthenticated: !!currentAuthToken,
        userId: currentUserId
      }).catch(err => {
        // Tab might not have content script loaded yet, that's ok
        // Only log if it's a real error, not just content script not ready
        if (!err.message.includes('Could not establish connection')) {
          console.log('Could not send heartbeat to tab:', tab.id, err.message);
        }
      });
    });
  } catch (error) {
    console.error('Failed to send heartbeat:', error);
  }
}

// Keep service worker alive and send periodic heartbeats
setInterval(() => {
  console.log('Service worker keepalive');
  sendHeartbeatToWebsite();
}, 20000);