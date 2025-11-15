# 🚀 Xchangee Deployment Guide

This guide will help you deploy the complete Xchangee platform to production.

## 📋 Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account
- Twitter Developer Account with API v2 access
- Vercel account (recommended) or any hosting platform
- Chrome Web Store Developer account (for extension)

## 🛠️ Initial Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/hiraypawan/xchange.git
cd xchange
npm install
```

### 2. Environment Configuration

Create `.env.local` file with the following variables:

```bash
# Twitter API Configuration
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://yourdomain.com/api/auth/twitter/callback

# Application Settings
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_min

# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=xchangee

# JWT Secret
JWT_SECRET=your_jwt_secret_32_chars_min

# System Configuration
CREDITS_PER_ENGAGEMENT=1
CREDITS_PER_POST=10
MAX_ENGAGEMENTS_PER_DAY=50
ENGAGEMENT_TIMEOUT_HOURS=24
USER_STARTING_CREDITS=100
```

### 3. Twitter Developer Setup

1. **Create Twitter App:**
   - Go to https://developer.twitter.com/en/portal/dashboard
   - Create a new project and app
   - Enable OAuth 2.0 with PKCE
   - Set redirect URL: `https://yourdomain.com/api/auth/twitter/callback`

2. **Required Scopes:**
   - `users.read`
   - `tweet.read`
   - `tweet.write`
   - `like.write`
   - `follows.write`
   - `offline.access`

3. **Note your credentials:**
   - Client ID
   - Client Secret

### 4. MongoDB Setup

1. **Create MongoDB Atlas Cluster:**
   - Go to https://cloud.mongodb.com
   - Create new cluster
   - Create database user
   - Whitelist IP addresses (0.0.0.0/0 for production)

2. **Get Connection String:**
   - Replace `<password>` with your actual password
   - Use the connection string in `MONGODB_URI`

## 🌐 Platform Deployment

### Option 1: Vercel Deployment (Recommended)

1. **Connect to Vercel:**
   ```bash
   npm install -g vercel
   vercel login
   vercel
   ```

2. **Configure Environment Variables:**
   - Go to Vercel Dashboard
   - Add all environment variables from `.env.local`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Manual Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm start
   ```

## 🔧 Chrome Extension Deployment

### 1. Prepare Extension

```bash
cd chrome-extension
```

### 2. Update Extension Configuration

Edit `manifest.json`:
```json
{
  "host_permissions": [
    "https://twitter.com/*",
    "https://x.com/*",
    "https://yourdomain.com/*"
  ]
}
```

Edit `background.js`:
```javascript
const API_BASE_URL = 'https://yourdomain.com/api';
```

### 3. Create Extension Icons

Create icon files in `chrome-extension/icons/`:
- `icon16.png` (16x16)
- `icon32.png` (32x32)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

### 4. Package Extension

1. **Zip the extension:**
   ```bash
   zip -r xchangee-extension.zip . -x "*.DS_Store" "node_modules/*"
   ```

### 5. Publish to Chrome Web Store

1. **Go to Chrome Web Store Developer Dashboard:**
   - https://chrome.google.com/webstore/devconsole

2. **Upload Extension:**
   - Click "New Item"
   - Upload `xchangee-extension.zip`
   - Fill in store listing details

3. **Store Listing Information:**
   ```
   Title: Xchangee - Twitter Engagement Automation
   Summary: Automate Twitter engagement and earn credits
   Description: [Use the description from the extension]
   Category: Social & Communication
   Language: English
   ```

## 🗄️ Database Initialization

Run this script to initialize the database with proper indexes:

```javascript
// Run in MongoDB shell or using a script
use xchangee;

// Create indexes for better performance
db.users.createIndex({ "twitterId": 1 }, { unique: true });
db.users.createIndex({ "username": 1 }, { unique: true });
db.users.createIndex({ "lastActive": -1 });

db.posts.createIndex({ "userId": 1 });
db.posts.createIndex({ "status": 1 });
db.posts.createIndex({ "engagementType": 1 });
db.posts.createIndex({ "createdAt": -1 });

db.engagements.createIndex({ "postId": 1 });
db.engagements.createIndex({ "userId": 1 });
db.engagements.createIndex({ "status": 1 });

db.credit_transactions.createIndex({ "userId": 1 });
db.credit_transactions.createIndex({ "createdAt": -1 });
```

## 🔒 Security Configuration

### 1. Environment Security

- Use strong, unique secrets for `NEXTAUTH_SECRET` and `JWT_SECRET`
- Rotate secrets regularly
- Never commit secrets to version control

### 2. Database Security

- Enable MongoDB authentication
- Use connection string with authentication
- Restrict IP access
- Enable encryption at rest

### 3. API Security

- Rate limiting is built-in
- Input validation on all endpoints
- SQL injection protection
- XSS prevention headers

## 📊 Monitoring Setup

### 1. Error Tracking

Add Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your existing config
}, {
  // Sentry configuration
});
```

### 2. Analytics

Add analytics tracking:

```bash
npm install @vercel/analytics
```

### 3. Performance Monitoring

Monitor key metrics:
- API response times
- Database query performance
- User engagement rates
- Credit transaction volume

## 🚦 Health Checks

Create health check endpoints:

```typescript
// src/app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
}
```

## 📈 Scaling Considerations

### 1. Database Scaling

- Use MongoDB Atlas auto-scaling
- Implement read replicas for high traffic
- Consider sharding for large datasets

### 2. Application Scaling

- Vercel handles scaling automatically
- For manual deployment, use PM2 or similar
- Implement horizontal scaling with load balancers

### 3. Rate Limiting

Current rate limits:
- 60 requests per minute per IP
- 50 engagements per day per user
- Configurable through environment variables

## 🧪 Testing

### 1. Run Tests

```bash
npm test
```

### 2. End-to-End Testing

```bash
npm run test:e2e
```

### 3. Load Testing

Use tools like Artillery or k6 to test API endpoints.

## 📞 Support & Maintenance

### 1. Backup Strategy

- Automated MongoDB backups
- Code repository backups
- Environment variable backups

### 2. Update Process

1. Test updates in staging
2. Deploy to production during low traffic
3. Monitor for issues post-deployment

### 3. User Support

- Monitor user feedback
- Track error rates
- Respond to Chrome Web Store reviews

## 🎉 Go Live Checklist

- [ ] Environment variables configured
- [ ] Twitter API access verified
- [ ] MongoDB connection tested
- [ ] Application deployed and accessible
- [ ] Chrome extension published
- [ ] SSL certificate active
- [ ] Monitoring tools configured
- [ ] Backup strategy implemented
- [ ] Documentation updated
- [ ] User onboarding flow tested

## 🆘 Troubleshooting

### Common Issues

1. **Twitter API Rate Limits:**
   - Implement proper retry logic
   - Use exponential backoff
   - Monitor rate limit headers

2. **Database Connection Issues:**
   - Check MongoDB Atlas IP whitelist
   - Verify connection string
   - Monitor connection pool usage

3. **Extension Issues:**
   - Check Twitter page structure changes
   - Update selectors if necessary
   - Test on different Twitter layouts

### Support Contacts

- MongoDB Support: Atlas support portal
- Vercel Support: Vercel dashboard
- Twitter API: Developer portal
- Chrome Web Store: Developer console

---

For additional support or questions, please create an issue in the GitHub repository.