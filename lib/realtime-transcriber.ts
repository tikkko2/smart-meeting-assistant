import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AudioChunk {
  data: ArrayBuffer;
  timestamp: number;
  sessionId: string;
}

export interface TranscriptionResult {
  text: string;
  timestamp: number;
  confidence: number;
  sessionId: string;
  isPartial: boolean;
}

export class RealTimeTranscriber {
  private audioChunks: Map<string, ArrayBuffer[]> = new Map();
  private isProcessing: Map<string, boolean> = new Map();

  async processAudioChunk(chunk: AudioChunk): Promise<TranscriptionResult | null> {
    const { data, timestamp, sessionId } = chunk;

    // Store chunk for session
    if (!this.audioChunks.has(sessionId)) {
      this.audioChunks.set(sessionId, []);
    }
    this.audioChunks.get(sessionId)!.push(data);

    // Avoid processing if already processing for this session
    if (this.isProcessing.get(sessionId)) {
      return null;
    }

    this.isProcessing.set(sessionId, true);

    try {
      // Combine recent chunks (last 3 seconds worth)
      const chunks = this.audioChunks.get(sessionId) || [];
      const combinedBuffer = this.combineAudioChunks(chunks.slice(-30)); // ~3 seconds at 10 chunks/sec

      if (combinedBuffer.byteLength < 1024) {
        // Not enough audio data yet
        this.isProcessing.set(sessionId, false);
        return null;
      }

      // Convert to blob for OpenAI API
      const audioBlob = new Blob([combinedBuffer], { type: 'audio/webm' });
      const file = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });

      // Use OpenAI Whisper for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        response_format: 'verbose_json',
        language: 'en'
      });

      this.isProcessing.set(sessionId, false);

      return {
        text: transcription.text,
        timestamp,
        confidence: 0.95, // Whisper doesn't provide confidence scores
        sessionId,
        isPartial: false
      };

    } catch (error) {
      console.error('Real-time transcription error:', error);
      this.isProcessing.set(sessionId, false);
      return null;
    }
  }

  private combineAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const combined = new Uint8Array(totalLength);
    
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    return combined.buffer;
  }

  cleanupSession(sessionId: string): void {
    this.audioChunks.delete(sessionId);
    this.isProcessing.delete(sessionId);
  }
}

// Global instance
export const realTimeTranscriber = new RealTimeTranscriber();
