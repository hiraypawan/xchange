// Content script for Xchangee Chrome Extension - runs on Twitter/X pages

let isProcessing = false;
let observer = null;

// Initialize content script
(function() {
  console.log('Xchangee content script loaded');
  
  // Check which domain we're on and initialize accordingly
  if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
    setupTwitterIntegration();
  } else if (window.location.hostname.includes('xchangee.vercel.app') || window.location.hostname.includes('localhost')) {
    setupXchangeeWebsiteIntegration();
  }
})();

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
function handleWebsiteMessage(event) {
  console.log('Content script received message:', event.data);
  
  if (event.data?.type === 'XCHANGEE_EXTENSION_CHECK' && event.data?.source === 'website') {
    console.log('Handling extension check request');
    // Get auth status and respond immediately
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (authResponse) => {
      console.log('Extension check - Auth response:', authResponse);
      window.postMessage({ 
        type: 'XCHANGEE_EXTENSION_RESPONSE', 
        source: 'extension',
        version: chrome.runtime.getManifest().version,
        isAuthenticated: authResponse?.isAuthenticated || false,
        userId: authResponse?.userId || null
      }, '*');
      
      // Also send immediate heartbeat
      window.postMessage({
        type: 'XCHANGEE_EXTENSION_HEARTBEAT',
        source: 'extension',
        version: chrome.runtime.getManifest().version,
        isAuthenticated: authResponse?.isAuthenticated || false,
        userId: authResponse?.userId || null,
        timestamp: Date.now()
      }, '*');
    });
  }
  
  // Handle auth success from extension auth page
  if (event.data?.type === 'EXTENSION_AUTH_SUCCESS') {
    console.log('Extension auth success received:', event.data);
    
    // Store auth data and notify background script
    chrome.runtime.sendMessage({
      type: 'STORE_AUTH_DATA',
      authToken: event.data.authToken,
      userId: event.data.userId,
      userData: event.data.userData
    }, (response) => {
      if (response.success) {
        console.log('Auth data stored successfully');
        
        // Show success notification
        window.postMessage({
          type: 'SHOW_AUTH_SUCCESS',
          userData: event.data.userData
        }, '*');
      }
    });
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
    
    // Store auth data in extension storage
    await chrome.runtime.sendMessage({
      type: 'SET_AUTH',
      authToken: authData.authToken,
      userId: authData.userId,
      userData: authData.userData
    });
    
    // Store user data in local storage for popup
    await chrome.storage.local.set({
      userData: authData.userData,
      authToken: authData.authToken,
      userId: authData.userId,
      lastAuthTime: Date.now()
    });
    
    // Show success notification
    chrome.runtime.sendMessage({
      type: 'SHOW_AUTH_SUCCESS_NOTIFICATION',
      userData: authData.userData
    });
    
    // Refresh page indicators
    setTimeout(() => {
      location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('Failed to handle authentication:', error);
  }
}

// Announce extension presence to website
async function announceExtensionPresence() {
  try {
    console.log('Announcing extension presence...');
    
    // Get current auth status
    const authStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
    console.log('Extension announcement - Auth status:', authStatus);
    
    // Send initial heartbeat with auth info
    window.postMessage({
      type: 'XCHANGEE_EXTENSION_HEARTBEAT',
      source: 'extension',
      version: chrome.runtime.getManifest().version,
      isAuthenticated: authStatus?.isAuthenticated || false,
      userId: authStatus?.userId || null,
      timestamp: Date.now()
    }, '*');
    
    console.log('Initial heartbeat sent');
    
    // Send periodic heartbeats
    setInterval(async () => {
      try {
        const currentAuthStatus = await chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' });
        window.postMessage({
          type: 'XCHANGEE_EXTENSION_HEARTBEAT',
          source: 'extension',
          version: chrome.runtime.getManifest().version,
          isAuthenticated: currentAuthStatus?.isAuthenticated || false,
          userId: currentAuthStatus?.userId || null,
          timestamp: Date.now()
        }, '*');
        console.log('Heartbeat sent - auth:', currentAuthStatus?.isAuthenticated);
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, 5000); // Every 5 seconds for more frequent updates
  } catch (error) {
    console.error('Failed to announce extension presence:', error);
  }
}

// Add visual indicators for Xchangee-eligible tweets
function addXchangeeIndicators() {
  const tweets = findTweets();
  
  tweets.forEach(tweet => {
    if (!tweet.querySelector('.xchangee-indicator')) {
      addIndicatorToTweet(tweet);
    }
  });
}

// Find tweet elements on the page
function findTweets() {
  // Twitter's tweet selectors (may need updates as Twitter changes)
  const selectors = [
    '[data-testid="tweet"]',
    '[data-testid="tweetPhoto"]',
    'article[role="article"]',
  ];
  
  let tweets = [];
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    tweets = tweets.concat(Array.from(elements));
  });
  
  return tweets.filter(tweet => tweet.querySelector('[data-testid="like"]')); // Must have engagement buttons
}

// Add Xchangee indicator to a tweet
function addIndicatorToTweet(tweetElement) {
  try {
    const actionsBar = tweetElement.querySelector('[role="group"]');
    if (!actionsBar) return;
    
    // Create Xchangee button
    const xchangeeBtn = document.createElement('div');
    xchangeeBtn.className = 'xchangee-indicator';
    xchangeeBtn.innerHTML = `
      <div class="xchangee-btn" title="Available on Xchangee">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span class="xchangee-credits">+1</span>
      </div>
    `;
    
    // Add click handler
    xchangeeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleXchangeeClick(tweetElement);
    });
    
    // Insert into actions bar
    actionsBar.appendChild(xchangeeBtn);
    
  } catch (error) {
    console.error('Failed to add Xchangee indicator:', error);
  }
}

// Handle Xchangee button click
async function handleXchangeeClick(tweetElement) {
  if (isProcessing) return;
  
  try {
    isProcessing = true;
    
    // Get tweet URL
    const tweetUrl = extractTweetUrl(tweetElement);
    if (!tweetUrl) {
      showNotification('Could not extract tweet URL', 'error');
      return;
    }
    
    // Get available engagement opportunities for this tweet
    const response = await chrome.runtime.sendMessage({
      type: 'GET_ENGAGEMENT_OPPORTUNITIES',
    });
    
    if (!response.success) {
      showNotification('Failed to get engagement opportunities', 'error');
      return;
    }
    
    // Find matching post
    const matchingPost = response.data.find(post => 
      post.tweetUrl.includes(extractTweetId(tweetUrl))
    );
    
    if (!matchingPost) {
      showNotification('This tweet is not available for engagement', 'warning');
      return;
    }
    
    // Show engagement options modal
    showEngagementModal(matchingPost);
    
  } catch (error) {
    console.error('Xchangee click error:', error);
    showNotification('An error occurred', 'error');
  } finally {
    isProcessing = false;
  }
}

// Extract tweet URL from element
function extractTweetUrl(tweetElement) {
  try {
    // Look for time element with link
    const timeLink = tweetElement.querySelector('time')?.parentElement;
    if (timeLink && timeLink.href) {
      return timeLink.href;
    }
    
    // Fallback: construct URL from current page
    const tweetId = tweetElement.querySelector('[data-testid="tweet"]')?.getAttribute('data-tweet-id');
    if (tweetId) {
      const username = extractUsernameFromTweet(tweetElement);
      if (username) {
        return `https://twitter.com/${username}/status/${tweetId}`;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract tweet URL:', error);
    return null;
  }
}

// Extract tweet ID from URL
function extractTweetId(url) {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

// Extract username from tweet element
function extractUsernameFromTweet(tweetElement) {
  try {
    const usernameElement = tweetElement.querySelector('[data-testid="User-Name"] a[role="link"]');
    if (usernameElement) {
      const href = usernameElement.href;
      const match = href.match(/twitter\.com\/([^\/]+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch (error) {
    console.error('Failed to extract username:', error);
    return null;
  }
}

// Show engagement options modal
function showEngagementModal(post) {
  // Remove existing modal
  const existingModal = document.querySelector('.xchangee-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.className = 'xchangee-modal';
  modal.innerHTML = `
    <div class="xchangee-modal-backdrop">
      <div class="xchangee-modal-content">
        <div class="xchangee-modal-header">
          <h3>Engage with this tweet</h3>
          <button class="xchangee-modal-close">&times;</button>
        </div>
        <div class="xchangee-modal-body">
          <p><strong>Engagement Type:</strong> ${post.engagementType}</p>
          <p><strong>Credits to earn:</strong> +${post.creditsRequired}</p>
          <p><strong>Progress:</strong> ${post.currentEngagements}/${post.maxEngagements}</p>
          <div class="xchangee-engagement-actions">
            <button class="xchangee-btn-primary" data-action="engage">
              Complete ${post.engagementType} (+${post.creditsRequired} credits)
            </button>
            <button class="xchangee-btn-secondary" data-action="cancel">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners
  modal.querySelector('.xchangee-modal-close').addEventListener('click', closeModal);
  modal.querySelector('[data-action="cancel"]').addEventListener('click', closeModal);
  modal.querySelector('[data-action="engage"]').addEventListener('click', () => {
    performEngagement(post);
    closeModal();
  });
  
  // Add to page
  document.body.appendChild(modal);
  
  function closeModal() {
    modal.remove();
  }
}

// Perform engagement action
async function performEngagement(post) {
  try {
    showNotification('Processing engagement...', 'info');
    
    // Complete engagement through background script
    const response = await chrome.runtime.sendMessage({
      type: 'COMPLETE_ENGAGEMENT',
      data: {
        postId: post._id,
        tweetUrl: post.tweetUrl,
        engagementType: post.engagementType,
      },
    });
    
    if (response.success) {
      // Perform the actual action on the page
      await performTwitterAction(post.engagementType, post.tweetUrl);
      showNotification(`${post.engagementType} completed! +${post.creditsRequired} credits earned`, 'success');
    } else {
      showNotification(response.error || 'Failed to complete engagement', 'error');
    }
    
  } catch (error) {
    console.error('Engagement error:', error);
    showNotification('Failed to complete engagement', 'error');
  }
}

// Perform actual Twitter action
async function performTwitterAction(actionType, tweetUrl) {
  try {
    // Navigate to tweet if not already there
    if (!window.location.href.includes(extractTweetId(tweetUrl))) {
      // For now, we'll work with the current page
      // In a full implementation, you might want to open the tweet in a new tab
    }
    
    // Wait a moment for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    switch (actionType) {
      case 'like':
        await clickLikeButton();
        break;
      case 'retweet':
        await clickRetweetButton();
        break;
      case 'reply':
        await openReplyDialog();
        break;
      case 'follow':
        await clickFollowButton();
        break;
    }
    
  } catch (error) {
    console.error('Failed to perform Twitter action:', error);
    throw error;
  }
}

// Click like button
async function clickLikeButton() {
  const likeButton = document.querySelector('[data-testid="like"]');
  if (likeButton) {
    likeButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Click retweet button
async function clickRetweetButton() {
  const retweetButton = document.querySelector('[data-testid="retweet"]');
  if (retweetButton) {
    retweetButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click confirm retweet in dropdown
    const confirmButton = document.querySelector('[data-testid="retweetConfirm"]');
    if (confirmButton) {
      confirmButton.click();
    }
  }
}

// Open reply dialog
async function openReplyDialog() {
  const replyButton = document.querySelector('[data-testid="reply"]');
  if (replyButton) {
    replyButton.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add a generic reply
    const textArea = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (textArea) {
      textArea.focus();
      document.execCommand('insertText', false, 'Great post! 👍');
      
      // Click reply button
      setTimeout(() => {
        const submitButton = document.querySelector('[data-testid="tweetButton"]');
        if (submitButton && !submitButton.disabled) {
          submitButton.click();
        }
      }, 500);
    }
  }
}

// Click follow button
async function clickFollowButton() {
  const followButton = document.querySelector('[data-testid="follow"]');
  if (followButton) {
    followButton.click();
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// Show notification
function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.xchangee-notification');
  if (existing) {
    existing.remove();
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `xchangee-notification xchangee-notification-${type}`;
  notification.textContent = message;
  
  // Add to page
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Set up mutation observer for dynamic content
function setupMutationObserver() {
  observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if new tweets were added
            const newTweets = node.querySelectorAll ? 
              node.querySelectorAll('[data-testid="tweet"]') : 
              [];
            
            newTweets.forEach(tweet => {
              if (!tweet.querySelector('.xchangee-indicator')) {
                addIndicatorToTweet(tweet);
              }
            });
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Handle messages from background script
function handleMessage(request, sender, sendResponse) {
  switch (request.type) {
    case 'PERFORM_ENGAGEMENT':
      performTwitterAction(request.data.engagementType, request.data.tweetUrl)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ error: error.message }));
      return true; // Async response
      
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
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (observer) {
    observer.disconnect();
  }
});

// Announce extension presence to website
async function announceExtensionPresence() {
  try {
    // Get current auth status
    chrome.runtime.sendMessage({ type: 'GET_AUTH_STATUS' }, (authResponse) => {
      console.log('Announcing extension presence - Auth status:', authResponse);
      
      // Send heartbeat message to website
      window.postMessage({
        type: 'XCHANGEE_EXTENSION_HEARTBEAT',
        source: 'extension',
        version: chrome.runtime.getManifest().version,
        isAuthenticated: authResponse?.isAuthenticated || false,
        userId: authResponse?.userId || null,
        timestamp: Date.now()
      }, '*');
    });
  } catch (error) {
    console.error('Failed to announce extension presence:', error);
  }
}

// Set up Xchangee website integration
function setupXchangeeWebsiteIntegration() {
  console.log('Initializing Xchangee website integration');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Listen for messages from website for extension detection
  window.addEventListener('message', handleWebsiteMessage);
  
  // Announce extension presence to website immediately
  announceExtensionPresence();
  
  // Send periodic heartbeats to keep the website updated
  setInterval(() => {
    announceExtensionPresence();
  }, 5000); // Every 5 seconds
  
  console.log('Xchangee website integration initialized');
}