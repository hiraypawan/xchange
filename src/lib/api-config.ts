/**
 * API Configuration for Xchangee
 * Handles switching between local development and production APIs
 */

export const getApiBaseUrl = () => {
  // Check if we're in development mode
  if (typeof window !== 'undefined') {
    // Client-side detection
    const isDev = 
      (window.location.hostname === 'localhost' || 
       window.location.hostname === '127.0.0.1') &&
      localStorage.getItem('xchangee_force_local_api') !== 'false';
      
    // Only use local API if explicitly forced or we're actually on localhost
    if (isDev && localStorage.getItem('xchangee_force_local_api') === 'true') {
      return 'http://localhost:3001';
    }
  }
  
  // Server-side or production - always use current domain unless explicitly local
  const isExplicitlyLocal = process.env.NODE_ENV === 'development' && 
    process.env.NEXT_PUBLIC_USE_LOCAL_API === 'true';
  
  return isExplicitlyLocal ? 'http://localhost:3001' : '';
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
    credentials: 'include', // Include cookies for authentication
    ...options,
  };

  console.log(`🌐 API Call: ${url}`, {
    baseUrl,
    endpoint,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    forceLocal: typeof window !== 'undefined' ? localStorage.getItem('xchangee_force_local_api') : 'N/A'
  });
  
  try {
    const response = await fetch(url, defaultOptions);
    
    console.log(`📡 Response: ${url} - ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error Response:`, errorText);
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