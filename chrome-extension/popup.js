// Minimal Popup Script - New Architecture
// All logic now handled by content script, popup is just a display window

document.addEventListener('DOMContentLoaded', initializePopup);

let currentTabId = null;
let messagePort = null;

async function initializePopup() {
  try {
    console.log('🎯 POPUP: Initializing minimal popup...');
    
    // Find active tab with Twitter/X or Xchangee
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs[0];
    
    // Check if it's a supported site
    if (isXchangeeSupportedSite(activeTab.url)) {
      currentTabId = activeTab.id;
      await connectToContentScript();
    } else {
      // Try to find any open Xchangee/Twitter tab
      const xchangeeTabs = await chrome.tabs.query({ 
        url: ['*://xchangee.vercel.app/*', '*://twitter.com/*', '*://x.com/*'] 
      });
      
      if (xchangeeTabs.length > 0) {
        currentTabId = xchangeeTabs[0].id;
        await connectToContentScript();
      } else {
        showNotSupportedMessage();
        return;
      }
    }
    
    setupEventListeners();
    
  } catch (error) {
    console.error('❌ POPUP: Failed to initialize:', error);
    showError('Failed to initialize: ' + error.message);
  }
}

function isXchangeeSupportedSite(url) {
  if (!url) return false;
  return url.includes('xchangee.vercel.app') || 
         url.includes('twitter.com') || 
         url.includes('x.com') ||
         url.includes('localhost:3000') ||
         url.includes('localhost:3001');
}

async function connectToContentScript() {
  try {
    console.log('📡 POPUP: Connecting to content script...');
    
    // Request initial popup data
    const response = await chrome.tabs.sendMessage(currentTabId, {
      type: 'POPUP_REQUEST_DATA',
      timestamp: Date.now()
    });
    
    if (response && response.success) {
      console.log('✅ POPUP: Connected successfully');
      updateUI(response.data);
      hideLoading();
    } else {
      throw new Error('Failed to connect to content script');
    }
    
  } catch (error) {
    console.error('❌ POPUP: Connection failed:', error);
    showError('Please refresh the page and try again');
  }
}

function setupEventListeners() {
  // Auto-engage toggle
  const autoEngageToggle = document.getElementById('auto-engage-toggle');
  if (autoEngageToggle) {
    autoEngageToggle.addEventListener('change', async (e) => {
      await sendMessageToContent({
        type: 'POPUP_TOGGLE_AUTO_ENGAGE',
        enabled: e.target.checked
      });
    });
  }
  
  // Login button
  const loginBtn = document.getElementById('login-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      await sendMessageToContent({ type: 'POPUP_LOGIN' });
    });
  }
  
  // Logout button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await sendMessageToContent({ type: 'POPUP_LOGOUT' });
    });
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      showSettings();
    });
  }
  
  // Back button in settings
  const backBtn = document.getElementById('back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      hideSettings();
    });
  }
  
  // Save settings button
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async () => {
      const settings = collectSettings();
      await sendMessageToContent({
        type: 'POPUP_SAVE_SETTINGS',
        settings: settings
      });
    });
  }
  
  // Refresh button
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await sendMessageToContent({ type: 'POPUP_REFRESH_DATA' });
    });
  }
  
  // Open dashboard button
  const openDashboardBtn = document.getElementById('open-dashboard-btn');
  if (openDashboardBtn) {
    openDashboardBtn.addEventListener('click', async () => {
      await sendMessageToContent({ type: 'POPUP_OPEN_DASHBOARD' });
    });
  }
}

async function sendMessageToContent(message) {
  if (!currentTabId) {
    console.error('❌ POPUP: No active tab ID');
    return;
  }
  
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, message);
    
    if (response && response.success && response.data) {
      // Update UI with new data
      updateUI(response.data);
    }
    
    return response;
    
  } catch (error) {
    console.error('❌ POPUP: Failed to send message:', error);
    showError('Connection lost. Please refresh the page.');
  }
}

function updateUI(data) {
  if (!data) return;
  
  console.log('🎨 POPUP: Updating UI with data:', data);
  
  // Update authentication state
  if (data.isAuthenticated) {
    showMainContent();
    updateUserInfo(data.user);
    updateStats(data.stats);
    updateSettings(data.settings);
    updateOpportunities(data.opportunities || []);
  } else {
    showAuthRequired();
  }
}

function updateUserInfo(user) {
  if (!user) return;
  
  const userName = document.getElementById('user-name');
  const userCredits = document.getElementById('user-credits');
  const userAvatar = document.getElementById('user-avatar');
  const userInitials = document.getElementById('user-initials');
  
  if (userName) userName.textContent = user.name || 'User';
  if (userCredits) userCredits.textContent = `${user.credits || 0} credits`;
  
  if (user.image && userAvatar) {
    userAvatar.src = user.image;
    userAvatar.style.display = 'block';
    if (userInitials) userInitials.style.display = 'none';
  } else if (userInitials && user.name) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    userInitials.textContent = initials;
    userInitials.style.display = 'block';
    if (userAvatar) userAvatar.style.display = 'none';
  }
}

function updateStats(stats) {
  if (!stats) return;
  
  const todayEarnings = document.getElementById('today-earnings');
  const autoEngageStatus = document.getElementById('auto-engage-status');
  const queueCount = document.getElementById('queue-count');
  const autoEngageToggle = document.getElementById('auto-engage-toggle');
  
  if (todayEarnings) todayEarnings.textContent = `+${stats.todayEarnings || 0}`;
  if (autoEngageStatus) autoEngageStatus.textContent = stats.isAutoEngageActive ? 'ON' : 'OFF';
  if (queueCount) queueCount.textContent = stats.queueCount || 0;
  if (autoEngageToggle) autoEngageToggle.checked = stats.isAutoEngageActive || false;
}

function updateSettings(settings) {
  if (!settings) return;
  
  const rateLimitInput = document.getElementById('rate-limit-input');
  const maxEngagementsInput = document.getElementById('max-engagements-input');
  const engageLike = document.getElementById('engage-like');
  const engageRetweet = document.getElementById('engage-retweet');
  const engageReply = document.getElementById('engage-reply');
  const engageFollow = document.getElementById('engage-follow');
  const workingHoursOnly = document.getElementById('working-hours-only');
  
  if (rateLimitInput) rateLimitInput.value = settings.rateLimitDelay || 3;
  if (maxEngagementsInput) maxEngagementsInput.value = settings.maxEngagementsPerHour || 20;
  if (engageLike) engageLike.checked = settings.engageTypes?.like !== false;
  if (engageRetweet) engageRetweet.checked = settings.engageTypes?.retweet !== false;
  if (engageReply) engageReply.checked = settings.engageTypes?.reply !== false;
  if (engageFollow) engageFollow.checked = settings.engageTypes?.follow !== false;
  if (workingHoursOnly) workingHoursOnly.checked = settings.workingHoursOnly || false;
}

function updateOpportunities(opportunities) {
  const opportunitiesList = document.getElementById('opportunities-list');
  if (!opportunitiesList) return;
  
  opportunitiesList.innerHTML = '';
  
  if (opportunities.length === 0) {
    opportunitiesList.innerHTML = '<p class="no-opportunities">No opportunities available</p>';
    return;
  }
  
  opportunities.forEach(opportunity => {
    const item = createOpportunityElement(opportunity);
    opportunitiesList.appendChild(item);
  });
}

function createOpportunityElement(opportunity) {
  const div = document.createElement('div');
  div.className = 'opportunity-item';
  div.innerHTML = `
    <div class="opportunity-content">
      <span class="opportunity-type">${opportunity.type}</span>
      <span class="opportunity-reward">+${opportunity.reward} credits</span>
    </div>
    <div class="opportunity-author">@${opportunity.author}</div>
  `;
  return div;
}

function collectSettings() {
  return {
    rateLimitDelay: parseInt(document.getElementById('rate-limit-input')?.value) || 3,
    maxEngagementsPerHour: parseInt(document.getElementById('max-engagements-input')?.value) || 20,
    engageTypes: {
      like: document.getElementById('engage-like')?.checked !== false,
      retweet: document.getElementById('engage-retweet')?.checked !== false,
      reply: document.getElementById('engage-reply')?.checked !== false,
      follow: document.getElementById('engage-follow')?.checked !== false
    },
    workingHoursOnly: document.getElementById('working-hours-only')?.checked || false
  };
}

// UI State Management
function showMainContent() {
  const elements = {
    loading: document.getElementById('loading'),
    authRequired: document.getElementById('auth-required'),
    mainContent: document.getElementById('main-content')
  };
  
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.authRequired) elements.authRequired.style.display = 'none';
  if (elements.mainContent) elements.mainContent.style.display = 'block';
}

function showAuthRequired() {
  const elements = {
    loading: document.getElementById('loading'),
    authRequired: document.getElementById('auth-required'),
    mainContent: document.getElementById('main-content')
  };
  
  if (elements.loading) elements.loading.style.display = 'none';
  if (elements.authRequired) elements.authRequired.style.display = 'block';
  if (elements.mainContent) elements.mainContent.style.display = 'none';
}

function showSettings() {
  const mainContent = document.getElementById('main-content');
  const settingsPanel = document.getElementById('settings-panel');
  
  if (mainContent) mainContent.style.display = 'none';
  if (settingsPanel) settingsPanel.style.display = 'block';
}

function hideSettings() {
  const mainContent = document.getElementById('main-content');
  const settingsPanel = document.getElementById('settings-panel');
  
  if (mainContent) mainContent.style.display = 'block';
  if (settingsPanel) settingsPanel.style.display = 'none';
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function showNotSupportedMessage() {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="not-supported-container">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <h1>Xchangee</h1>
        </div>
        <p>Please visit Twitter/X or Xchangee website to use this extension</p>
        <button onclick="chrome.tabs.create({url: 'https://twitter.com'})" class="btn-primary">
          Open Twitter
        </button>
      </div>
    `;
  }
}

function showError(message) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div class="error-container">
        <div class="logo">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <h1>Xchangee</h1>
        </div>
        <p class="error-message">${message}</p>
        <button onclick="window.location.reload()" class="btn-primary">
          Try Again
        </button>
      </div>
    `;
  }
}

// Listen for messages from content script (for real-time updates)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'POPUP_UPDATE_DATA') {
    console.log('📨 POPUP: Received data update from content script');
    updateUI(message.data);
  }
});