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
    
    // Check if already on Xchangee site
    if (window.location.hostname.includes('xchangee')) {
      // If on dashboard and not authenticated, redirect to home page
      if (window.location.pathname === '/dashboard') {
        window.location.href = '/';
      } else {
        // Already on main page, just reload to trigger auth
        window.location.reload();
      }
      
      sendResponse({
        success: true,
        message: 'Redirecting to login...'
      });
    } else {
      // Open main page (which handles authentication via NextAuth)
      const loginUrl = 'https://xchangee.vercel.app/';
      window.open(loginUrl, '_blank');
      
      sendResponse({
        success: true,
        message: 'Login page opened'
      });
    }
    
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
      window.location.href = '/';
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
    
    // Check if extension context is still valid
    if (!chrome.storage || !chrome.storage.local) {
      console.log('⚠️ Extension context invalidated, stopping popup data update');
      return;
    }
    
    // Clear any fake/invalid authentication first
    await clearInvalidAuth();
    
    // Check if user is authenticated
    const authData = await chrome.storage.local.get(['xchangeeToken', 'xchangeeUser']);
    
    if (authData.xchangeeToken && authData.xchangeeUser && isValidAuthentication(authData)) {
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
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension context invalidated during popup data update - stopping');
      // Stop all intervals to prevent further errors
      if (typeof updateInterval !== 'undefined') {
        clearInterval(updateInterval);
      }
      return;
    }
    console.error('❌ CONTENT: Failed to update popup data:', error);
  }
}

async function detectAuthFromPage() {
  try {
    console.log('🔍 CONTENT: Detecting real authentication from Xchangee page...');
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Page title:', document.title);
    
    // Reset authentication state first
    popupData.isAuthenticated = false;
    popupData.user = null;
    
    // Look for NextAuth session data or real user indicators
    // Method 1: Check for NextAuth session in the page
    if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
      const pageProps = window.__NEXT_DATA__.props.pageProps;
      if (pageProps.session && pageProps.session.user) {
        const session = pageProps.session;
        console.log('✅ Found NextAuth session in __NEXT_DATA__:', session.user);
        popupData.isAuthenticated = true;
        popupData.user = {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          credits: 0 // Will be updated by updateUserStats
        };
        
        await chrome.storage.local.set({ 
          xchangeeUser: popupData.user,
          xchangeeToken: session.accessToken || 'nextauth_authenticated'
        });
        return;
      }
    }
    
    // Method 1b: Check global NextAuth session
    if (typeof window !== 'undefined' && window.next && window.next.session) {
      const session = window.next.session;
      if (session.user) {
        console.log('✅ Found NextAuth session:', session.user);
        popupData.isAuthenticated = true;
        popupData.user = {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          credits: 0 // Will be updated by updateUserStats
        };
        
        await chrome.storage.local.set({ 
          xchangeeUser: popupData.user,
          xchangeeToken: session.accessToken || 'authenticated'
        });
        return;
      }
    }
    
    // Method 2: Look for real authentication indicators in DOM
    const authIndicators = [
      'button[class*="sign-out"]',
      'button[class*="logout"]', 
      '[data-testid*="user"]',
      '[class*="dashboard"]',
      'nav[class*="authenticated"]',
      // Add more specific indicators
      'a[href*="/dashboard"]',
      'button:contains("Sign out")',
      'text:contains("Sign out")',
      '[class*="profile"]',
      '[href="/profile"]'
    ];
    
    let isReallyAuthenticated = false;
    console.log('🔍 Checking for authentication indicators...');
    
    for (const selector of authIndicators) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          isReallyAuthenticated = true;
          console.log('✅ Found authentication indicator:', selector, element);
          break;
        }
      } catch (e) {
        // Selector might be invalid, continue
      }
    }
    
    // Also check if we're on dashboard page (strong indicator of authentication)
    if (window.location.pathname === '/dashboard') {
      console.log('✅ On dashboard page - assuming authenticated');
      isReallyAuthenticated = true;
    }
    
    // Check page content for auth indicators
    const pageText = document.body.textContent || '';
    if (pageText.includes('Sign out') || pageText.includes('Logout') || pageText.includes('My Profile')) {
      console.log('✅ Found auth text in page content');
      isReallyAuthenticated = true;
    }
    
    console.log('🔍 Authentication indicators check result:', isReallyAuthenticated);
    
    if (!isReallyAuthenticated) {
      console.log('❌ No real authentication detected on page');
      console.log('🔍 Available buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()));
      console.log('🔍 Available links:', Array.from(document.querySelectorAll('a')).map(a => a.href + ' - ' + a.textContent?.trim()).slice(0, 10));
      return;
    }
    
    // Method 3: Extract real user data from authenticated page
    let realUserName = null;
    let realCredits = null;
    
    // Look for "Welcome back, [Name]" pattern first
    console.log('🔍 Searching for welcome message...');
    const pageHtml = document.body.innerHTML;
    console.log('🔍 Page contains "Welcome back":', pageHtml.includes('Welcome back'));
    
    const welcomeElements = document.querySelectorAll('*');
    for (const el of welcomeElements) {
      const text = el.textContent?.trim();
      if (text && text.includes('Welcome back')) {
        console.log('🔍 Found welcome element text:', text);
        if (text.includes('!')) {
          const match = text.match(/Welcome back,\s*([^!]+)!/);
          if (match && match[1]) {
            realUserName = match[1].trim();
            console.log('✅ Found user name in welcome message:', realUserName);
            break;
          }
        }
      }
    }
    
    // Look for user name in typical locations if not found in welcome message
    if (!realUserName) {
      const userSelectors = [
        'h1, h2, h3',
        '[class*="username"]',
        '[class*="user-name"]', 
        '[data-testid*="name"]',
        '.text-2xl, .text-xl, .font-bold'
      ];
    
      for (const selector of userSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && 
              text.length > 0 && 
              text.length < 50 && 
              !text.includes('credits') && 
              !text.includes('$') &&
              !text.includes('Welcome') &&
              !text.includes('Dashboard') &&
              /^[a-zA-Z\s@._-]+$/.test(text)) {
            realUserName = text;
            console.log('✅ Found real user name:', realUserName);
            break;
          }
        }
        if (realUserName) break;
      }
    }
    
    // Look for credits with stricter validation
    console.log('🔍 Searching for credits...');
    console.log('🔍 Page contains "credit":', pageHtml.includes('credit'));
    
    // First check for visible credit displays
    const allElements = document.querySelectorAll('*');
    let creditTexts = [];
    
    for (const el of allElements) {
      const text = el.textContent?.trim();
      if (text && text.includes('credit')) {
        creditTexts.push(text);
        console.log('🔍 Found credit-related text:', text);
        
        // Look for patterns like "2 credits", "Available Credits 2", etc.
        const creditPatterns = [
          /^(\d+)\s*credits?$/i,
          /(\d+)\s*credits?$/i,
          /credits?:?\s*(\d+)/i,
          /available\s*credits?:?\s*(\d+)/i
        ];
        
        for (const pattern of creditPatterns) {
          const match = text.match(pattern);
          if (match) {
            const credits = parseInt(match[1]);
            if (credits >= 0 && credits < 10000) { // Reasonable range
              realCredits = credits;
              console.log('✅ Found real credits:', realCredits, 'from text:', text);
              break;
            }
          }
        }
        if (realCredits !== null) break;
      }
    }
    
    console.log('🔍 All credit texts found:', creditTexts.slice(0, 5)); // Show first 5
    
    // Fallback: look for specific credit selectors
    if (realCredits === null) {
      const creditSelectors = [
        '[class*="credit"]',
        '[data-testid*="credit"]',
        '.credit-display',
        'h1, h2, h3, h4'
      ];
      
      for (const selector of creditSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = el.textContent?.trim();
          if (text && text.includes('credit')) {
            const match = text.match(/(\d+)\s*credits?/i);
            if (match) {
              realCredits = parseInt(match[1]);
              console.log('✅ Found credits via selector:', selector, realCredits);
              break;
            }
          }
        }
        if (realCredits !== null) break;
      }
    }
    
    // Only set authentication if we have REAL data OR strong authentication indicators
    if (realUserName && realUserName !== 'User') {
      popupData.isAuthenticated = true;
      popupData.user = {
        name: realUserName,
        credits: realCredits || 0,
        image: null
      };
      
      await chrome.storage.local.set({ 
        xchangeeUser: popupData.user,
        xchangeeToken: 'page_authenticated'
      });
      
      // Try to find user profile image with more comprehensive search
      console.log('🔍 Searching for profile image...');
      
      // Try to get profile image from NextAuth session data first
      let userImage = null;
      
      // Method 1: Check NextAuth session data
      if (window.__NEXT_DATA__ && window.__NEXT_DATA__.props && window.__NEXT_DATA__.props.pageProps) {
        const pageProps = window.__NEXT_DATA__.props.pageProps;
        if (pageProps.session && pageProps.session.user && pageProps.session.user.image) {
          userImage = pageProps.session.user.image;
          console.log('✅ Found profile image from NextAuth session:', userImage);
        }
      }
      
      // Method 1b: Check for session in window.next
      if (!userImage && window.next && window.next.session && window.next.session.user && window.next.session.user.image) {
        userImage = window.next.session.user.image;
        console.log('✅ Found profile image from window.next.session:', userImage);
      }
      
      // Method 1c: Try to extract from existing avatar on page
      if (!userImage) {
        const existingAvatar = document.querySelector('img[src*="pbs.twimg.com"], img[src*="googleusercontent"], img[src*="github"], img[src*="gravatar"]');
        if (existingAvatar && existingAvatar.src) {
          userImage = existingAvatar.src;
          console.log('✅ Found profile image from existing avatar:', userImage);
        }
      }
      
      // Method 2: Check for Twitter/X profile images if no session image
      if (!userImage && (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com'))) {
        const twitterSelectors = [
          '[data-testid="UserAvatar-Container-unknown"] img',
          '[data-testid="UserAvatar-Container"] img',
          'img[alt*="profile"]',
          'a[href*="/photo"] img',
          '.css-9pa8cd img', // Twitter's avatar container
          '.r-1p0dtai img', // Twitter's rounded image class
          '.r-1mlwlqe img'  // Twitter's profile image class
        ];
        
        for (const selector of twitterSelectors) {
          try {
            const img = document.querySelector(selector);
            if (img && img.src && img.src.startsWith('http') && 
                !img.src.includes('default') && img.width > 20) {
              userImage = img.src;
              console.log('✅ Found Twitter profile image:', userImage);
              break;
            }
          } catch (e) {
            // Continue
          }
        }
      }
      
      // Method 3: Standard selectors for other sites
      if (!userImage) {
        const imageSelectors = [
          'img[class*="avatar"]',
          'img[class*="profile"]', 
          'img[class*="user"]',
          'img[alt*="profile"]',
          'img[alt*="avatar"]',
          'img[alt*="user"]',
          '[class*="avatar"] img',
          '[class*="profile"] img',
          '.rounded-full img', // Common Tailwind avatar class
          '.rounded-circle img', // Bootstrap avatar class
          'img[src*="avatar"]',
          'img[src*="profile"]',
          // Xchangee specific selectors
          'img[alt*="Pawan"]',
          'img[alt*="profile picture"]'
        ];
        
        // Try specific selectors
        for (const selector of imageSelectors) {
          try {
            const img = document.querySelector(selector);
            if (img && img.src && img.src.startsWith('http') && 
                !img.src.includes('placeholder') && 
                !img.src.includes('default') &&
                !img.src.includes('icon') &&
                img.width > 20 && img.height > 20) { // Must be reasonable size
              userImage = img.src;
              console.log('✅ Found user profile image via selector:', selector, userImage);
              break;
            }
          } catch (e) {
            // Selector might be invalid, continue
          }
        }
      }
      
      // If no image found, search all images for profile-like ones
      if (!userImage) {
        console.log('🔍 Searching all images for profile picture...');
        const allImages = document.querySelectorAll('img');
        const potentialImages = [];
        
        for (const img of allImages) {
          if (img.src && img.src.startsWith('http') && 
              !img.src.includes('icon') &&
              !img.src.includes('logo') &&
              !img.src.includes('placeholder') &&
              !img.src.includes('default') &&
              img.width > 20 && img.height > 20 && 
              img.width <= 200 && img.height <= 200) { // Profile pic size range
            
            potentialImages.push({
              src: img.src,
              width: img.width,
              height: img.height,
              alt: img.alt,
              className: img.className
            });
          }
        }
        
        console.log('🔍 Potential profile images found:', potentialImages);
        
        // Try to find the best profile image candidate
        for (const imgData of potentialImages) {
          // Prioritize images that look like profile pictures
          if (imgData.alt && (
              imgData.alt.toLowerCase().includes('profile') ||
              imgData.alt.toLowerCase().includes('avatar') ||
              imgData.alt.toLowerCase().includes('user') ||
              imgData.alt.toLowerCase().includes('pawan')
            )) {
            userImage = imgData.src;
            console.log('✅ Found profile image via alt text:', imgData.alt, userImage);
            break;
          }
        }
        
        // If still no image, take the first reasonable one
        if (!userImage && potentialImages.length > 0) {
          // Prefer square-ish images (typical for profile pics)
          const squareImages = potentialImages.filter(img => {
            const ratio = img.width / img.height;
            return ratio >= 0.8 && ratio <= 1.25; // Nearly square
          });
          
          if (squareImages.length > 0) {
            userImage = squareImages[0].src;
            console.log('✅ Found square profile image:', userImage);
          } else if (potentialImages.length > 0) {
            userImage = potentialImages[0].src;
            console.log('✅ Using first available image as profile:', userImage);
          }
        }
      }
      
      // Log all images for debugging
      const allImgs = Array.from(document.querySelectorAll('img')).map(img => ({
        src: img.src,
        width: img.width,
        height: img.height,
        alt: img.alt,
        className: img.className
      }));
      console.log('🔍 All images on page:', allImgs.slice(0, 10));
      
      // Update user data with image
      if (userImage) {
        popupData.user.image = userImage;
        
        await chrome.storage.local.set({ 
          xchangeeUser: popupData.user,
          xchangeeToken: 'page_authenticated'
        });
      }
      
      console.log('✅ Real authentication detected and saved');
    } else if (isReallyAuthenticated && realCredits !== null && realCredits > 0) {
      // Only use fallback if we have real credits AND strong auth indicators
      // But try harder to find the real name first
      console.log('🔍 Trying harder to find real user name...');
      
      // More aggressive name search for fallback
      const allTextElements = document.querySelectorAll('*');
      for (const el of allTextElements) {
        const text = el.textContent?.trim();
        if (text && text.length >= 3 && text.length <= 30 && 
            /^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(text) && // Proper name format
            !text.includes('Welcome') && !text.includes('Dashboard') &&
            !text.includes('Sign') && !text.includes('Menu')) {
          realUserName = text;
          console.log('✅ Found real name in fallback search:', realUserName);
          break;
        }
      }
      
      if (realUserName) {
        popupData.isAuthenticated = true;
        popupData.user = {
          name: realUserName,
          credits: realCredits,
          image: null
        };
        
        await chrome.storage.local.set({ 
          xchangeeUser: popupData.user,
          xchangeeToken: 'page_authenticated'
        });
        
        console.log('✅ Authentication detected with fallback name search');
      } else {
        console.log('❌ Could not find real user name, staying unauthenticated to avoid dummy data');
      }
    } else {
      console.log('❌ No valid user data found - keeping unauthenticated state');
      console.log('Debug: isReallyAuthenticated:', isReallyAuthenticated, 'realUserName:', realUserName, 'realCredits:', realCredits);
    }
    
  } catch (error) {
    console.error('❌ Failed to detect auth from page:', error);
    popupData.isAuthenticated = false;
    popupData.user = null;
  }
}

async function clearInvalidAuth() {
  try {
    // Check if extension context is still valid
    if (!chrome.storage || !chrome.storage.local) {
      console.log('⚠️ Extension context invalidated, skipping auth clear');
      return;
    }
    
    const authData = await chrome.storage.local.get(['xchangeeToken', 'xchangeeUser']);
    
    // Clear if token is 'detected' (fake) or user is generic
    if (authData.xchangeeToken === 'detected' || 
        (authData.xchangeeUser && authData.xchangeeUser.name === 'User')) {
      console.log('🧹 CONTENT: Clearing invalid/fake authentication');
      await chrome.storage.local.remove(['xchangeeToken', 'xchangeeUser']);
      popupData.isAuthenticated = false;
      popupData.user = null;
    }
  } catch (error) {
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension context invalidated during auth clear - ignoring');
      return;
    }
    console.error('Error clearing invalid auth:', error);
  }
}

function isValidAuthentication(authData) {
  // Check if authentication data is real and valid
  if (!authData.xchangeeUser || !authData.xchangeeToken) {
    return false;
  }
  
  const user = authData.xchangeeUser;
  const token = authData.xchangeeToken;
  
  // Invalid tokens
  if (token === 'detected' || token === 'fake' || token === 'test') {
    console.log('❌ Invalid token detected:', token);
    return false;
  }
  
  // Invalid user data (but allow 'Authenticated User' as fallback)
  if (!user.name || user.name === 'User' || user.name === 'Unknown' || user.name === 'Test User') {
    console.log('❌ Invalid user name detected:', user.name);
    return false;
  }
  
  // Allow 'Authenticated User' as valid fallback
  if (user.name === 'Authenticated User' && token === 'page_authenticated_fallback') {
    console.log('✅ Fallback authenticated user is valid');
    return true;
  }
  
  // User name too generic or suspicious
  if (user.name.length < 2 || /^(user|test|demo|example)/i.test(user.name)) {
    console.log('❌ Suspicious user name detected:', user.name);
    return false;
  }
  
  console.log('✅ Authentication data is valid');
  return true;
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
    console.log('📋 CONTENT: Updating opportunities from real data...');
    
    // Reset opportunities - only show real data
    popupData.opportunities = [];
    popupData.stats.queueCount = 0;
    
    // For Twitter/X pages, look for actual engagement opportunities
    if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
      // Only show opportunities if there are actual engagement tasks available
      // This should be populated from your API/backend, not fake data
      console.log('📋 On Twitter/X - checking for real engagement opportunities...');
      // TODO: Fetch real opportunities from your API
    } else if (window.location.hostname.includes('xchangee')) {
      // On Xchangee site - try to get real opportunities from the page or API
      console.log('📋 On Xchangee site - checking for real opportunities...');
      
      // Try to get opportunities from the dashboard page
      const opportunityElements = document.querySelectorAll('[class*="opportunity"], [class*="engagement"], [class*="task"]');
      const realOpportunities = [];
      
      for (const element of opportunityElements) {
        const text = element.textContent?.trim();
        if (text && text.includes('credit')) {
          const match = text.match(/(\d+)\s*credit/);
          if (match) {
            const reward = parseInt(match[1]);
            realOpportunities.push({
              type: 'Engagement',
              reward: reward,
              author: 'platform',
              id: `real_${Date.now()}_${Math.random()}`
            });
          }
        }
      }
      
      if (realOpportunities.length > 0) {
        popupData.opportunities = realOpportunities;
        console.log('✅ Found real opportunities:', realOpportunities);
      } else {
        console.log('📋 No real opportunities found on page');
      }
    }
    
    popupData.stats.queueCount = popupData.opportunities.length;
    console.log('📋 Queue count:', popupData.stats.queueCount);
    
  } catch (error) {
    console.error('❌ CONTENT: Failed to update opportunities:', error);
    popupData.opportunities = [];
    popupData.stats.queueCount = 0;
  }
}

function sendPopupUpdate() {
  // Send update to popup if it's open
  try {
    if (chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'POPUP_UPDATE_DATA',
        data: popupData
      }).catch((error) => {
        // Popup might not be open or extension context invalidated, ignore
        if (!error.message.includes('Extension context invalidated')) {
          console.log('Could not send popup update:', error.message);
        }
      });
    }
  } catch (error) {
    // Extension context might be invalidated, ignore
    if (!error.message.includes('Extension context invalidated')) {
      console.log('Error sending popup update:', error.message);
    }
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

// Send connection status to dashboard (for "extension connected" indicator)
function notifyDashboardConnection() {
  try {
    if (window.location.hostname.includes('xchangee')) {
      // Send the specific message types the dashboard expects
      const connectionData = {
        type: 'XCHANGEE_EXTENSION_RESPONSE',
        source: 'extension',
        version: '2.0',
        timestamp: Date.now(),
        isAuthenticated: popupData.isAuthenticated,
        isInstalled: true,
        userAgent: 'Xchangee Chrome Extension',
        status: 'active'
      };
      
      const heartbeatData = {
        type: 'XCHANGEE_EXTENSION_HEARTBEAT',
        source: 'extension',
        version: '2.0',
        timestamp: Date.now(),
        isAuthenticated: popupData.isAuthenticated,
        isInstalled: true,
        status: 'active'
      };
      
      // Send both message types the dashboard listens for
      window.postMessage(connectionData, '*');
      window.postMessage(heartbeatData, '*');
      
      // Also send the original message for backward compatibility
      window.postMessage({
        type: 'XCHANGEE_EXTENSION_CONNECTED',
        ...connectionData
      }, '*');
      
      // Set global flags for additional detection methods
      window.XCHANGEE_EXTENSION_ACTIVE = true;
      window.XCHANGEE_EXTENSION_DATA = connectionData;
      
      console.log('📡 CONTENT: Sent dashboard connection notifications');
      console.log('📡 Response data:', connectionData);
      console.log('📡 Heartbeat data:', heartbeatData);
    }
  } catch (error) {
    console.error('Error notifying dashboard:', error);
  }
}

updatePopupData();

// Notify dashboard immediately and periodically
notifyDashboardConnection();

// More aggressive dashboard notifications to ensure "connected" status
const dashboardNotificationInterval = setInterval(() => {
  try {
    if (!chrome.storage || !chrome.storage.local) {
      console.log('⚠️ Extension context invalidated, stopping dashboard notifications');
      clearInterval(dashboardNotificationInterval);
      return;
    }
    notifyDashboardConnection();
  } catch (error) {
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension context invalidated, stopping dashboard notifications');
      clearInterval(dashboardNotificationInterval);
    }
  }
}, 2000); // Every 2 seconds for faster detection

// Additional immediate notifications on page events
const immediateNotifications = () => {
  setTimeout(notifyDashboardConnection, 100);
  setTimeout(notifyDashboardConnection, 500);
  setTimeout(notifyDashboardConnection, 1000);
  setTimeout(notifyDashboardConnection, 2000);
};

// Trigger immediate notifications
immediateNotifications();

// Update popup data periodically with error handling
const updateInterval = setInterval(() => {
  try {
    // Check if extension context is still valid
    if (!chrome.storage || !chrome.storage.local) {
      console.log('⚠️ Extension context invalidated, stopping periodic updates');
      clearInterval(updateInterval);
      clearInterval(dashboardNotificationInterval);
      return;
    }
    
    updatePopupData();
    notifyDashboardConnection(); // Keep dashboard updated
    if (popupData.stats.isAutoEngageActive) {
      sendPopupUpdate(); // Send updates to popup when auto-engage is active
    }
  } catch (error) {
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.log('⚠️ Extension context invalidated, stopping periodic updates');
      clearInterval(updateInterval);
      clearInterval(dashboardNotificationInterval);
    } else {
      console.error('Error in periodic update:', error);
    }
  }
}, 30000); // Every 30 seconds

// Check auth status when page loads
setTimeout(() => {
  updatePopupData();
  notifyDashboardConnection();
}, 2000); // Delay to let page load

// Also notify on page visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    setTimeout(() => {
      notifyDashboardConnection();
      updatePopupData();
    }, 1000);
  }
});

// Listen for dashboard extension check messages
window.addEventListener('message', (event) => {
  if (event.data?.type === 'XCHANGEE_EXTENSION_CHECK' && event.data?.source === 'website') {
    console.log('📡 CONTENT: Dashboard checking extension status, responding...');
    
    // Update authentication status before responding
    updatePopupData().then(() => {
      // Respond with current extension status
      const responseData = {
        type: 'XCHANGEE_EXTENSION_RESPONSE',
        source: 'extension',
        version: '2.0',
        timestamp: Date.now(),
        isAuthenticated: popupData.isAuthenticated,
        isInstalled: true,
        status: 'active'
      };
      
      // Send response immediately and multiple times to ensure receipt
      window.postMessage(responseData, '*');
      setTimeout(() => window.postMessage(responseData, '*'), 50);
      setTimeout(() => window.postMessage(responseData, '*'), 100);
      
      console.log('📡 CONTENT: Sent extension status response:', responseData);
    });
  }
});

// Monitor DOM changes to trigger notifications when dashboard loads
const dashboardObserver = new MutationObserver((mutations) => {
  let shouldNotify = false;
  
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as Element;
          // Check if dashboard-specific elements are loaded
          if (element.querySelector && (
              element.querySelector('[data-extension-dropdown]') ||
              element.textContent?.includes('Extension') ||
              element.classList?.contains('dashboard')
            )) {
            shouldNotify = true;
          }
        }
      });
    }
  });
  
  if (shouldNotify) {
    console.log('📡 Dashboard elements detected, sending connection notification');
    immediateNotifications();
  }
});

// Start observing DOM changes
dashboardObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Also trigger on window load and DOMContentLoaded
window.addEventListener('load', immediateNotifications);
document.addEventListener('DOMContentLoaded', immediateNotifications);

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