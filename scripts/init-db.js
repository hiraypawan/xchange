// Simple database initialization script
const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://justcheck008:Pawan@098@cluster0.owqjoou.mongodb.net/?appName=Cluster0';
const DB_NAME = 'xchangee';

async function initializeDatabase() {
  console.log('🚀 Initializing Xchangee Database...');
  
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    
    // Create indexes for better performance
    console.log('📊 Creating database indexes...');
    
    // Users collection indexes
    await db.collection('users').createIndex({ twitterId: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastActive: -1 });
    await db.collection('users').createIndex({ credits: -1 });
    console.log('✅ Users indexes created');

    // Posts collection indexes
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
    console.log('✅ Posts indexes created');

    // Engagements collection indexes
    await db.collection('engagements').createIndex({ postId: 1 });
    await db.collection('engagements').createIndex({ userId: 1 });
    await db.collection('engagements').createIndex({ status: 1 });
    await db.collection('engagements').createIndex({ createdAt: -1 });
    await db.collection('engagements').createIndex({ 
      userId: 1, 
      status: 1, 
      createdAt: -1 
    });
    console.log('✅ Engagements indexes created');

    // Credit transactions collection indexes
    await db.collection('credit_transactions').createIndex({ userId: 1 });
    await db.collection('credit_transactions').createIndex({ type: 1 });
    await db.collection('credit_transactions').createIndex({ createdAt: -1 });
    await db.collection('credit_transactions').createIndex({ 
      userId: 1, 
      createdAt: -1 
    });
    console.log('✅ Credit transactions indexes created');

    // User sessions collection indexes
    await db.collection('user_sessions').createIndex({ userId: 1 });
    await db.collection('user_sessions').createIndex(
      { expiresAt: 1 }, 
      { expireAfterSeconds: 0 }
    );
    console.log('✅ User sessions indexes created');

    // System settings collection
    await db.collection('system_settings').createIndex({ key: 1 }, { unique: true });
    
    // Insert default system settings
    const defaultSettings = [
      { key: 'credits_per_engagement', value: 1 },
      { key: 'credits_per_post', value: 10 },
      { key: 'max_engagements_per_day', value: 50 },
      { key: 'engagement_timeout_hours', value: 24 },
      { key: 'user_starting_credits', value: 100 },
      { key: 'platform_fee_percentage', value: 5 },
    ];

    for (const setting of defaultSettings) {
      await db.collection('system_settings').updateOne(
        { key: setting.key },
        { $setOnInsert: setting },
        { upsert: true }
      );
    }
    console.log('✅ System settings configured');

    await client.close();
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase();