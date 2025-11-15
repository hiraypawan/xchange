import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'xchangee';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(uri);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

// Database connection helper
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  try {
    const client = await clientPromise;
    const db = client.db(dbName);
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw new Error('Database connection failed');
  }
}

// Collections helper
export async function getCollection(collectionName: string) {
  const { db } = await connectToDatabase();
  return db.collection(collectionName);
}

// Initialize database indexes and setup
export async function initializeDatabase() {
  try {
    const { db } = await connectToDatabase();

    // Users collection indexes
    await db.collection('users').createIndex({ twitterId: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { sparse: true });
    await db.collection('users').createIndex({ lastActive: -1 });
    await db.collection('users').createIndex({ credits: -1 });

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

    // Credit transactions collection indexes
    await db.collection('credit_transactions').createIndex({ userId: 1 });
    await db.collection('credit_transactions').createIndex({ type: 1 });
    await db.collection('credit_transactions').createIndex({ createdAt: -1 });
    await db.collection('credit_transactions').createIndex({ 
      userId: 1, 
      createdAt: -1 
    });

    // User sessions collection indexes
    await db.collection('user_sessions').createIndex({ userId: 1 });
    await db.collection('user_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

    // System settings collection
    await db.collection('system_settings').createIndex({ key: 1 }, { unique: true });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export default clientPromise;