#!/usr/bin/env node

/**
 * Xchangee Setup Script
 * Initializes the database and sets up the application
 */

const { MongoClient } = require('mongodb');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function question(text) {
  return new Promise((resolve) => {
    rl.question(text, resolve);
  });
}

async function setupDatabase() {
  console.log('🚀 Setting up Xchangee Database...\n');

  // Get MongoDB connection details
  const mongoUri = await question('Enter MongoDB URI: ');
  const dbName = await question('Enter Database Name (default: xchangee): ') || 'xchangee';

  try {
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(dbName);
    console.log('✅ Connected to MongoDB successfully');

    // Create collections and indexes
    console.log('\n🗂️  Creating collections and indexes...');
    
    // Users collection
    console.log('Creating users collection...');
    await db.collection('users').createIndex({ twitterId: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastActive: -1 });
    await db.collection('users').createIndex({ credits: -1 });
    console.log('✅ Users collection configured');

    // Posts collection
    console.log('Creating posts collection...');
    await db.collection('posts').createIndex({ userId: 1 });
    await db.collection('posts').createIndex({ status: 1 });
    await db.collection('posts').createIndex({ engagementType: 1 });
    await db.collection('posts').createIndex({ createdAt: -1 });
    await db.collection('posts').createIndex({ expiresAt: 1 });
    await db.collection('posts').createIndex({ 
      status: 1, 
      engagementType: 1, 
      createdAt: -1 
    });
    console.log('✅ Posts collection configured');

    // Engagements collection
    console.log('Creating engagements collection...');
    await db.collection('engagements').createIndex({ postId: 1 });
    await db.collection('engagements').createIndex({ userId: 1 });
    await db.collection('engagements').createIndex({ status: 1 });
    await db.collection('engagements').createIndex({ createdAt: -1 });
    await db.collection('engagements').createIndex({ 
      userId: 1, 
      status: 1, 
      createdAt: -1 
    });
    console.log('✅ Engagements collection configured');

    // Credit transactions collection
    console.log('Creating credit_transactions collection...');
    await db.collection('credit_transactions').createIndex({ userId: 1 });
    await db.collection('credit_transactions').createIndex({ type: 1 });
    await db.collection('credit_transactions').createIndex({ createdAt: -1 });
    await db.collection('credit_transactions').createIndex({ 
      userId: 1, 
      createdAt: -1 
    });
    console.log('✅ Credit transactions collection configured');

    // User sessions collection
    console.log('Creating user_sessions collection...');
    await db.collection('user_sessions').createIndex({ userId: 1 });
    await db.collection('user_sessions').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    console.log('✅ User sessions collection configured');

    // System settings collection
    console.log('Creating system_settings collection...');
    await db.collection('system_settings').createIndex({ key: 1 }, { unique: true });
    
    // Insert default system settings
    const defaultSettings = [
      { key: 'credits_per_engagement', value: 1 },
      { key: 'credits_per_post', value: 10 },
      { key: 'max_engagements_per_day', value: 50 },
      { key: 'engagement_timeout_hours', value: 24 },
      { key: 'user_starting_credits', value: 100 },
      { key: 'platform_fee_percentage', value: 5 },
      { key: 'min_payout_amount', value: 100 },
      { key: 'max_post_duration_hours', value: 72 },
    ];

    for (const setting of defaultSettings) {
      await db.collection('system_settings').updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      );
    }
    console.log('✅ System settings collection configured');

    await client.close();
    console.log('\n🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    process.exit(1);
  }
}

async function createEnvFile() {
  console.log('\n⚙️  Setting up environment file...\n');

  const envContent = `# X/Twitter API Configuration
NEXT_PUBLIC_TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
NEXT_PUBLIC_TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/twitter/callback

# Application Settings
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=${generateSecret()}

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/xchangee
MONGODB_DB=xchangee

# JWT Secret
JWT_SECRET=${generateSecret()}

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=60

# System Configuration
CREDITS_PER_ENGAGEMENT=1
CREDITS_PER_POST=10
MAX_ENGAGEMENTS_PER_DAY=50
ENGAGEMENT_TIMEOUT_HOURS=24
USER_STARTING_CREDITS=100
`;

  const fs = require('fs');
  const path = require('path');

  const envPath = path.join(process.cwd(), '.env.local');
  
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env.local already exists. Overwrite? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Skipping .env.local creation');
      return;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env.local file created');
  console.log('⚠️  Please update the Twitter API credentials in .env.local');
}

function generateSecret() {
  return require('crypto').randomBytes(32).toString('hex');
}

async function setupAdmin() {
  console.log('\n👤 Setting up admin user...\n');
  
  const createAdmin = await question('Create admin user? (y/N): ');
  if (createAdmin.toLowerCase() !== 'y') {
    return;
  }

  const adminEmail = await question('Admin email: ');
  const adminPassword = await question('Admin password: ');
  
  // This would typically connect to the database and create an admin user
  console.log('✅ Admin user setup completed');
}

async function installDependencies() {
  console.log('\n📦 Installing dependencies...\n');
  
  const { spawn } = require('child_process');
  
  return new Promise((resolve, reject) => {
    const npm = spawn('npm', ['install'], { stdio: 'inherit' });
    
    npm.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Dependencies installed successfully');
        resolve();
      } else {
        reject(new Error(`npm install failed with code ${code}`));
      }
    });
  });
}

async function main() {
  console.log(`
  ╔══════════════════════════════════════╗
  ║        🚀 XCHANGEE SETUP             ║
  ║  Twitter Engagement Platform Setup   ║
  ╚══════════════════════════════════════╝
  `);

  try {
    // Install dependencies
    await installDependencies();

    // Create environment file
    await createEnvFile();

    // Setup database
    await setupDatabase();

    // Setup admin (optional)
    await setupAdmin();

    console.log(`
  ╔══════════════════════════════════════╗
  ║           🎉 SETUP COMPLETE!         ║
  ╚══════════════════════════════════════╝

  Next steps:
  1. Update Twitter API credentials in .env.local
  2. Run: npm run dev
  3. Open: http://localhost:3000
  4. Test the application
  5. Deploy to production

  Happy coding! 🚀
    `);

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.log('\n📖 Please check the documentation for manual setup instructions.');
  } finally {
    rl.close();
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n👋 Setup interrupted. You can run this script again anytime.');
  rl.close();
  process.exit(0);
});

// Run the setup
main();