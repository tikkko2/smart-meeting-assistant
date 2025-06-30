'use client';

import { useState, useEffect } from 'react';
import { Search, Clock, FileText, Users, Loader2, Filter, Calendar } from 'lucide-react';
import { Meeting, Participant } from '@/lib/types';

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    title: string;
    summary: string;
    date: string;
    participants?: string[];
    contentSnippet?: string;
    contentLength?: number;
  };
  content?: string; // Make content optional since Pinecone results may not have it
}

interface SearchInterfaceProps {
  meetings?: Meeting[];
}

export default function SearchInterface({ meetings = [] }: SearchInterfaceProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    minScore: 0.7
  });

  // Load search history from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const history = localStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    }
  }, []);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      // Call your search API endpoint
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          type: 'search',
          filters: filters
        }),
      });

      const data = await response.json();
      
      if (data.results) {
        // Filter results based on minimum score
        const filteredResults = data.results.filter((result: SearchResult) => 
          result.score >= filters.minScore
        );
        setResults(filteredResults);
      }

      // Add to search history
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      if (typeof window !== 'undefined') {
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));
      }

    } catch (error) {
      console.error('Search error:', error);
      // Fallback to local search if API fails
      performLocalSearch(searchQuery);
    } finally {
      setLoading(false);
    }
  };

  // Fallback local search function
  const performLocalSearch = (searchQuery: string) => {
    const localResults: SearchResult[] = [];
    
    meetings.forEach((meeting, index) => {
      const searchText = `${meeting.title} ${meeting.summary || ''} ${meeting.transcript || ''}`.toLowerCase();
      const queryLower = searchQuery.toLowerCase();
      
      if (searchText.includes(queryLower)) {
        // Simple relevance scoring
        const titleMatch = meeting.title.toLowerCase().includes(queryLower) ? 0.3 : 0;
        const summaryMatch = meeting.summary?.toLowerCase().includes(queryLower) ? 0.4 : 0;
        const transcriptMatch = meeting.transcript?.toLowerCase().includes(queryLower) ? 0.3 : 0;
        const score = titleMatch + summaryMatch + transcriptMatch;

        if (score > 0) {
          localResults.push({
            id: meeting.id || `local_${index}`,
            score: Math.min(score, 1),
            metadata: {
              title: meeting.title,
              summary: meeting.summary || 'No summary available',
              date: meeting.createdAt ? new Date(meeting.createdAt).toISOString() : new Date().toISOString(),
              participants: meeting.participants?.map((p: Participant) => p.name) || []
            },
            content: meeting.transcript || meeting.summary || 'No content available'
          });
        }
      }
    });

    // Sort by score descending
    localResults.sort((a, b) => b.score - a.score);
    setResults(localResults);
  };

  // Helper function to safely get display content
  const getDisplayContent = (result: SearchResult | null): string => {
    if (!result) return 'No content available';
    
    // Check if content exists and is not empty
    if (result.content && result.content.trim()) {
      const content = result.content;
      return content.length > 500 ? 
        content.substring(0, 500) + '...' : 
        content;
    }
    
    // Check for contentSnippet in metadata (from Pinecone results)
    if (result.metadata && result.metadata.contentSnippet) {
      return result.metadata.contentSnippet;
    }
    
    // Fallback to metadata summary if available
    if (result.metadata && result.metadata.summary && result.metadata.summary.trim()) {
      const summary = result.metadata.summary;
      return summary.length > 500 ? 
        summary.substring(0, 500) + '...' : 
        summary;
    }
    
    // Final fallback
    return 'No content available for this meeting.';
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 bg-green-100';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Search Meetings</h2>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <div className="flex items-center space-x-2 bg-gray-50 rounded-lg border p-3">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all meetings..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
            />
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-4 text-sm">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <label className="text-gray-600">Min Relevance:</label>
            <select
              value={filters.minScore}
              onChange={(e) => setFilters({...filters, minScore: parseFloat(e.target.value)})}
              className="border rounded px-2 py-1"
            >
              <option value={0.5}>50%</option>
              <option value={0.6}>60%</option>
              <option value={0.7}>70%</option>
              <option value={0.8}>80%</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <label className="text-gray-600">Date Range:</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({...filters, dateRange: e.target.value})}
              className="border rounded px-2 py-1"
            >
              <option value="all">All Time</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="quarter">Past Quarter</option>
            </select>
          </div>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {searchHistory.slice(0, 5).map((historyQuery, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(historyQuery);
                    handleSearch(historyQuery);
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
                >
                  {historyQuery}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Results List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Search Results ({results.length})
            </h3>
            
            {results.map((result) => (
              <div
                key={result.id}
                onClick={() => setSelectedResult(result)}
                className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedResult?.id === result.id ? 'border-blue-500 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-gray-900">{result.metadata.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(result.score)}`}>
                    {Math.round(result.score * 100)}%
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {result.metadata.summary}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(result.metadata.date)}
                  </span>
                  
                  {result.metadata.participants && result.metadata.participants.length > 0 && (
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {result.metadata.participants.length} participants
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Selected Result Details */}
          <div className="lg:sticky lg:top-6">
            {selectedResult ? (
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedResult.metadata.title}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(selectedResult.score)}`}>
                    {Math.round(selectedResult.score * 100)}% match
                  </span>
                </div>
                
                <div className="text-sm text-gray-500 flex items-center space-x-4">
                  <span className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    {formatDate(selectedResult.metadata.date)}
                  </span>
                  
                  {selectedResult.metadata.participants && selectedResult.metadata.participants.length > 0 && (
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {selectedResult.metadata.participants.join(', ')}
                    </span>
                  )}
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {selectedResult.metadata.summary}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Relevant Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <p 
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(
                          getDisplayContent(selectedResult),
                          query
                        )
                      }}
                    />
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    // Navigate to full meeting details
                    // This would typically use your routing system
                    console.log('Navigate to meeting:', selectedResult.id);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>View Full Meeting</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-6 text-center">
                <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Search Results</h3>
                <p className="text-sm text-gray-500">
                  Enter a search query to find relevant meetings, discussions, and decisions across your organization.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Results */}
      {query && !loading && results.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-sm text-gray-500 mb-4">
            No meetings found matching {query}. Try different keywords or adjust your filters.
          </p>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Search Tips:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-left max-w-md mx-auto">
              <li>Try different keywords or phrases</li>
              <li>Use broader terms (e.g., budget instead of Q4 budget review)</li>
              <li>Lower the minimum relevance threshold</li>
              <li>Expand the date range filter</li>
            </ul>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Loader2 className="mx-auto h-8 w-8 text-blue-600 animate-spin mb-4" />
          <p className="text-sm text-gray-600">Searching across meetings...</p>
        </div>
      )}
    </div>
  );
}