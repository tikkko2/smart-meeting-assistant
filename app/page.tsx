'use client';

import { useState, useEffect, useCallback } from 'react';
import AudioUploader from './components/AudioUploader';
import MeetingDashboard from './components/MeetingDashboard';
import SearchInterface from './components/SearchInterface';
import LiveTranscription from './components/LiveTranscription';
import { Upload, BarChart3, Search, Settings, Mic, Users, Clock, Radio } from 'lucide-react';
import { Meeting, ActionItem } from '@/lib/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState('upload');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [stats, setStats] = useState({
    totalMeetings: 0,
    totalActionItems: 0,
    totalParticipants: 0,
    avgMeetingDuration: '0:00'
  });

  // Calculate stats function
  const calculateStats = useCallback(() => {
    const totalMeetings = meetings.length;
    const totalActionItems = meetings.reduce((sum, meeting) => 
      sum + (meeting.actionItems?.length || 0), 0
    );
    const totalParticipants = meetings.reduce((sum, meeting) => 
      sum + (meeting.participants?.length || 0), 0
    );
    
    setStats({
      totalMeetings,
      totalActionItems,
      totalParticipants,
      avgMeetingDuration: '0:00' // You can calculate this based on audio duration if available
    });
  }, [meetings]);

  // Load meetings from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMeetings = localStorage.getItem('meetings');
      if (savedMeetings) {
        try {
          const parsedMeetings = JSON.parse(savedMeetings);
          // Convert date strings back to Date objects with error handling
          const meetingsWithDates = parsedMeetings.map((meeting: Meeting) => ({
            ...meeting,
            createdAt: meeting.createdAt ? new Date(meeting.createdAt) : new Date(),
            actionItems: meeting.actionItems?.map((item: ActionItem) => ({
              ...item,
              dueDate: item.dueDate ? new Date(item.dueDate) : undefined
            }))
          }));
          setMeetings(meetingsWithDates);
        } catch (error) {
          console.error('Error loading meetings from localStorage:', error);
          // If there's an error, start with empty meetings array
          setMeetings([]);
        }
      }
    }
  }, []);

  // Save meetings to localStorage whenever meetings change
  useEffect(() => {
    if (typeof window !== 'undefined' && meetings.length > 0) {
      localStorage.setItem('meetings', JSON.stringify(meetings));
    }
    calculateStats();
  }, [meetings, calculateStats]);

  const handleMeetingProcessed = (meeting: Meeting) => {
    setMeetings(prev => [meeting, ...prev]);
    setActiveTab('dashboard');
    
    // Show success notification
    if (typeof window !== 'undefined') {
      // You could add a toast notification here
      console.log('Meeting processed successfully:', meeting.title);
    }
  };

  const tabs = [
    {
      id: 'upload',
      name: 'Upload',
      icon: Upload,
      description: 'Upload new meeting recordings'
    },
    {
      id: 'live',
      name: 'Live',
      icon: Radio,
      description: 'Real-time meeting transcription'
    },
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'View and manage meetings'
    },
    {
      id: 'search',
      name: 'Search',
      icon: Search,
      description: 'Search across all meetings'
    }
  ];

  const StatCard = ({ icon: Icon, title, value, description }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    description: string;
  }) => (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <div className="ml-4 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-bold text-gray-900">{value}</dd>
            <dd className="text-xs text-gray-600">{description}</dd>
          </dl>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Mic className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Smart Meeting Assistant
                </h1>
                <p className="text-xs text-gray-500">
                  AI-powered meeting analysis and insights
                </p>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={tab.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                    
                    {/* Active indicator */}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Stats Bar */}
      {meetings.length > 0 && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={BarChart3}
                title="Total Meetings"
                value={stats.totalMeetings}
                description="Processed recordings"
              />
              <StatCard
                icon={Clock}
                title="Action Items"
                value={stats.totalActionItems}
                description="Items to follow up"
              />
              <StatCard
                icon={Users}
                title="Participants"
                value={stats.totalParticipants}
                description="Unique speakers"
              />
              <StatCard
                icon={Mic}
                title="Avg Duration"
                value={stats.avgMeetingDuration}
                description="Per meeting"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Upload Meeting Recording
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Transform your meeting recordings into actionable insights with AI-powered 
                  transcription, analysis, and visual summaries.
                </p>
              </div>
              
              <AudioUploader onMeetingProcessed={handleMeetingProcessed} />
              
              {/* Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
                <div className="text-center p-6 bg-white rounded-lg border">
                  <Mic className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Audio Transcription</h3>
                  <p className="text-sm text-gray-600">
                    Convert speech to text with speaker identification
                  </p>
                </div>
                
                <div className="text-center p-6 bg-white rounded-lg border">
                  <BarChart3 className="h-8 w-8 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Content Analysis</h3>
                  <p className="text-sm text-gray-600">
                    Extract action items, decisions, and key topics
                  </p>
                </div>
                
                <div className="text-center p-6 bg-white rounded-lg border">
                  <Search className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Semantic Search</h3>
                  <p className="text-sm text-gray-600">
                    Find information across all your meetings
                  </p>
                </div>
                
                <div className="text-center p-6 bg-white rounded-lg border">
                  <Settings className="h-8 w-8 text-orange-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Visual Reports</h3>
                  <p className="text-sm text-gray-600">
                    Generate infographics and summaries
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'live' && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Live Meeting Transcription
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Start a live transcription session with real-time speech-to-text conversion 
                  and instant meeting insights.
                </p>
              </div>
              
              <LiveTranscription onMeetingCreated={handleMeetingProcessed} />
            </div>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Meeting Dashboard</h2>
                  <p className="text-gray-600 mt-1">
                    View and manage your processed meetings
                  </p>
                </div>
                {meetings.length > 0 && (
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New Meeting
                  </button>
                )}
              </div>
              
              <MeetingDashboard meetings={meetings} />
            </div>
          )}
          
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Search Meetings</h2>
                <p className="text-gray-600 mt-1">
                  Find information across all your meetings using AI-powered semantic search
                </p>
              </div>
              
              <SearchInterface meetings={meetings} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>Smart Meeting Assistant - Built with OpenAI APIs</p>
            <p className="mt-1">
              Powered by Whisper, GPT-4, Embeddings, and DALL-E 3
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}