'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Save, Users, Clock, Wifi, WifiOff } from 'lucide-react';
import { Meeting, Participant } from '@/lib/types';

interface LiveTranscriptionProps {
  onMeetingCreated: (meeting: Meeting) => void;
}

interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  confidence: number;
}

interface ConnectionStatus {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  error?: string;
}

export default function LiveTranscription({ onMeetingCreated }: LiveTranscriptionProps) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isRecording: false,
    isProcessing: false
  });
  
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [duration, setDuration] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const segmentsRef = useRef<TranscriptionSegment[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  // Update duration timer
  useEffect(() => {
    if (status.isRecording && startTimeRef.current) {
      intervalRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current!) / 1000));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [status.isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, error: undefined }));

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      streamRef.current = stream;

      // Initialize session
      const response = await fetch('/api/live-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start-session' })
      });

      if (!response.ok) {
        throw new Error('Failed to start transcription session');
      }

      const { sessionId: newSessionId } = await response.json();
      setSessionId(newSessionId);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle audio data
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Process audio chunk for real-time transcription
          try {
            // Create a mock transcription for demonstration
            // In production, this would connect to OpenAI Whisper API
            const mockPhrases = [
              "So let's begin today's meeting by reviewing our quarterly results.",
              "The revenue numbers look promising, we're up 15% from last quarter.",
              "I think we should focus on the marketing campaign for next month.",
              "What are everyone's thoughts on the new product launch timeline?",
              "We need to address the technical challenges we discussed earlier.",
              "The customer feedback has been overwhelmingly positive so far.",
              "Let's schedule a follow-up meeting to dive deeper into these metrics.",
              "I believe we can achieve our targets if we stay focused on execution.",
              "The development team has been working hard on the new features.",
              "We should consider expanding our market reach in the next quarter.",
              "The budget allocation looks reasonable for our current projects.",
              "Let's make sure we document all the decisions made in this meeting."
            ];
            
            // Simulate real transcription with increasing confidence
            const randomPhrase = mockPhrases[Math.floor(Math.random() * mockPhrases.length)];
            const confidence = 0.85 + (Math.random() * 0.15); // 85-100% confidence
            
            // Only add transcription every few seconds to avoid spam
            const lastSegmentTime = segmentsRef.current.length > 0 
              ? segmentsRef.current[segmentsRef.current.length - 1].timestamp 
              : 0;
              
            if (segmentsRef.current.length === 0 || Date.now() - lastSegmentTime > 4000) {
              const newSegment: TranscriptionSegment = {
                id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                text: randomPhrase,
                timestamp: Date.now(),
                confidence: confidence,
                speaker: `Speaker ${Math.floor(Math.random() * 3) + 1}` // Random speaker 1-3
              };

              setSegments(prev => [...prev, newSegment]);
              setCurrentTranscript(prev => prev + (prev ? ' ' : '') + randomPhrase);
            }
          } catch (error) {
            console.error('Error processing audio chunk:', error);
          }
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setStatus(prev => ({ 
          ...prev, 
          error: 'Recording error occurred',
          isRecording: false 
        }));
      };

      // Start recording with 1-second intervals for real-time processing
      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      
      setStatus({
        isConnected: true,
        isRecording: true,
        isProcessing: false
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to start recording',
        isRecording: false 
      }));
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (mediaRecorderRef.current && status.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // End session
      if (sessionId) {
        try {
          await fetch('/api/live-transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'end-session', 
              sessionId 
            })
          });
        } catch (error) {
          console.error('Error ending session:', error);
        }
      }

      setStatus({
        isConnected: false,
        isRecording: false,
        isProcessing: false
      });
    }
  }, [status.isRecording, sessionId]);

  const saveMeeting = useCallback(async () => {
    if (!currentTranscript.trim()) {
      alert('No transcript to save');
      return;
    }

    setStatus(prev => ({ ...prev, isProcessing: true }));

    try {
      // Create audio blob from chunks (for potential future use)
      new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Analyze the transcript
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: currentTranscript })
      });

      let analysis = {
        summary: 'Meeting summary will be generated...',
        actionItems: [],
        keyDecisions: [],
        participants: participants
      };

      if (analyzeResponse.ok) {
        analysis = await analyzeResponse.json();
      }

      // Create meeting object
      const meeting: Meeting = {
        id: `live_meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: meetingTitle || `Live Meeting - ${new Date().toLocaleDateString()}`,
        transcript: currentTranscript,
        summary: analysis.summary,
        actionItems: analysis.actionItems || [],
        decisions: analysis.keyDecisions || [],
        participants: participants,
        createdAt: new Date(),
        analysis
      };

      // Save to localStorage (you might want to save to database)
      const savedMeetings = JSON.parse(localStorage.getItem('meetings') || '[]');
      savedMeetings.unshift(meeting);
      localStorage.setItem('meetings', JSON.stringify(savedMeetings));

      onMeetingCreated(meeting);

      // Reset component
      setSegments([]);
      setCurrentTranscript('');
      setMeetingTitle('');
      setDuration(0);
      startTimeRef.current = null;

    } catch (error) {
      console.error('Error saving meeting:', error);
      setStatus(prev => ({ 
        ...prev, 
        error: 'Failed to save meeting'
      }));
    } finally {
      setStatus(prev => ({ ...prev, isProcessing: false }));
    }
  }, [currentTranscript, meetingTitle, participants, onMeetingCreated]);

  const addParticipant = () => {
    const name = prompt('Enter participant name:');
    if (name && name.trim()) {
      const newParticipant: Participant = {
        id: `participant_${Date.now()}`,
        name: name.trim(),
        role: 'Participant'
      };
      setParticipants(prev => [...prev, newParticipant]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header Controls */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Live Meeting Transcription</h2>
          <div className="flex items-center space-x-2">
            {status.isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm text-gray-600">
              {status.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Meeting Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="Enter meeting title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={status.isRecording}
            />
          </div>
          <div className="flex items-end space-x-2">
            <button
              onClick={addParticipant}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center space-x-2"
              disabled={status.isRecording}
            >
              <Users className="h-4 w-4" />
              <span>Add Participant</span>
            </button>
            <span className="text-sm text-gray-600">
              {participants.length} participants
            </span>
          </div>
        </div>

        {/* Participants */}
        {participants.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {participants.map((p) => (
              <span
                key={p.id}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recording Controls */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {!status.isRecording ? (
              <button
                onClick={startRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                disabled={status.isProcessing}
              >
                <Mic className="h-5 w-5" />
                <span>Start Recording</span>
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="flex items-center space-x-2 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Square className="h-5 w-5" />
                <span>Stop Recording</span>
              </button>
            )}
            
            <button
              onClick={saveMeeting}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={status.isProcessing || !currentTranscript.trim()}
            >
              <Save className="h-4 w-4" />
              <span>Save Meeting</span>
            </button>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>{formatDuration(duration)}</span>
            </div>
            {status.isRecording && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>Recording</span>
              </div>
            )}
          </div>
        </div>

        {status.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{status.error}</p>
          </div>
        )}
      </div>

      {/* Live Transcript */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Transcript</h3>
        
        {segments.length === 0 && !status.isRecording ? (
          <div className="text-center py-8 text-gray-500">
            <Mic className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p>Start recording to see live transcription</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {segments.map((segment) => (
              <div key={segment.id} className="flex space-x-3">
                <div className="text-xs text-gray-500 min-w-0 w-16">
                  {new Date(segment.timestamp).toLocaleTimeString()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {segment.speaker || 'Speaker'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {Math.round(segment.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-gray-900">{segment.text}</p>
                </div>
              </div>
            ))}
            
            {status.isRecording && segments.length === 0 && (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Listening for speech...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Processing Status */}
      {status.isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-blue-700">Processing meeting data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
