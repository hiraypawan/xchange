import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

// Check if user is admin
function isAdmin(session: any) {
  return session?.user?.email === 'your-email@example.com' || 
         session?.user?.name === 'Pawan Hiray' ||
         session?.user?.id === 'your-twitter-user-id' ||
         session?.user?.email?.toLowerCase().includes('pawan') ||
         session?.user?.name?.toLowerCase().includes('pawan hiray');
}

// POST /api/admin/reset-indexes - Reset database indexes for duplicate prevention
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    console.log('🔧 Admin initiated index reset via API:', session.user?.name);

    const { db } = await connectToDatabase();
    
    const results = {
      droppedIndexes: false,
      createdIndexes: [],
      errors: []
    };

    // Drop existing indexes (except _id)
    try {
      console.log('🗑️ Dropping existing user collection indexes...');
      await db.collection('users').dropIndexes();
      results.droppedIndexes = true;
      console.log('✅ Existing indexes dropped');
    } catch (error) {
      console.log('⚠️ No indexes to drop or drop failed (this is usually OK)');
      results.errors.push('Drop indexes: ' + (error as Error).message);
    }
    
    // Create new indexes with proper unique constraints
    console.log('📝 Creating new indexes with duplicate prevention...');
    
    try {
      // Primary unique constraints
      await db.collection('users').createIndex(
        { twitterId: 1 }, 
        { unique: true, sparse: true, name: 'unique_twitterId' }
      );
      results.createdIndexes.push('unique_twitterId');
      console.log('✅ Created unique twitterId index');
      
      await db.collection('users').createIndex(
        { email: 1 }, 
        { unique: true, sparse: true, name: 'unique_email' }
      );
      results.createdIndexes.push('unique_email');
      console.log('✅ Created unique email index');
      
      await db.collection('users').createIndex(
        { username: 1 }, 
        { unique: true, sparse: true, name: 'unique_username' }
      );
      results.createdIndexes.push('unique_username');
      console.log('✅ Created unique username index');
      
      // Compound unique constraint to prevent name duplicates
      await db.collection('users').createIndex(
        { displayName: 1, username: 1 }, 
        { unique: true, sparse: true, name: 'unique_displayName_username' }
      );
      results.createdIndexes.push('unique_displayName_username');
      console.log('✅ Created unique displayName+username compound index');
      
      // Performance indexes
      await db.collection('users').createIndex(
        { lastActive: -1 }, 
        { name: 'lastActive_desc' }
      );
      results.createdIndexes.push('lastActive_desc');
      console.log('✅ Created lastActive performance index');
      
      await db.collection('users').createIndex(
        { credits: -1 }, 
        { name: 'credits_desc' }
      );
      results.createdIndexes.push('credits_desc');
      console.log('✅ Created credits performance index');
      
      await db.collection('users').createIndex(
        { joinedAt: -1 }, 
        { name: 'joinedAt_desc' }
      );
      results.createdIndexes.push('joinedAt_desc');
      console.log('✅ Created joinedAt performance index');
      
    } catch (error) {
      console.error('❌ Error creating indexes:', error);
      results.errors.push('Create indexes: ' + (error as Error).message);
    }
    
    // List all indexes to verify
    const indexes = await db.collection('users').listIndexes().toArray();
    
    console.log('✅ Database indexes reset completed via API');
    console.log('🔒 Future duplicate users will now be prevented at the database level.');

    // Log admin action
    console.log('✅ Index reset completed:', {
      adminUser: session.user?.name,
      results,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Database indexes reset successfully',
      results: {
        droppedIndexes: results.droppedIndexes,
        createdIndexes: results.createdIndexes,
        totalIndexes: indexes.length,
        errors: results.errors,
        allIndexes: indexes.map(index => ({
          name: index.name,
          keys: index.key,
          unique: index.unique || false
        }))
      }
    });

  } catch (error) {
    console.error('❌ Index reset failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reset database indexes',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/reset-indexes - Check current indexes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !isAdmin(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // List current indexes
    const indexes = await db.collection('users').listIndexes().toArray();
    
    // Check if we have the required unique indexes
    const requiredIndexes = [
      'unique_twitterId',
      'unique_email', 
      'unique_username',
      'unique_displayName_username'
    ];
    
    const hasRequiredIndexes = requiredIndexes.every(indexName => 
      indexes.some(index => index.name === indexName && index.unique)
    );

    return NextResponse.json({
      success: true,
      currentState: {
        totalIndexes: indexes.length,
        hasRequiredUniqueIndexes: hasRequiredIndexes,
        indexes: indexes.map(index => ({
          name: index.name,
          keys: index.key,
          unique: index.unique || false,
          sparse: index.sparse || false
        })),
        missingIndexes: requiredIndexes.filter(indexName => 
          !indexes.some(index => index.name === indexName)
        )
      }
    });

  } catch (error) {
    console.error('Check indexes failed:', error);
    return NextResponse.json({ error: 'Failed to check indexes' }, { status: 500 });
  }
}