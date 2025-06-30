export interface Participant {
  id: string;
  name: string;
  role?: string;
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: Date | string;
  completed?: boolean;
}

export interface Decision {
  id: string;
  decision: string;
  rationale?: string;
  impact?: string;
  owner?: string;
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  confidence: number;
  isPartial?: boolean;
}

export interface AnalysisResult {
  summary: string;
  actionItems: ActionItem[];
  keyDecisions: Decision[];
  participants: Participant[];
  topics?: string[];
  sentiment?: string;
}

export interface Meeting {
  id: string;
  title: string;
  transcript?: string;
  summary?: string;
  actionItems?: ActionItem[];
  decisions?: Decision[];
  audioUrl?: string;
  imageUrl?: string;
  createdAt: Date | string;
  participants?: Participant[];
  analysis?: AnalysisResult;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: {
    title?: string;
    type?: string;
    timestamp?: string;
    [key: string]: string | number | boolean | undefined;
  };
}

export interface AnalysisResult {
  summary: string;
  actionItems: ActionItem[];
  keyDecisions: Decision[];
  participants: Participant[];
  topics?: string[];
  sentiment?: string;
}
