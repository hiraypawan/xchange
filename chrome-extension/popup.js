// Xchangee Chrome Extension Popup Script

document.addEventListener('DOMContentLoaded', initializePopup);

let currentUser = null;
let currentSettings = null;
let opportunities = [];

async function initializePopup() {
  try {
    // Check authentication status
    const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    
    if (authStatus.isAuthenticated) {
      await loadUserData();
      showMainContent();
    } else {
      showAuthRequired();
    }
    
    // Set up event listeners
    setupEventListeners();
    hideLoading();
    
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    hideLoading();
  }
}

function setupEventListeners() {
  // Auth
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
  
  // Navigation
  document.getElementById('settings-btn').addEventListener('click', showSettings);
  document.getElementById('back-btn').addEventListener('click', showMainContent);
  document.getElementById('open-dashboard-btn').addEventListener('click', openDashboard);
  
  // Auto-engage toggle
  document.getElementById('auto-engage-toggle').addEventListener('change', handleAutoEngageToggle);
  
  // Refresh
  document.getElementById('refresh-btn').addEventListener('click', refreshOpportunities);
  
  // Settings
  document.getElementById('save-settings-btn').addEventListener('click', saveSettings);
}

async function loadUserData() {
  try {
    // First get cached data for immediate display
    const cachedData = await chrome.storage.local.get(['userData', 'settings']);
    currentUser = cachedData.userData;
    currentSettings = cachedData.settings;
    
    // Update UI with cached data first
    if (currentUser) {
      updateUserInfo();
    }
    
    // Then fetch fresh data from API
    await fetchFreshUserData();
    
    // Load opportunities
    await loadOpportunities();
    
    // Update auto-engage status
    updateAutoEngageStatus();
    
  } catch (error) {
    console.error('Failed to load user data:', error);
  }
}

async function fetchFreshUserData() {
  try {
    console.log('Fetching fresh user data...');
    
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Only fetch if we're on the Xchangee website
    if (!tab.url || !tab.url.includes('xchangee.vercel.app')) {
      console.log('Not on Xchangee website, using cached data');
      return;
    }
    
    // Send message to content script to fetch user data
    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
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
    userNameEl.textContent = currentUser.displayName || currentUser.username;
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