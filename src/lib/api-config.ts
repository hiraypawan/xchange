/**
 * API Configuration for Xchangee
 * Handles switching between local development and production APIs
 */

export const getApiBaseUrl = () => {
  // This function should simply return the base path for the API.
  // For Vercel deployments, this is an empty string, as API routes are relative to the domain.
  // For local development, you might point to a different port if your frontend and backend are separate.
  // Based on your setup, an empty string is the correct and simplest value.
  return '';
};

export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const baseUrl = getApiBaseUrl();
  
  // Ensure the URL is always absolute from the domain root
  // If baseUrl is empty and endpoint starts with /, use the endpoint as-is
  // This ensures /api/user/stats becomes https://domain.com/api/user/stats, not https://domain.com/dashboard/api/user/stats
  const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;
  
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
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server'
  });

  try {
    const response = await fetch(url, defaultOptions);
    
    console.log(`📡 Response: ${url} - ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error for ${url}:`, errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ API call failed for ${url}:`, error);
    throw error;
  }
};