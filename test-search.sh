#!/bin/bash

# Test script for the search API endpoint
# Usage: ./test-search.sh [search_query]

API_URL="http://localhost:3000/api/search"
QUERY="${1:-test meeting}"

echo "Testing search API endpoint..."
echo "API URL: $API_URL"
echo "Query: $QUERY"
echo

# Test 1: Search functionality
echo "=== Test 1: Search Functionality ==="
curl -X POST \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"type\": \"search\"}" \
  "$API_URL" \
  -w "\n\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n"

echo
echo "=== Test 2: Index Functionality ==="

# Test 2: Index functionality
TEST_MEETING_ID="test_meeting_$(date +%s)"
TEST_CONTENT="This is a test meeting transcript about project planning and budget discussion."
TEST_METADATA="{\"title\": \"Test Meeting\", \"date\": \"$(date -Iseconds)\", \"participants\": [\"Alice\", \"Bob\"]}"

curl -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"index\",
    \"meetingId\": \"$TEST_MEETING_ID\",
    \"content\": \"$TEST_CONTENT\",
    \"metadata\": $TEST_METADATA
  }" \
  "$API_URL" \
  -w "\n\nHTTP Status: %{http_code}\nTotal time: %{time_total}s\n"

echo
echo "Test completed!"
echo "Meeting ID used for indexing: $TEST_MEETING_ID"
