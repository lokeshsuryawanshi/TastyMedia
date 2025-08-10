import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const { action } = await request.json();
        
        if (action === 'start') {
            // Create a new lecture session
            const sessionId = uuidv4();
            const lectureRef = await addDoc(collection(db, 'lectures'), {
                sessionId,
                startTime: new Date().toISOString(),
                status: 'active',
                transcript: '',
                lastUpdated: new Date().toISOString()
            });

            return NextResponse.json({ 
                success: true, 
                sessionId,
                lectureId: lectureRef.id 
            });
        } 
        else if (action === 'stop') {
            const { lectureId } = await request.json();
            const lectureRef = doc(db, 'lectures', lectureId);
            
            await updateDoc(lectureRef, {
                status: 'completed',
                endTime: new Date().toISOString()
            });

            return NextResponse.json({ 
                success: true, 
                message: 'Lecture session stopped' 
            });
        }

        return NextResponse.json({ 
            success: false, 
            message: 'Invalid action' 
        }, { status: 400 });

    } catch (error) {
        console.error('Error handling lecture session:', error);
        return NextResponse.json({ 
            success: false, 
            message: 'Internal server error' 
        }, { status: 500 });
    }
} 