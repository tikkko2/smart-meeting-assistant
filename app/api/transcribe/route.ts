import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'OpenAI API key is not configured' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('audio') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`Processing audio file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Validate file type
    const validTypes = [
      'audio/wav', 
      'audio/mpeg', 
      'audio/mp3', 
      'audio/mp4', 
      'audio/webm', 
      'audio/ogg',
      'audio/m4a',
      'audio/aac',
      'audio/flac'
    ];
    
    // Also check file extension if MIME type is not recognized
    const validExtensions = ['.wav', '.mp3', '.mp4', '.webm', '.ogg', '.m4a', '.aac', '.flac'];
    const fileExtension = file.name.toLowerCase().match(/\.[^/.]+$/)?.[0];
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension || '')) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Supported types: WAV, MP3, MP4, WebM, OGG, M4A, AAC, FLAC` },
        { status: 400 }
      );
    }

    // Validate file size (25MB limit for Whisper API)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['word', 'segment']
    });

    return NextResponse.json({
      transcript: transcription.text,
      segments: transcription.segments,
      words: transcription.words
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Handle specific OpenAI errors
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { error: 'Invalid or missing OpenAI API key' },
          { status: 401 }
        );
      }
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
      if (error.message.includes('quota')) {
        return NextResponse.json(
          { error: 'OpenAI quota exceeded' },
          { status: 402 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}