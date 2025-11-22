/**
 * API Configuration for Xchangee
 * Handles switching between local development and production APIs
 */

export const getApiBaseUrl = () => {
  // Check if we're in development mode
  if (typeof window !== 'undefined') {
    // Client-side detection
    const isDev = 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      localStorage.getItem('xchangee_force_local_api') === 'true';
      
    if (isDev) {
      return 'http://localhost:3001';
    }
  }
  
  // Server-side or production
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3001'
    : ''; // Empty string uses current domain for production
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      ...options.headers,
    },
    ...options,
  };

  console.log(`🌐 API Call: ${url}`);
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ API call failed for ${url}:`, error);
    throw error;
  }
};

// Helper function to force local API usage (for testing)
export const forceLocalApi = (enable: boolean = true) => {
  if (typeof window !== 'undefined') {
    if (enable) {
      localStorage.setItem('xchangee_force_local_api', 'true');
    } else {
      localStorage.removeItem('xchangee_force_local_api');
    }
  }
};