'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2, CheckCircle, XCircle, FileAudio } from 'lucide-react';
import { Meeting, Participant } from '@/lib/types';

interface AudioUploaderProps {
  onMeetingProcessed: (meeting: Meeting) => void;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  message?: string;
}

export default function AudioUploader({ onMeetingProcessed }: AudioUploaderProps) {
  const [processing, setProcessing] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { name: 'Transcribing audio', status: 'pending' },
    { name: 'Analyzing content', status: 'pending' },
    { name: 'Creating visual summary', status: 'pending' },
    { name: 'Indexing for search', status: 'pending' }
  ]);

  const updateStep = (index: number, status: ProcessingStep['status'], message?: string) => {
    setSteps(prev => prev.map((step, i) => 
      i === index ? { ...step, status, message } : step
    ));
  };

  const resetSteps = () => {
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', message: undefined })));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file size (25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      alert('File size must be less than 25MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a)$/i)) {
      alert('Please upload an MP3, WAV, or M4A file');
      return;
    }

    setCurrentFile(file);
    setProcessing(true);
    resetSteps();

    try {
      // Step 1: Transcribe Audio
      updateStep(0, 'processing');
      const formData = new FormData();
      formData.append('audio', file);
      
      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!transcribeResponse.ok) {
        throw new Error('Transcription failed');
      }
      
      const transcription = await transcribeResponse.json();
      updateStep(0, 'completed', `Transcribed ${transcription.transcript.length} characters`);

      // Step 2: Analyze Content
      updateStep(1, 'processing');
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcription.transcript }),
      });
      
      if (!analyzeResponse.ok) {
        throw new Error('Content analysis failed');
      }
      
      const analysis = await analyzeResponse.json();
      updateStep(1, 'completed', 
        `Found ${analysis.actionItems?.length || 0} action items, ${analysis.keyDecisions?.length || 0} decisions`
      );

      // Step 3: Generate Visual Summary
      updateStep(2, 'processing');
      const visualResponse = await fetch('/api/visualize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: analysis.summary,
          keyDecisions: analysis.keyDecisions || [],
          actionItems: analysis.actionItems || []
        }),
      });
      
      if (!visualResponse.ok) {
        throw new Error('Visual generation failed');
      }
      
      const visual = await visualResponse.json();
      updateStep(2, 'completed', 'Visual summary created');

      // Step 4: Index for Search
      updateStep(3, 'processing');
      const meetingId = `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'index',
          meetingId,
          content: transcription.transcript,
          metadata: {
            title: file.name.replace(/\.[^/.]+$/, ''),
            summary: analysis.summary,
            date: new Date().toISOString(),
            participants: analysis.participants?.map((p: Participant) => p.name) || []
          },
        }),
      });

      // Don't fail the whole process if search indexing fails
      if (searchResponse.ok) {
        updateStep(3, 'completed', 'Indexed for search');
      } else {
        updateStep(3, 'error', 'Search indexing failed (meeting still saved)');
      }

      // Create meeting object
      const meeting = {
        id: meetingId,
        title: file.name.replace(/\.[^/.]+$/, ''),
        transcript: transcription.transcript,
        summary: analysis.summary,
        actionItems: analysis.actionItems || [],
        decisions: analysis.keyDecisions || [],
        participants: analysis.participants || [],
        imageUrl: visual.imageUrl,
        createdAt: new Date(),
        analysis: analysis
      };

      // Notify parent component
      onMeetingProcessed(meeting);

      // Show success message briefly
      setTimeout(() => {
        setProcessing(false);
        setCurrentFile(null);
        resetSteps();
      }, 2000);

    } catch (error) {
      console.error('Processing error:', error);
      
      // Update the current step as failed
      const currentStepIndex = steps.findIndex(step => step.status === 'processing');
      if (currentStepIndex !== -1) {
        updateStep(currentStepIndex, 'error', error instanceof Error ? error.message : 'Processing failed');
      }
      
      setTimeout(() => {
        setProcessing(false);
        setCurrentFile(null);
        resetSteps();
      }, 3000);
    }
  }, [onMeetingProcessed, steps]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a'],
    },
    multiple: false,
    disabled: processing
  });

  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (file: File) => {
    // This is a rough estimate - you might want to use a library to get actual duration
    const estimatedDuration = Math.round(file.size / (128 * 1024 / 8)); // Rough estimate for 128kbps
    const minutes = Math.floor(estimatedDuration / 60);
    const seconds = estimatedDuration % 60;
    return `~${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-400 bg-blue-50 scale-105'
            : processing
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        
        {processing ? (
          <div className="space-y-4">
            <Loader2 className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Processing Meeting</h3>
              <p className="text-sm text-gray-600">
                {currentFile?.name} ({formatFileSize(currentFile?.size || 0)})
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Upload Meeting Recording
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {isDragActive
                  ? 'Drop your audio file here...'
                  : 'Drag and drop your audio file here, or click to select'
                }
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <p>Supports: MP3, WAV, M4A</p>
                <p>Max size: 25MB | Max duration: ~30 minutes</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current File Info */}
      {currentFile && processing && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center space-x-3">
            <FileAudio className="h-8 w-8 text-blue-500" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {currentFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(currentFile.size)} • {formatDuration(currentFile)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Steps */}
      {processing && (
        <div className="bg-white rounded-lg border p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Processing Steps</h4>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start space-x-3">
                {getStepIcon(step)}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${
                    step.status === 'completed' ? 'text-green-700' :
                    step.status === 'error' ? 'text-red-700' :
                    step.status === 'processing' ? 'text-blue-700' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  {step.message && (
                    <p className="text-xs text-gray-600 mt-1">{step.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Message */}
      {processing && steps.every(step => step.status === 'completed' || step.status === 'error') && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <h4 className="text-sm font-medium text-green-800">Meeting Processed Successfully!</h4>
              <p className="text-sm text-green-700">
                Your meeting has been transcribed, analyzed, and is ready to view.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing Tips */}
      {!processing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for Best Results</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Ensure clear audio quality with minimal background noise</li>
            <li>• Recordings with multiple speakers work best when speakers are clearly audible</li>
            <li>• The AI will automatically identify action items, decisions, and key topics</li>
            <li>• Processing typically takes 1-2 minutes depending on file size</li>
          </ul>
        </div>
      )}
    </div>
  );
}