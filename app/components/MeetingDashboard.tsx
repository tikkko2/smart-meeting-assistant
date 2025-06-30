'use client';

import { useState } from 'react';
import { Calendar, Users, CheckSquare, Image, Clock, Search } from 'lucide-react';
import NextImage from 'next/image';
import { Meeting, ActionItem, Decision } from '@/lib/types';

interface MeetingDashboardProps {
  meetings: Meeting[];
}

export default function MeetingDashboard({ meetings }: MeetingDashboardProps) {
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter meetings based on search term
  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    try {
      // Handle both Date objects and date strings
      const dateObj = date instanceof Date ? date : new Date(date);
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dateObj);
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Invalid date';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Meeting Dashboard</h2>
        <div className="flex items-center space-x-2 bg-white rounded-lg border px-3 py-2">
          <Search className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="outline-none text-sm"
          />
        </div>
      </div>

      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {meetings.length === 0 
              ? "Upload your first meeting recording to get started."
              : "Try adjusting your search terms."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Meeting List */}
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
                className={`bg-white rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                  selectedMeeting?.id === meeting.id ? 'border-blue-500 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900 text-lg">{meeting.title}</h3>
                  <span className="text-xs text-gray-500 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(meeting.createdAt)}
                  </span>
                </div>

                {meeting.summary && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {meeting.summary}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    {meeting.participants && meeting.participants.length > 0 && (
                      <span className="flex items-center">
                        <Users className="h-3 w-3 mr-1" />
                        {meeting.participants.length} participants
                      </span>
                    )}
                    {meeting.actionItems && Array.isArray(meeting.actionItems) && (
                      <span className="flex items-center">
                        <CheckSquare className="h-3 w-3 mr-1" />
                        {meeting.actionItems.length} action items
                      </span>
                    )}
                    {meeting.imageUrl && (
                      <span className="flex items-center">
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image className="h-3 w-3 mr-1" />
                        Visual summary
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Meeting Details */}
          <div className="lg:sticky lg:top-6">
            {selectedMeeting ? (
              <div className="bg-white rounded-lg border p-6 space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedMeeting.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(selectedMeeting.createdAt)}
                  </p>
                </div>

                {selectedMeeting.imageUrl && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Visual Summary</h4>
                    <NextImage
                      src={selectedMeeting.imageUrl}
                      alt="Meeting visual summary"
                      className="w-full rounded-lg border"
                      width={600}
                      height={400}
                    />
                  </div>
                )}

                {selectedMeeting.summary && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedMeeting.summary}
                    </p>
                  </div>
                )}

                {selectedMeeting.participants && selectedMeeting.participants.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Participants</h4>
                    <div className="space-y-2">
                      {selectedMeeting.participants.map((participant, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {participant.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{participant.name}</p>
                            {participant.role && (
                              <p className="text-xs text-gray-500">{participant.role}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeeting.actionItems && Array.isArray(selectedMeeting.actionItems) && selectedMeeting.actionItems.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Action Items</h4>
                    <div className="space-y-3">
                      {selectedMeeting.actionItems.map((item: ActionItem, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <CheckSquare className="h-4 w-4 text-gray-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">{item.task}</p>
                              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                                {item.assignee && <span>Assigned to: {item.assignee}</span>}
                                {item.priority && (
                                  <span className={`px-2 py-1 rounded-full ${
                                    item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                    item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>
                                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                                  </span>
                                )}
                                {item.dueDate && <span>Due: {formatDate(item.dueDate)}</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeeting.decisions && Array.isArray(selectedMeeting.decisions) && selectedMeeting.decisions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Key Decisions</h4>
                    <div className="space-y-3">
                      {selectedMeeting.decisions.map((decision: Decision, index: number) => (
                        <div key={index} className="bg-blue-50 rounded-lg p-3">
                          <p className="text-sm font-medium text-gray-900">{decision.decision}</p>
                          <div className="mt-1 text-xs text-gray-600">
                            {decision.owner && <span>Decision maker: {decision.owner}</span>}
                            {decision.impact && (
                              <p className="mt-1">{decision.impact}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedMeeting.transcript && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Full Transcript</h4>
                    <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {selectedMeeting.transcript}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg border p-6 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Meeting</h3>
                <p className="text-sm text-gray-500">
                  Choose a meeting from the list to view detailed information, action items, and transcripts.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}