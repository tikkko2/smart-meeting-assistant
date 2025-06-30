#!/bin/bash

# Test script for the transcribe API endpoint
# Usage: ./test-transcribe.sh [audio_file_path]

API_URL="http://localhost:3000/api/transcribe"
AUDIO_FILE="${1:-test-audio.wav}"

echo "Testing transcribe API endpoint..."
echo "API URL: $API_URL"
echo "Audio file: $AUDIO_FILE"
echo

if [ ! -f "$AUDIO_FILE" ]; then
    echo "Error: Audio file '$AUDIO_FILE' not found!"
    echo
    echo "Usage: $0 [audio_file_path]"
    echo "Example: $0 my-recording.wav"
    echo
    echo "Supported formats: WAV, MP3, MP4, WebM, OGG"
    exit 1
fi

echo "Sending POST request..."
curl -X POST \
  -F "audio=@$AUDIO_FILE" \
  "$API_URL" \
  -H "Content-Type: multipart/form-data" \
  -w "\n\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n"

echo
echo "Test completed!"
