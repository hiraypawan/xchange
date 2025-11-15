# 🚀 Xchangee - Twitter/X Engagement Platform

A production-ready Twitter/X engagement automation platform with a credit-based economy system.

## ✨ Features

- **Credit-Based Economy**: Earn credits by engaging, spend credits to get engagement
- **Chrome Extension**: Automated browser-based engagement
- **Real-time Analytics**: Track performance and earnings
- **Secure Authentication**: Twitter OAuth 2.0 with PKCE
- **Production Ready**: Scalable, secure, and monitored

## 🏗️ Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB
- **Authentication**: NextAuth.js with Twitter OAuth
- **Extension**: Chrome Extension with Manifest V3
- **Deployment**: Vercel-ready

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/hiraypawan/xchange.git
   cd xchange
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📱 How It Works

1. **Sign Up**: Connect with Twitter OAuth → Get 100 starting credits
2. **Browse Feed**: Find engagement opportunities
3. **Engage**: Use Chrome extension to auto-engage → Earn credits
4. **Post Content**: Spend credits to get guaranteed engagement
5. **Grow**: Watch your content get real engagement boost

## 🎯 Credit System

- **Starting Credits**: 100 credits for new users
- **Earn Credits**: 1 credit per engagement completed
- **Spend Credits**: 10 credits to create an engagement post
- **Engagement Types**: Likes, Retweets, Replies, Follows

## 🔐 Security Features

- Twitter OAuth 2.0 with PKCE flow
- Secure session management
- Rate limiting on all endpoints
- Input validation and sanitization
- SQL injection protection
- XSS prevention

## 📊 Admin Features

- Real-time user statistics
- Credit flow monitoring
- Engagement success rates
- Platform health metrics
- Configurable system settings

## 🛠️ Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🚀 Deployment

1. **Deploy to Vercel**
   - Connect your GitHub repository
   - Add environment variables
   - Deploy automatically

2. **Set up MongoDB**
   - Use the provided connection string
   - Database will be created automatically

3. **Configure Twitter App**
   - Update redirect URLs in Twitter Developer Console
   - Ensure OAuth 2.0 settings are correct

## 📄 Environment Variables

```env
# Twitter API
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=your_redirect_uri

# Application
NEXT_PUBLIC_APP_URL=your_app_url
NEXTAUTH_SECRET=your_nextauth_secret

# Database
MONGODB_URI=your_mongodb_connection_string

# System Configuration
CREDITS_PER_ENGAGEMENT=1
CREDITS_PER_POST=10
USER_STARTING_CREDITS=100
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@xchangee.com or join our Discord community.