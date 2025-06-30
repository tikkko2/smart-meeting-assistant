import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Pinecone with error handling
const initializePinecone = () => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not configured');
  }
  
  // For newer Pinecone SDK versions, no environment parameter is needed
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
  });
};

const getIndex = () => {
  const indexName = process.env.PINECONE_INDEX || 'meeting-embeddings';
  const pinecone = initializePinecone();
  return pinecone.index(indexName);
};

export async function POST(request: NextRequest) {
  try {
    // Read the request body once and destructure all needed fields
    const body = await request.json();
    const { query, type = 'search', meetingId, content, metadata } = body;

    if (type === 'index') {
      // Validate required fields for indexing
      if (!meetingId || !content) {
        return NextResponse.json(
          { error: 'meetingId and content are required for indexing' },
          { status: 400 }
        );
      }

      console.log(`Indexing meeting: ${meetingId}`);
      
      const embedding = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: content,
      });

      const index = getIndex();
      await index.upsert([{
        id: meetingId,
        values: embedding.data[0].embedding,
        metadata: {
          ...metadata,
          // Store a snippet of content in metadata for search results
          contentSnippet: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          contentLength: content.length
        }
      }]);

      console.log(`Successfully indexed meeting: ${meetingId}`);
      return NextResponse.json({ success: true, meetingId });
    }

    // Search functionality
    if (!query) {
      return NextResponse.json(
        { error: 'query is required for search' },
        { status: 400 }
      );
    }

    console.log(`Searching for: ${query}`);
    
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query,
    });

    const index = getIndex();
    const searchResults = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 10,
      includeMetadata: true,
    });

    console.log(`Found ${searchResults.matches.length} results for query: ${query}`);

    return NextResponse.json({
      results: searchResults.matches,
      query: query
    });

  } catch (error) {
    console.error('Search error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing API key' },
          { status: 401 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('404') || error.message.includes('not found')) {
        const indexName = process.env.PINECONE_INDEX || 'meeting-embeddings';
        return NextResponse.json(
          { 
            error: 'Pinecone index not found',
            details: `Index "${indexName}" doesn't exist. Please create it in your Pinecone console.`,
            instructions: 'Go to https://app.pinecone.io and create an index with dimension 1536 and metric "cosine"'
          },
          { status: 404 }
        );
      }
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        return NextResponse.json(
          { error: 'Invalid Pinecone API key' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}