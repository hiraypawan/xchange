import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 TESTING DATABASE CONNECTION...');
    
    // Test 1: Check environment variables
    console.log('Environment check:');
    console.log('- MONGODB_URI exists:', !!process.env.MONGODB_URI);
    console.log('- MONGODB_URI length:', process.env.MONGODB_URI?.length);
    console.log('- MONGODB_DB:', process.env.MONGODB_DB);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    
    // Test 2: Test connection
    console.log('Testing connection...');
    const { db, client } = await connectToDatabase();
    console.log('✅ Connection successful');
    
    // Test 3: Test database operations
    console.log('Testing database operations...');
    
    // List collections
    const collections = await db.listCollections().toArray();
    console.log('Existing collections:', collections.map(c => c.name));
    
    // Test write operation
    const testDoc = {
      test: true,
      timestamp: new Date(),
      testType: 'database_connection_test'
    };
    
    console.log('Attempting to insert test document...');
    const insertResult = await db.collection('test_collection').insertOne(testDoc);
    console.log('✅ Insert successful:', insertResult.insertedId);
    
    // Test read operation
    console.log('Testing read operation...');
    const foundDoc = await db.collection('test_collection').findOne({ _id: insertResult.insertedId });
    console.log('✅ Read successful:', !!foundDoc);
    
    // Test users collection specifically
    console.log('Testing users collection...');
    const userCount = await db.collection('users').countDocuments();
    console.log('Current user count:', userCount);
    
    // Try to find any existing users
    const sampleUsers = await db.collection('users').find({}).limit(3).toArray();
    console.log('Sample users:', sampleUsers.map(u => ({ 
      id: u._id, 
      twitterId: u.twitterId, 
      username: u.username,
      credits: u.credits 
    })));
    
    // Clean up test document
    await db.collection('test_collection').deleteOne({ _id: insertResult.insertedId });
    console.log('✅ Test cleanup complete');
    
    return NextResponse.json({
      success: true,
      results: {
        environmentOk: !!process.env.MONGODB_URI,
        connectionOk: true,
        writeOk: true,
        readOk: !!foundDoc,
        userCount,
        collections: collections.map(c => c.name),
        sampleUsers: sampleUsers.length
      },
      message: 'Database connection and operations working correctly'
    });
    
  } catch (error) {
    console.error('❌ DATABASE TEST FAILED:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environmentCheck: {
        mongoUri: !!process.env.MONGODB_URI,
        mongoDb: process.env.MONGODB_DB,
        nodeEnv: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🧪 TESTING USER CREATION...');
    
    const { db } = await connectToDatabase();
    
    // Test creating a user directly
    const testUser = {
      twitterId: `test_${Date.now()}`,
      username: `test_user_${Date.now()}`,
      displayName: 'Test User',
      email: `test${Date.now()}@test.com`,
      credits: 2,
      totalEarned: 2,
      totalSpent: 0,
      joinedAt: new Date(),
      lastActive: new Date(),
      isActive: true,
      settings: {
        autoEngage: false,
        maxEngagementsPerDay: 50
      },
      stats: {
        totalEngagements: 0,
        successRate: 0
      }
    };
    
    console.log('Creating test user:', testUser.twitterId);
    const result = await db.collection('users').insertOne(testUser);
    console.log('✅ Test user created:', result.insertedId);
    
    // Verify the user was created
    const createdUser = await db.collection('users').findOne({ _id: result.insertedId });
    console.log('✅ User verification:', !!createdUser);
    
    // Create a credit transaction
    const transaction = {
      userId: result.insertedId.toString(),
      type: 'starting_bonus',
      amount: 2,
      balance: 2,
      description: 'Test starting credits',
      createdAt: new Date()
    };
    
    const txResult = await db.collection('credit_transactions').insertOne(transaction);
    console.log('✅ Transaction created:', txResult.insertedId);
    
    return NextResponse.json({
      success: true,
      testUser: {
        id: result.insertedId,
        twitterId: testUser.twitterId,
        credits: createdUser?.credits
      },
      transactionId: txResult.insertedId,
      message: 'Test user creation successful'
    });
    
  } catch (error) {
    console.error('❌ USER CREATION TEST FAILED:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}