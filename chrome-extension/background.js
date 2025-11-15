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
}, 10 * 60 * 1000); // Every 10 minutes

// Initialize extension data
async function initializeExtension() {
  try {
    const data = await chrome.storage.local.get(['authToken', 'userId', 'settings']);
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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
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
      iconUrl: 'icons/icon48.png',
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
        // Show update notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icons/icon48.png',
          title: 'Xchangee Extension Update Available',
          message: `Version ${latestVersion} is available. The extension will update automatically.`,
        });
        
        // Auto-update after 10 seconds
        setTimeout(async () => {
          try {
            chrome.runtime.requestUpdateCheck((status) => {
              if (status === 'update_available') {
                chrome.runtime.reload();
              }
            });
          } catch (error) {
            console.error('Auto-update failed:', error);
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

// Keep service worker alive
setInterval(() => {
  console.log('Service worker keepalive');
}, 20000);