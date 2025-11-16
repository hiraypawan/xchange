import { NextRequest, NextResponse } from 'next/server';

// This serves the remote core JavaScript for the extension
export async function GET(request: NextRequest) {
  try {
    // Get current timestamp for version
    const version = `${Date.now()}`;
    
    // The remote core JavaScript code
    const coreCode = `
/**
 * Xchangee Remote Core - Auto-updating engagement engine
 * This code is loaded remotely and can be updated instantly
 */

console.log('🚀 Xchangee Remote Core loading...');

// Core functionality that updates remotely
const XchangeeRemoteCore = {
  version: '1.0.${version.slice(-6)}',
  isReady: true,
  
  // Twitter selectors (can be updated instantly)
  selectors: {
    // Tweet engagement buttons
    likeButton: '[data-testid="like"]',
    retweetButton: '[data-testid="retweet"]', 
    replyButton: '[data-testid="reply"]',
    followButton: '[data-testid="follow"]',
    
    // Tweet containers
    tweet: '[data-testid="tweet"]',
    tweetText: '[data-testid="tweetText"]',
    
    // User elements
    username: '[data-testid="User-Name"]',
    userHandle: '[data-testid="User-Names"]',
    
    // Engagement elements
    likeCount: '[data-testid="like"] span',
    retweetCount: '[data-testid="retweet"] span',
    
    // Fallback selectors
    fallbacks: {
      likeButton: 'div[role="button"][aria-label*="like" i]',
      retweetButton: 'div[role="button"][aria-label*="retweet" i]',
      followButton: 'div[role="button"][aria-label*="follow" i]'
    }
  },
  
  // Credit notification system
  showCreditNotification(message, type = 'info') {
    // Create notification overlay
    const notification = document.createElement('div');
    notification.style.cssText = \`
      position: fixed;
      top: 20px;
      right: 20px;
      background: \${type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      animation: slideIn 0.3s ease-out;
    \`;
    
    notification.innerHTML = \`
      <div style="display: flex; align-items: start; gap: 10px;">
        <div style="flex-shrink: 0; font-size: 18px;">⚡</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">Xchangee Credit System</div>
          <div>\${message}</div>
        </div>
      </div>
    \`;
    
    // Add animation keyframes
    if (!document.getElementById('xchangee-notification-styles')) {
      const style = document.createElement('style');
      style.id = 'xchangee-notification-styles';
      style.textContent = \`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      \`;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 6 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 300);
    }, 6000);
  },

  // Engagement engine with credit checking
  async performLike(tweetElement) {
    console.log('💖 Remote Core: Performing like action');
    
    try {
      const likeButton = tweetElement.querySelector(this.selectors.likeButton) || 
                        tweetElement.querySelector(this.selectors.fallbacks.likeButton);
      
      if (!likeButton) {
        throw new Error('Like button not found');
      }
      
      // Check if already liked
      if (likeButton.getAttribute('aria-pressed') === 'true' || 
          likeButton.classList.contains('liked')) {
        console.log('✅ Tweet already liked');
        return { success: true, action: 'already_liked' };
      }
      
      // Perform click
      likeButton.click();
      
      // Wait for action to complete
      await this.waitForAction(500);
      
      // Verify action
      const isLiked = likeButton.getAttribute('aria-pressed') === 'true' || 
                     likeButton.classList.contains('liked');
      
      if (isLiked) {
        console.log('✅ Like action completed successfully - earned 1 credit');
        
        // Show credit earned notification
        this.showCreditNotification(
          'You earned 1 credit for liking this tweet! Keep engaging to build your credit balance.',
          'info'
        );
        
        return { success: true, action: 'liked', creditsEarned: 1 };
      } else {
        throw new Error('Like action verification failed');
      }
      
    } catch (error) {
      console.error('❌ Like action failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async performRetweet(tweetElement) {
    console.log('🔄 Remote Core: Performing retweet action');
    
    try {
      const retweetButton = tweetElement.querySelector(this.selectors.retweetButton) || 
                           tweetElement.querySelector(this.selectors.fallbacks.retweetButton);
      
      if (!retweetButton) {
        throw new Error('Retweet button not found');
      }
      
      // Click retweet button
      retweetButton.click();
      await this.waitForAction(300);
      
      // Look for retweet confirmation button
      const confirmButton = document.querySelector('[data-testid="retweetConfirm"]') || 
                           document.querySelector('div[role="menuitem"][data-testid="retweet"]');
      
      if (confirmButton) {
        confirmButton.click();
        await this.waitForAction(500);
        console.log('✅ Retweet action completed successfully - earned 1 credit');
        
        // Show credit earned notification
        this.showCreditNotification(
          'You earned 1 credit for retweeting! Keep engaging to build your credit balance.',
          'info'
        );
        
        return { success: true, action: 'retweeted', creditsEarned: 1 };
      } else {
        console.log('✅ Retweet action completed (no confirmation needed) - earned 1 credit');
        
        this.showCreditNotification(
          'You earned 1 credit for retweeting! Keep engaging to build your credit balance.',
          'info'
        );
        
        return { success: true, action: 'retweeted', creditsEarned: 1 };
      }
      
    } catch (error) {
      console.error('❌ Retweet action failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  async performFollow(userElement) {
    console.log('👥 Remote Core: Performing follow action');
    
    try {
      const followButton = userElement.querySelector(this.selectors.followButton) || 
                          userElement.querySelector(this.selectors.fallbacks.followButton) ||
                          document.querySelector('[data-testid="follow"]');
      
      if (!followButton) {
        throw new Error('Follow button not found');
      }
      
      // Check if already following
      const buttonText = followButton.textContent?.toLowerCase() || '';
      if (buttonText.includes('following') || buttonText.includes('unfollow')) {
        console.log('✅ Already following this user');
        return { success: true, action: 'already_following' };
      }
      
      // Perform follow
      followButton.click();
      await this.waitForAction(500);
      
      console.log('✅ Follow action completed successfully - earned 1 credit');
      
      // Show credit earned notification
      this.showCreditNotification(
        'You earned 1 credit for following! Keep engaging to build your credit balance.',
        'info'
      );
      
      return { success: true, action: 'followed', creditsEarned: 1 };
      
    } catch (error) {
      console.error('❌ Follow action failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Button detection (updates with Twitter changes)
  detectEngagementButtons(container = document) {
    const buttons = {
      likes: [],
      retweets: [],
      follows: []
    };
    
    try {
      // Find like buttons
      buttons.likes = Array.from(container.querySelectorAll(this.selectors.likeButton));
      if (buttons.likes.length === 0) {
        buttons.likes = Array.from(container.querySelectorAll(this.selectors.fallbacks.likeButton));
      }
      
      // Find retweet buttons
      buttons.retweets = Array.from(container.querySelectorAll(this.selectors.retweetButton));
      if (buttons.retweets.length === 0) {
        buttons.retweets = Array.from(container.querySelectorAll(this.selectors.fallbacks.retweetButton));
      }
      
      // Find follow buttons
      buttons.follows = Array.from(container.querySelectorAll(this.selectors.followButton));
      if (buttons.follows.length === 0) {
        buttons.follows = Array.from(container.querySelectorAll(this.selectors.fallbacks.followButton));
      }
      
      console.log(\`🔍 Remote Core: Detected \${buttons.likes.length} likes, \${buttons.retweets.length} retweets, \${buttons.follows.length} follows\`);
      
    } catch (error) {
      console.error('❌ Button detection failed:', error);
    }
    
    return buttons;
  },
  
  // Show insufficient credit notification
  showInsufficientCreditNotification() {
    this.showCreditNotification(
      'No engagements will happen unless you engage with others first! Like/RT/Follow others to earn credits, then you will receive engagements on your posts.',
      'warning'
    );
  },

  // Engagement pipeline (orchestrates actions)
  async executeEngagement(engagementType, targetElement, userCredits = 0) {
    console.log(\`⚡ Remote Core: Executing \${engagementType} engagement\`);
    
    // Check if user has credits for receiving engagements
    if (userCredits < 1) {
      console.log('⚠️ User has insufficient credits - showing notification');
      this.showInsufficientCreditNotification();
      // Still continue with engagement to earn credits
    }
    
    try {
      let result;
      
      switch (engagementType.toLowerCase()) {
        case 'like':
          result = await this.performLike(targetElement);
          break;
          
        case 'retweet':
        case 'rt':
          result = await this.performRetweet(targetElement);
          break;
          
        case 'follow':
          result = await this.performFollow(targetElement);
          break;
          
        default:
          throw new Error(\`Unknown engagement type: \${engagementType}\`);
      }
      
      // Notify background script of result
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'ENGAGEMENT_COMPLETED',
          engagementType,
          result,
          timestamp: Date.now()
        });
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Engagement execution failed:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Utility functions
  async waitForAction(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Observer for dynamic content (Twitter SPA)
  setupDynamicObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // New content added - could be new tweets
          console.log('👀 Remote Core: New content detected');
          
          // Notify that new engagement opportunities might be available
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({
              type: 'NEW_CONTENT_DETECTED',
              timestamp: Date.now()
            });
          }
        }
      });
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('👁️ Remote Core: Dynamic observer setup complete');
  },
  
  // Health check
  healthCheck() {
    const selectors = this.detectEngagementButtons();
    const isTwitter = window.location.hostname.includes('twitter.com') || 
                     window.location.hostname.includes('x.com');
    
    return {
      version: this.version,
      isReady: true,
      isTwitter,
      buttonsDetected: {
        likes: selectors.likes.length,
        retweets: selectors.retweets.length,
        follows: selectors.follows.length
      },
      timestamp: Date.now()
    };
  }
};

// Initialization function that the remote loader expects
function initXchangeeCore() {
  console.log(\`✅ Initializing Xchangee Remote Core v\${XchangeeRemoteCore.version}\`);
  
  // Setup observer for Twitter SPA
  if (window.location.hostname.includes('twitter.com') || window.location.hostname.includes('x.com')) {
    XchangeeRemoteCore.setupDynamicObserver();
  }
  
  // Make available globally
  window.XchangeeRemoteCore = XchangeeRemoteCore;
  
  console.log('🎉 Xchangee Remote Core initialized successfully');
  return XchangeeRemoteCore;
}

// Export for remote loader
window.initXchangeeCore = initXchangeeCore;
console.log('📦 Remote core code loaded successfully');
`;

    const response = new NextResponse(coreCode, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Code-Version': `remote-core-${version.slice(-8)}`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Version'
      }
    });

    return response;

  } catch (error) {
    console.error('Failed to serve remote core:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to serve remote core'
    }, { status: 500 });
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Extension-Version'
    }
  });
}