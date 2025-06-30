import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Decision, ActionItem } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { summary, keyDecisions, actionItems }: {
      summary: string;
      keyDecisions: Decision[];
      actionItems: ActionItem[];
    } = await request.json();

    // Create a visual prompt based on meeting content
    const visualPrompt = `Create a professional business infographic showing:
    
    Meeting Summary: ${summary}
    
    Key Decisions: ${keyDecisions.map((d) => d.decision).join(', ')}
    
    Action Items: ${actionItems.length} tasks assigned
    
    Style: Clean, modern business infographic with icons, charts, and clear typography. 
    Use a professional color scheme (blues, grays, whites). 
    Include visual elements like checkboxes, arrows, and progress indicators.`;

    const image = await openai.images.generate({
      model: 'dall-e-3',
      prompt: visualPrompt,
      size: '1024x1024',
      quality: 'standard',
      n: 1,
    });

    return NextResponse.json({
      imageUrl: image.data?.[0]?.url || '',
      prompt: visualPrompt
    });

  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate visual' },
      { status: 500 }
    );
  }
}