# Vercel Environment Variables Checklist

## 🔍 Things to Check in Vercel Dashboard:

### 1. **MongoDB URI** (CRITICAL - MUST FIX)
- [ ] Go to Vercel → Settings → Environment Variables
- [ ] Find `MONGODB_URI`
- [ ] Change from: `mongodb+srv://justcheck008:Pawan@098@cluster0.owqjoou.mongodb.net/?appName=Cluster0`
- [ ] Change to: `mongodb+srv://justcheck008:Pawan%40098@cluster0.owqjoou.mongodb.net/?appName=Cluster0`
- [ ] Save and redeploy

### 2. **NextAuth Configuration**
- [ ] Check `NEXTAUTH_SECRET` exists
- [ ] Check `NEXTAUTH_URL` is set to `https://xchangee.vercel.app`
- [ ] Check `TWITTER_CLIENT_SECRET` exists

### 3. **Debug Steps**
1. After updating MongoDB URI, visit: `https://xchangee.vercel.app/api/debug/session`
2. If you see a session, try the extension connection again
3. If no session, the issue is with authentication setup

### 4. **Twitter App Configuration**
- [ ] Check Twitter app callback URLs include: `https://xchangee.vercel.app/api/auth/callback/twitter`
- [ ] Verify Twitter app has proper permissions

## 🚨 Most Likely Issue:
The MongoDB URI encoding problem in Vercel environment variables is causing the database connection to fail, which means:
- Users can't be created/found
- Sessions might not be properly stored
- Extension token generation fails

**Fix the MongoDB URI in Vercel first, then test!**