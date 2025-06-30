import { NextRequest } from 'next/server';
import { realTimeTranscriber } from '@/lib/realtime-transcriber';

export async function GET(request: NextRequest) {
  const upgrade = request.headers.get('upgrade');
  
  if (upgrade !== 'websocket') {
    return new Response('WebSocket upgrade required', { status: 400 });
  }

  return new Response('WebSocket connection established', { status: 200 });
}

// Handle real-time transcription requests
export async function POST(request: NextRequest) {
  try {
    const { action, audioData, sessionId, timestamp } = await request.json();

    if (action === 'start-session') {
      // Initialize transcription session
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return Response.json({ 
        success: true, 
        sessionId: newSessionId,
        message: 'Transcription session started'
      });
    }

    if (action === 'process-audio' && audioData && sessionId) {
      // Process audio chunk for transcription
      try {
        const audioBuffer = new Uint8Array(audioData).buffer;
        const result = await realTimeTranscriber.processAudioChunk({
          data: audioBuffer,
          timestamp: timestamp || Date.now(),
          sessionId
        });

        if (result) {
          return Response.json({
            success: true,
            transcription: result
          });
        } else {
          return Response.json({
            success: true,
            transcription: null,
            message: 'No transcription available yet'
          });
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        return Response.json({
          success: false,
          error: 'Failed to process audio chunk'
        }, { status: 500 });
      }
    }

    if (action === 'end-session' && sessionId) {
      // Clean up transcription session
      realTimeTranscriber.cleanupSession(sessionId);
      return Response.json({
        success: true,
        message: 'Transcription session ended'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Live transcription error:', error);
    return Response.json(
      { error: 'Failed to process live transcription request' },
      { status: 500 }
    );
  }
}
