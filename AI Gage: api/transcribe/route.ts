import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile } from 'fs/promises';
import { readFile } from 'fs/promises';
import { unlink } from 'fs/promises';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createReadStream } from 'fs';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Create temp directory if needed
async function ensureTempDir() {
    const tempDir = '/tmp'; // ← writable directory on Vercel 
    // creating a change to push
    if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
    }
    return tempDir;
}

export async function POST(request: Request) {
    let tempFilePath: string | null = null;
    
    try {
        const formData = await request.formData();
        const audioFile = formData.get('audio');
        const mimeType = formData.get('mimeType') as string || 'audio/webm';

        if (!audioFile) {
            console.error("No audio file provided in request");
            return NextResponse.json(
                { error: 'No audio file provided' },
                { status: 400 }
            );
        }

        console.log(`Processing audio of type: ${mimeType}`);
        
        // Convert to buffer
        let audioBuffer;
        if (audioFile instanceof Blob) {
            audioBuffer = Buffer.from(await audioFile.arrayBuffer());
            console.log(`Audio blob size: ${audioFile.size} bytes`);
            
            if (audioFile.size === 0 || audioBuffer.length === 0) {
                console.error("Empty audio file received");
                return NextResponse.json(
                    { error: 'Empty audio file' },
                    { status: 400 }
                );
            }
        } else {
            console.error(`Unexpected audio type: ${typeof audioFile}`);
            return NextResponse.json(
                { error: 'Invalid audio format' },
                { status: 400 }
            );
        }

        // Save to temp file
        const tempDir = await ensureTempDir();
        const extension = mimeType.includes('webm') ? 'webm' : 
                         mimeType.includes('ogg') ? 'ogg' : 'mp3';
                         
        tempFilePath = join(tempDir, `audio-${Date.now()}.${extension}`);
        await writeFile(tempFilePath, audioBuffer);
        console.log(`Saved ${audioBuffer.length} bytes to ${tempFilePath}`);
        
        // Use Node.js stream for API call
        try {
            // Create a readable stream from the file
            const fileStream = createReadStream(tempFilePath);
            
            console.log(`Sending audio file from: ${tempFilePath}`);
            
            // Send to OpenAI
            const transcription = await openai.audio.transcriptions.create({
                model: "whisper-1",
                file: fileStream,
            });
            
            console.log("Transcription successful:", transcription.text.substring(0, 50) + "...");
            return NextResponse.json({ text: transcription.text });
        } catch (openaiError: unknown) {
            console.error("OpenAI API Error:", openaiError);
            let errorMessage = 'Unknown error';
            if (openaiError && typeof openaiError === 'object' && 'message' in openaiError) {
                errorMessage = openaiError.message as string;
            }
            return NextResponse.json(
                { error: `OpenAI API Error: ${errorMessage}` },
                { status: 500 }
            );
        }
    } catch (error: unknown) {
        console.error('General transcription error:', error);
        let errorMessage = 'Unknown error';
        if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = error.message as string;
        }
        return NextResponse.json(
            { error: `Failed to transcribe audio: ${errorMessage}` },
            { status: 500 }
        );
    } finally {
        // Clean up temp file
        if (tempFilePath) {
            try {
                await unlink(tempFilePath);
                console.log(`Deleted temporary file: ${tempFilePath}`);
            } catch (err) {
                console.error('Error deleting temporary file:', err);
            }
        }
    }
}