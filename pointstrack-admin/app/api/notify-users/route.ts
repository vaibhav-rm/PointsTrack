import { NextResponse } from 'next/server';
import { sendEventNotification } from '@/lib/notifications';

export async function POST(request: Request) {
    try {
        const { title, body, eventId, targetCollege } = await request.json();

        if (!title || !body || !eventId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Call the server-side Expo notification handler
        const tickets = await sendEventNotification(title, body, eventId, targetCollege);

        return NextResponse.json({ success: true, tickets });
    } catch (error) {
        console.error('Error in /api/notify-users route:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
