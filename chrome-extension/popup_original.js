// Xchangee Chrome Extension Popup Script - New Architecture
// All logic now handled by content script, popup just displays data

document.addEventListener('DOMContentLoaded', initializePopup);

let popupData = null;

async function initializePopup() {
  try {
    console.log('🎯 NEW POPUP: Initializing...');
    
    // Get data from content script (which handles all logic)
    await loadPopupData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Update display
    updateUI();
    
    hideLoading();
    
  } catch (error) {
    console.error('❌ NEW POPUP: Failed to initialize:', error);
    showError('Failed to initialize popup: ' + error.message);
    hideLoading();
  }
}

async function loadPopupData() {
  try {
    console.log('📨 NEW POPUP: Requesting data from content script...');
    
    // Find the active Xchangee tab
    const tabs = await chrome.tabs.query({ url: '*://xchangee.vercel.app/*' });
    
    if (tabs.length === 0) {
      throw new Error('Please open Xchangee website (xchangee.vercel.app) to use the extension');
    }
    
    const tab = tabs[0];
    console.log('📍 NEW POPUP: Found Xchangee tab:', tab.url);
    
    // Request data from content script
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_POPUP_DATA'
    });
    
    if (response.success) {
      popupData = response.data;
      console.log('✅ NEW POPUP: Data received:', popupData);
    } else {
      throw new Error(response.error || 'Failed to get popup data');
    }
    
  } catch (error) {
    console.error('❌ NEW POPUP: Failed to load data:', error);
    throw error;
  }
}

function setupEventListeners() {
  console.log('🔧 NEW POPUP: Setting up event listeners...');
  
  try {
    // Navigation
    const settingsBtn = document.getElementById('settings-btn');
    const backBtn = document.getElementById('back-btn');
    const openDashboardBtn = document.getElementById('open-dashboard-btn');
    
    if (settingsBtn) settingsBtn.addEventListener('click', showSettings);
    if (backBtn) backBtn.addEventListener('click', showMainContent);
    if (openDashboardBtn) openDashboardBtn.addEventListener('click', handleOpenDashboard);
    
    // Auto-engage toggle
    const autoEngageToggle = document.getElementById('auto-engage-toggle');
    if (autoEngageToggle) {
      autoEngageToggle.addEventListener('change', handleAutoEngageToggle);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', handleRefresh);
    }
    
    // Settings save
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', saveSettings);
    }
    
    console.log('✅ NEW POPUP: Event listeners set up');
  } catch (error) {
    console.error('❌ NEW POPUP: Failed to set up event listeners:', error);
  }
}

// NEW POPUP: Update UI with data from content script
function updateUI() {
  try {
    console.log('🎨 NEW POPUP: Updating UI with data:', popupData);
    
    if (!popupData) {
      showError('No data available');
      return;
    }
    
    if (popupData.currentUser) {
      showMainContent();
      updateUserInfo();
      updateOpportunities();
      updateAutoEngageStatus();
    } else {
      showAuthRequired();
    }
    
  } catch (error) {
    console.error('❌ NEW POPUP: Failed to update UI:', error);
    showError('Failed to update UI: ' + error.message);
  }
}

async function fetchFreshUserData() {
  try {
    console.log('Fetching fresh user data...');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Try to find Xchangee website tab, or use active tab if it's Xchangee
    let xchangeeTab = tab;
    if (!tab.url || !tab.url.includes('xchangee.vercel.app')) {
      console.log('Active tab is not Xchangee, looking for Xchangee tabs...');
      
      // Look for any open Xchangee tabs
      const allTabs = await chrome.tabs.query({ url: '*://xchangee.vercel.app/*' });
      if (allTabs.length > 0) {
        xchangeeTab = allTabs[0];
        console.log('Found Xchangee tab:', xchangeeTab.url);
      } else {
        console.log('No Xchangee website tabs found, using cached data');
        return;
      }
    }
    
    // Send message to content script to fetch user data
    try {
      const response = await chrome.tabs.sendMessage(xchangeeTab.id, {
        type: 'GET_USER_STATS'
      });
      
      if (response && response.success && response.data) {
        console.log('Fresh user data received from website:', response.data);
        
        // Update user data with fresh stats
        const freshUserData = {
          ...currentUser,
          credits: response.data.credits,
          totalEarned: response.data.totalEarned,
          totalSpent: response.data.totalSpent,
          successRate: response.data.successRate
        };
        
        // Update current user and storage
        currentUser = freshUserData;
        await chrome.storage.local.set({ userData: freshUserData });
        
        // Update UI with fresh data
        updateUserInfo();
        
        console.log('Fresh user data updated:', freshUserData.credits, 'credits');
      } else {
        console.warn('No valid response from content script:', response);
      }
    } catch (messageError) {
      console.warn('Failed to communicate with content script:', messageError);
      // Fall back to cached data
    }
  } catch (error) {
    console.warn('Failed to fetch fresh user data:', error);
    // Continue with cached data
  }
}

function updateUserInfo() {
  const userNameEl = document.getElementById('user-name');
  const userCreditsEl = document.getElementById('user-credits');
  const userAvatarEl = document.getElementById('user-avatar');
  const userInitialsEl = document.getElementById('user-initials');
  
  if (currentUser) {
    userNameEl.textContent = 'Hello ' + (currentUser.displayName || currentUser.username);
    
    console.log('Extension popup - updating credits display:', {
      credits: currentUser.credits,
      creditsType: typeof currentUser.credits,
      fallbackValue: currentUser.credits || 0,
      fullUser: currentUser
    });
    
    userCreditsEl.textContent = `${currentUser.credits || 0} credits`;
    
    if (currentUser.avatar) {
      userAvatarEl.src = currentUser.avatar;
      userAvatarEl.style.display = 'block';
      userInitialsEl.style.display = 'none';
    } else {
      const initials = (currentUser.displayName || currentUser.username || 'U')
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
      
      userInitialsEl.textContent = initials;
      userInitialsEl.style.display = 'flex';
      userAvatarEl.style.display = 'none';
    }
  }
}

async function loadOpportunities() {
  try {
    const response = await chrome.runtime.sendMessage({ 
      type: 'GET_ENGAGEMENT_OPPORTUNITIES' 
    });
    
    if (response.success) {
      opportunities = response.data || [];
      updateOpportunitiesList();
      updateQueueCount();
    }
  } catch (error) {
    console.error('Failed to load opportunities:', error);
  }
}

function updateOpportunitiesList() {
  const listEl = document.getElementById('opportunities-list');
  
  if (opportunities.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <p>No opportunities available</p>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = opportunities.slice(0, 5).map(opportunity => `
    <div class="opportunity-item" data-post-id="${opportunity._id}">
      <div class="opportunity-info">
        <span class="opportunity-type ${opportunity.engagementType}">${opportunity.engagementType}</span>
        <div class="opportunity-author">@${opportunity.author.username}</div>
      </div>
      <div class="opportunity-credits">+${opportunity.creditsRequired}</div>
    </div>
  `).join('');
  
  // Add click handlers
  listEl.querySelectorAll('.opportunity-item').forEach(item => {
    item.addEventListener('click', () => {
      const postId = item.dataset.postId;
      const opportunity = opportunities.find(o => o._id === postId);
      if (opportunity) {
        handleEngageClick(opportunity);
      }
    });
  });
}

function updateQueueCount() {
  const queueCountEl = document.getElementById('queue-count');
  queueCountEl.textContent = opportunities.length;
}

function updateAutoEngageStatus() {
  const toggleEl = document.getElementById('auto-engage-toggle');
  const statusEl = document.getElementById('auto-engage-status');
  
  const isAutoEngaging = currentSettings?.autoEngage || false;
  toggleEl.checked = isAutoEngaging;
  statusEl.textContent = isAutoEngaging ? 'ON' : 'OFF';
  statusEl.style.color = isAutoEngaging ? '#16a34a' : '#dc2626';
}

async function handleLogin() {
  try {
    // Open authentication tab
    const authUrl = 'https://xchangee.vercel.app/auth/signin';
    await chrome.tabs.create({ url: authUrl });
    
    // Close popup
    window.close();
  } catch (error) {
    console.error('Failed to handle login:', error);
  }
}

async function handleLogout() {
  try {
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    await chrome.storage.local.clear();
    showAuthRequired();
  } catch (error) {
    console.error('Failed to logout:', error);
  }
}

async function handleAutoEngageToggle(event) {
  const isEnabled = event.target.checked;
  
  try {
    if (isEnabled) {
      await chrome.runtime.sendMessage({ type: 'START_AUTO_ENGAGE' });
    } else {
      await chrome.runtime.sendMessage({ type: 'STOP_AUTO_ENGAGE' });
    }
    
    // Update settings
    currentSettings = { ...currentSettings, autoEngage: isEnabled };
    await chrome.storage.local.set({ settings: currentSettings });
    
    updateAutoEngageStatus();
    
  } catch (error) {
    console.error('Failed to toggle auto-engage:', error);
    // Revert toggle
    event.target.checked = !isEnabled;
  }
}

async function handleEngageClick(opportunity) {
  try {
    showNotification('Processing engagement...', 'info');
    
    const response = await chrome.runtime.sendMessage({
      type: 'COMPLETE_ENGAGEMENT',
      data: {
        postId: opportunity._id,
        tweetUrl: opportunity.tweetUrl,
        engagementType: opportunity.engagementType,
      },
    });
    
    if (response.success) {
      showNotification(`+${opportunity.creditsRequired} credits earned!`, 'success');
      
      // Fetch fresh user data to get accurate credits
      await fetchFreshUserData();
      
      // Refresh opportunities
      await loadOpportunities();
      
    } else {
      showNotification(response.error || 'Failed to complete engagement', 'error');
    }
    
  } catch (error) {
    console.error('Engagement error:', error);
    showNotification('Failed to complete engagement', 'error');
  }
}

async function refreshOpportunities() {
  const refreshBtn = document.getElementById('refresh-btn');
  
  try {
    refreshBtn.style.transform = 'rotate(360deg)';
    await loadOpportunities();
    showNotification('Opportunities updated', 'success');
  } catch (error) {
    console.error('Failed to refresh:', error);
    showNotification('Failed to refresh', 'error');
  } finally {
    setTimeout(() => {
      refreshBtn.style.transform = 'none';
    }, 500);
  }
}

function showSettings() {
  // Load current settings
  if (currentSettings) {
    document.getElementById('rate-limit-input').value = 
      (currentSettings.rateLimitDelay || 3000) / 1000;
    document.getElementById('max-engagements-input').value = 
      currentSettings.maxEngagementsPerHour || 20;
    
    // Engagement types
    const enabledEngagements = currentSettings.enabledEngagements || ['like', 'retweet', 'reply', 'follow'];
    document.getElementById('engage-like').checked = enabledEngagements.includes('like');
    document.getElementById('engage-retweet').checked = enabledEngagements.includes('retweet');
    document.getElementById('engage-reply').checked = enabledEngagements.includes('reply');
    document.getElementById('engage-follow').checked = enabledEngagements.includes('follow');
    
    document.getElementById('working-hours-only').checked = 
      currentSettings.enableWorkingHoursOnly || false;
  }
  
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'block';
}

function showMainContent() {
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('auth-required').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
}

function showAuthRequired() {
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('settings-panel').style.display = 'none';
  document.getElementById('auth-required').style.display = 'block';
}

function hideLoading() {
  document.getElementById('loading').style.display = 'none';
}

// Handle login via website
async function handleLogin() {
  try {
    // Open the main website for authentication
    const authUrl = 'https://xchangee.vercel.app/auth/extension';
    await chrome.tabs.create({ url: authUrl });
    
    // Close the popup
    window.close();
  } catch (error) {
    console.error('Login failed:', error);
    showError('Failed to open login page');
  }
}

// Handle logout
async function handleLogout() {
  try {
    // Clear all stored auth data
    await chrome.storage.local.clear();
    
    // Send logout message to background script
    await chrome.runtime.sendMessage({ type: 'LOGOUT' });
    
    // Reset UI
    currentUser = null;
    currentSettings = null;
    showAuthRequired();
    
  } catch (error) {
    console.error('Logout failed:', error);
  }
}

async function saveSettings() {
  try {
    const newSettings = {
      ...currentSettings,
      rateLimitDelay: parseInt(document.getElementById('rate-limit-input').value) * 1000,
      maxEngagementsPerHour: parseInt(document.getElementById('max-engagements-input').value),
      enabledEngagements: [
        ...(document.getElementById('engage-like').checked ? ['like'] : []),
        ...(document.getElementById('engage-retweet').checked ? ['retweet'] : []),
        ...(document.getElementById('engage-reply').checked ? ['reply'] : []),
        ...(document.getElementById('engage-follow').checked ? ['follow'] : []),
      ],
      enableWorkingHoursOnly: document.getElementById('working-hours-only').checked,
    };
    
    await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTINGS',
      settings: newSettings,
    });
    
    currentSettings = newSettings;
    await chrome.storage.local.set({ settings: newSettings });
    
    showNotification('Settings saved', 'success');
    showMainContent();
    
  } catch (error) {
    console.error('Failed to save settings:', error);
    showNotification('Failed to save settings', 'error');
  }
}

async function openDashboard() {
  try {
    await chrome.tabs.create({ url: 'https://xchangee.vercel.app/dashboard' });
    window.close();
  } catch (error) {
    console.error('Failed to open dashboard:', error);
  }
}

function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Style the notification
  Object.assign(notification.style, {
    position: 'fixed',
    top: '10px',
    right: '10px',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    zIndex: '1000',
    color: 'white',
    background: type === 'success' ? '#16a34a' : 
                type === 'error' ? '#dc2626' : 
                type === 'warning' ? '#d97706' : '#3b82f6',
  });
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// Listen for auth updates from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_UPDATE') {
    loadUserData().then(() => {
      showMainContent();
    });
  }
});