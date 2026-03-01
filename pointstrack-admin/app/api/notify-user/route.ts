import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request: Request) {
    try {
        const { uid, title, body } = await request.json();

        if (!uid || !title || !body) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch the user's specific Expo Push Token
        const userDocRef = doc(db, 'users', uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ error: 'User does not exist' }, { status: 404 });
        }

        const expoPushToken = userDoc.data()?.expoPushToken;

        if (!expoPushToken) {
            console.log(`User ${uid} has no notification token registered. Skipping push.`);
            return NextResponse.json({ success: true, message: 'No token found, skipped.' });
        }

        // Dispatch token to Expo Server
        const messagePayload = {
            to: expoPushToken,
            sound: 'default',
            title,
            body,
            data: { someData: 'goes here' },
        };

        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload),
        });

        const receipt = await expoResponse.json();

        return NextResponse.json({ success: true, receipt });
    } catch (error) {
        console.error('Error in /api/notify-user route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
