'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { TranscriptionResult } from './realtime-transcriber';

export interface UseWebSocketOptions {
  onTranscriptionResult?: (result: TranscriptionResult) => void;
  onError?: (error: string) => void;
  onSessionStarted?: (sessionId: string) => void;
  onSessionEnded?: (sessionId: string) => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection when component mounts
    const socket = io({
      path: '/api/socketio',
      addTrailingSlash: false,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      setSessionId(null);
    });

    socket.on('session-started', (data) => {
      console.log('Transcription session started:', data.sessionId);
      setSessionId(data.sessionId);
      options.onSessionStarted?.(data.sessionId);
    });

    socket.on('session-ended', (data) => {
      console.log('Transcription session ended:', data.sessionId);
      setSessionId(null);
      options.onSessionEnded?.(data.sessionId);
    });

    socket.on('transcription-result', (result) => {
      console.log('Received transcription:', result);
      options.onTranscriptionResult?.(result);
    });

    socket.on('transcription-error', (error) => {
      console.error('Transcription error:', error);
      options.onError?.(error.error || 'Unknown transcription error');
    });

    return () => {
      socket.disconnect();
    };
  }, [options]);

  const startTranscription = (sessionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('start-transcription', { sessionId });
    }
  };

  const sendAudioChunk = (audioData: ArrayBuffer, sessionId: string, timestamp: number) => {
    if (socketRef.current && isConnected) {
      // Convert ArrayBuffer to array for transmission
      const audioArray = Array.from(new Uint8Array(audioData));
      socketRef.current.emit('audio-chunk', {
        audioData: audioArray,
        sessionId,
        timestamp
      });
    }
  };

  const endTranscription = (sessionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('end-transcription', { sessionId });
    }
  };

  return {
    isConnected,
    sessionId,
    startTranscription,
    sendAudioChunk,
    endTranscription
  };
};
