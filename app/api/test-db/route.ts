import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test database connection
    const meetings = await prisma.meeting.findMany();
    return NextResponse.json({ 
      message: 'Database connected successfully!', 
      meetingCount: meetings.length 
    });
  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { error: 'Database connection failed' }, 
      { status: 500 }
    );
  }
}