import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function createIndex() {
  try {
    console.log('🚀 Creating Pinecone index...');
    
    // Check if API key is available
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ PINECONE_API_KEY not found in .env.local');
      process.exit(1);
    }

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });

    const indexName = process.env.PINECONE_INDEX || 'meeting-embeddings';
    
    console.log(`📝 Index name: ${indexName}`);
    
    // Check if index already exists
    try {
      const indexStats = await pinecone.index(indexName).describeIndexStats();
      console.log('✅ Index already exists!');
      console.log('📊 Index stats:', indexStats);
      return;
    } catch {
      // Index doesn't exist, continue to create it
      console.log('📋 Index does not exist, creating...');
    }

    // Create the index
    await pinecone.createIndex({
      name: indexName,
      dimension: 1536, // dimension for text-embedding-ada-002
      metric: 'cosine',
      spec: {
        serverless: {
          cloud: 'aws',
          region: 'us-east-1'
        }
      }
    });

    console.log('✅ Index created successfully!');
    console.log('⏳ Note: It may take a few minutes for the index to be ready.');
    
    // Wait for index to be ready
    console.log('🔄 Checking index status...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max
    
    while (attempts < maxAttempts) {
      try {
        const indexStats = await pinecone.index(indexName).describeIndexStats();
        console.log('🎉 Index is ready!');
        console.log('📊 Index stats:', indexStats);
        break;
      } catch {
        attempts++;
        console.log(`⏳ Waiting for index to be ready... (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      }
    }
    
    if (attempts >= maxAttempts) {
      console.log('⚠️  Index creation may still be in progress. Check your Pinecone console.');
    }

  } catch (error) {
    console.error('❌ Error creating index:', error instanceof Error ? error.message : error);
    
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('🔑 Check your PINECONE_API_KEY in .env.local');
      } else if (error.message.includes('already exists')) {
        console.log('✅ Index already exists!');
      } else {
        console.error('🐛 Full error:', error);
      }
    }
    
    process.exit(1);
  }
}

createIndex();
