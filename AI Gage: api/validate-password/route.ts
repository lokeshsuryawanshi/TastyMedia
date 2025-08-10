import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { password } = await req.json();
  const correct = process.env.CLASS_CREATION_PASSWORD;

  if (password === correct) {
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ success: false }, { status: 401 });
  }
}
