import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeContent = {
  name: 'analyze_meeting_content',
  description: 'Analyze meeting transcript and extract structured information',
  parameters: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Concise meeting summary (2-3 sentences)'
      },
      keyDecisions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            decision: { type: 'string' },
            impact: { type: 'string' },
            decisionMaker: { type: 'string' }
          }
        }
      },
      actionItems: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            assignee: { type: 'string' },
            dueDate: { type: 'string' },
            priority: { type: 'string', enum: ['High', 'Medium', 'Low'] }
          }
        }
      },
      participants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            role: { type: 'string' }
          }
        }
      },
      topics: {
        type: 'array',
        items: { type: 'string' }
      }
    },
    required: ['summary', 'keyDecisions', 'actionItems', 'participants', 'topics']
  }
};

export async function POST(request: NextRequest) {
  try {
    const { transcript } = await request.json();

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a meeting analysis expert. Analyze the transcript and extract:
          1. Concise summary
          2. Key decisions made
          3. Action items with assignees
          4. Participants and their roles
          5. Main topics discussed
          
          Be precise and factual. If information is unclear, mark as "Unknown".`
        },
        {
          role: 'user',
          content: `Please analyze this meeting transcript:\n\n${transcript}`
        }
      ],
      functions: [analyzeContent],
      function_call: { name: 'analyze_meeting_content' }
    });

    const analysis = JSON.parse(
      completion.choices[0].message.function_call?.arguments || '{}'
    );

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze content' },
      { status: 500 }
    );
  }
}