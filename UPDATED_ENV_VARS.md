# 🔧 Updated Environment Variables for Vercel

## **IMPORTANT: Add these updated values to Vercel Dashboard:**

### **Updated System Configuration:**
```bash
CREDITS_PER_ENGAGEMENT=1
CREDITS_PER_POST=1
MAX_ENGAGEMENTS_PER_DAY=9999
ENGAGEMENT_TIMEOUT_HOURS=8760
USER_STARTING_CREDITS=2
```

### **Complete Environment Variables for Vercel:**
```bash
NEXT_PUBLIC_TWITTER_CLIENT_ID=Sk0wVmNIS196azRrZ3UyTkxyVHU6MTpjaQ
TWITTER_CLIENT_SECRET=iNLEVXN3cSsfz2srnCwIPIaj-33r_YUwQRKyul5YEOZDYQ7ig7
NEXT_PUBLIC_TWITTER_REDIRECT_URI=https://xchangee.vercel.app/api/auth/twitter/callback
NEXT_PUBLIC_APP_URL=https://xchangee.vercel.app
NEXTAUTH_URL=https://xchangee.vercel.app
NEXTAUTH_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
MONGODB_URI=mongodb+srv://justcheck008:Pawan@098@cluster0.owqjoou.mongodb.net/?appName=Cluster0
MONGODB_DB=xchangee
JWT_SECRET=z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1
CREDITS_PER_ENGAGEMENT=1
CREDITS_PER_POST=1
MAX_ENGAGEMENTS_PER_DAY=9999
ENGAGEMENT_TIMEOUT_HOURS=8760
USER_STARTING_CREDITS=2
```

## **What Changed:**

### **Before:**
- CREDITS_PER_POST=10 → **Now: 1**
- MAX_ENGAGEMENTS_PER_DAY=50 → **Now: 9999** (unlimited as per user)
- ENGAGEMENT_TIMEOUT_HOURS=24 → **Now: 8760** (1 year = no timeout)
- USER_STARTING_CREDITS=100 → **Now: 2**

### **Translation:**
- **CREDITS_PER_ENGAGEMENT=1** ✅ (unchanged)
- **CREDITS_PER_POST=1** ✅ (much cheaper to create posts)
- **MAX_ENGAGEMENTS_PER_DAY=9999** ✅ (effectively unlimited)
- **ENGAGEMENT_TIMEOUT_HOURS=8760** ✅ (1 year = no timeout)
- **USER_STARTING_CREDITS=2** ✅ (minimal starting amount)

## **How to Update in Vercel:**

1. Go to: https://vercel.com/dashboard/hiraypawan/xchange
2. Click **"Settings"** → **"Environment Variables"**
3. Update these 5 variables:
   - CREDITS_PER_POST: 1
   - MAX_ENGAGEMENTS_PER_DAY: 9999  
   - ENGAGEMENT_TIMEOUT_HOURS: 8760
   - USER_STARTING_CREDITS: 2
4. **Redeploy** to apply changes

## **Impact:**
- ✅ **Cheaper posts** (1 credit vs 10)
- ✅ **Unlimited daily engagements** (9999 vs 50)  
- ✅ **No timeouts** (1 year vs 24 hours)
- ✅ **Lower starting credits** (2 vs 100)