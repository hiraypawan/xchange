// Debug script to test session and API endpoints
// Run this in browser console to debug the issue

console.log('=== Xchangee Debug Session ===');

// Test session
fetch('/api/debug/session')
  .then(res => res.json())
  .then(data => {
    console.log('Session debug:', data);
    
    // Test user API
    return fetch('/api/user');
  })
  .then(res => res.json())
  .then(data => {
    console.log('User API response:', data);
    
    // Test stats API
    return fetch('/api/user/stats');
  })
  .then(res => res.json())
  .then(data => {
    console.log('Stats API response:', data);
  })
  .catch(error => {
    console.error('API Debug Error:', error);
  });