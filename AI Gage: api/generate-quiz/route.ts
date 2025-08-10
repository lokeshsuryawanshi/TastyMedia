// route.ts
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

    const prompt = `Based on the following lecture transcript, generate 5 easy-to-medium multiple-choice questions (MCQs) adhering to Bloom's Taxonomy (focus on Remembering, Understanding, Applying, and Analyzing). Follow these rules:
1. Label each question with its Bloom's level in parentheses.
2. Include 4 options (A-D) with one correct answer and 3 plausible distractors.
3. Ensure questions are concise and answerable within 60 seconds.
4. Format EXACTLY as follows (do not include any additional text or formatting):

Question 1 (Bloom's Level): [Question text]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct Answer: [Letter]

Question 2 (Bloom's Level): [Question text]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Correct Answer: [Letter]

[Continue for all 5 questions]

Transcript: "${transcript}"`;

    const response = await openai.chat.completions.create({
      model: 'deepseek/deepseek-r1:free',
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse the response to extract questions and answers
    const rawResult = response.choices[0].message.content || '';
    const questions = parseQuizResponse(rawResult);
    console.log(rawResult);
    console.log("---------")
    console.log(questions);
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Quiz generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate quiz' },
      { status: 500 }
    );
  }
}

// Helper function to parse the formatted response into structured data
function parseQuizResponse(rawText: string): Array<{
  question: string;
  options: string[];
  correctAnswer: number;
}> {
  const bloomLevels: Record<string, number> = {
    remembering: 1,
    understanding: 2,
    applying: 3,
    analysing: 4,
    analyzing: 4,
    evaluating: 5,
    creating: 6,
  };

  const questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
  }> = [];

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  let currentQuestion: {
    question: string;
    options: string[];
    correctAnswer: number;
  } | null = null;

  for (const line of lines) {
    const questionMatch = line.match(
      /^Question \d+ \((?:Bloom'?s?\s*)?(?:Level\s*:?)?\s*(.*?)\):\s*(.+)/i
    );

    if (questionMatch) {
      if (currentQuestion?.options.length === 4) {
        questions.push(currentQuestion);
      }

      const levelRaw = questionMatch[1].toLowerCase().trim();
      const levelName = levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1);
      const levelNum = bloomLevels[levelRaw] || '?';

      currentQuestion = {
        question: `${questionMatch[2].trim()} (${levelName} - BL - ${levelNum})`,
        options: [],
        correctAnswer: -1
      };
    } else if (/^[A-D][.)\-\s]/i.test(line)) {
      const optionText = line.replace(/^[A-D][.)\-\s]+/i, '').trim();
      currentQuestion?.options.push(optionText);
    } else if (/^Correct Answer:/i.test(line)) {
      const answer = line.split(':')[1].trim().toUpperCase();
      if (currentQuestion) {
        currentQuestion.correctAnswer = Math.max('ABCD'.indexOf(answer[0]), 0);
      }
    }
  }

  if (currentQuestion?.options.length === 4) {
    questions.push(currentQuestion);
  }

  return questions.filter(q =>
    q.question &&
    q.options.length === 4 &&
    q.correctAnswer >= 0 &&
    q.correctAnswer <= 3
  );
}
