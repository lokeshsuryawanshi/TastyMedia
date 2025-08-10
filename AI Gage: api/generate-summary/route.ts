import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY as string,
  defaultHeaders: {
    'HTTP-Referer': process.env.SITE_URL || '',
    'X-Title': process.env.SITE_NAME || '',
  },
});

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json();

    const prompt = `Based on the following lecture transcript, generate a concise summary that captures the key points and main concepts. The summary should be:
1. Well-structured with clear sections
2. Easy to understand for students
3. Include the main topics covered
4. Highlight important concepts and definitions
5. Be approximately 200-300 words

Format the summary with clear headings and bullet points where appropriate.

Transcript: "${transcript}"`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1:free',
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = response.choices[0].message.content || '';
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
} 