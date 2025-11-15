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

// Check for updates periodically
setInterval(() => {
  checkForUpdates();
}, 10 * 1000); // Every 10 seconds

// Initialize extension data
async function initializeExtension() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'userId', 'userData', 'settings']);
    authToken = data.authToken;
    userId = data.userId;
    
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
      sendResponse({ 
        isAuthenticated: !!authToken, 
        userId,
        authToken 
      });
      break;
      
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
    
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      title: 'Xchangee',
      message: `Completed ${post.engagementType} engagement! +${post.creditsRequired} credits earned.`,
    });
    
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

// Auto-update functionality
async function checkForUpdates() {
  try {
    const currentVersion = chrome.runtime.getManifest().version;
    const response = await fetch(`${API_BASE_URL}/extension?action=version`);
    
    if (response.ok) {
      const data = await response.json();
      const latestVersion = data.version;
      
      if (isNewerVersion(latestVersion, currentVersion)) {
        // Show update notification with release notes
        const releaseNotes = data.releaseNotes || 'Latest features and bug fixes';
        chrome.notifications.create({
          type: 'basic',
          title: `Xchangee Update Available v${latestVersion}`,
          message: `🚀 ${releaseNotes}\n\nUpdating automatically in 10 seconds...`,
        });
        
        // Store update info for user to see
        await chrome.storage.local.set({
          pendingUpdate: {
            version: latestVersion,
            releaseNotes: data.releaseNotes,
            features: data.features,
            updateTime: Date.now()
          }
        });

        // Auto-update after 10 seconds
        setTimeout(async () => {
          try {
            // Show final update notification
            chrome.notifications.create({
              type: 'basic',
              title: 'Xchangee Updating Now...',
              message: `Installing v${latestVersion}. Extension will restart automatically.`,
            });

            chrome.runtime.requestUpdateCheck((status) => {
              if (status === 'update_available') {
                chrome.runtime.reload();
              } else {
                // Fallback: force reload if update check fails
                setTimeout(() => chrome.runtime.reload(), 2000);
              }
            });
          } catch (error) {
            console.error('Auto-update failed:', error);
            // Fallback: still try to reload
            chrome.runtime.reload();
          }
        }, 10000);
      }
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
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

// Post-update success notification
chrome.runtime.onStartup.addListener(async () => {
  const data = await chrome.storage.local.get(['pendingUpdate']);
  if (data.pendingUpdate) {
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      title: `🎉 Xchangee Updated to v${data.pendingUpdate.version}!`,
      message: `${data.pendingUpdate.releaseNotes}\n\nNew features are now active!`,
    });
    
    // Clear the pending update info after showing success
    await chrome.storage.local.remove(['pendingUpdate']);
  }
});

// Show authentication success notification
function showAuthSuccessNotification(userData) {
  const displayName = userData.displayName || userData.username || 'User';
  chrome.notifications.create({
    type: 'basic',
    title: '🎉 Xchangee Extension Connected!',
    message: `Welcome ${displayName}! Your extension is now connected and ready to earn credits automatically.`,
  });
}

// Keep service worker alive
setInterval(() => {
  console.log('Service worker keepalive');
}, 20000);