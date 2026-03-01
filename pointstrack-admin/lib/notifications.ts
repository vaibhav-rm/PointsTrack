import { Expo } from 'expo-server-sdk';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Create a new Expo SDK client
let expo = new Expo();

export async function sendEventNotification(
    title: string,
    body: string,
    eventId: string,
    targetCollege?: string
) {
    try {
        // 1. Fetch all eligible users
        const usersSnapshot = await getDocs(collection(db, 'users'));

        // Extract push tokens for users that match the criteria (e.g. same college)
        let pushTokens: string[] = [];

        usersSnapshot.forEach((doc: any) => {
            const userData = doc.data();

            // If event has a target college, only notify those students. 
            // If no target college (open to all), notify everyone.
            const isEligible = !targetCollege || userData.college === targetCollege;

            if (isEligible && userData.pushToken && Expo.isExpoPushToken(userData.pushToken)) {
                pushTokens.push(userData.pushToken);
            }
        });

        if (pushTokens.length === 0) {
            console.log('No eligible push tokens found.');
            return;
        }

        // 2. Construct the messages
        let messages = [];
        for (let pushToken of pushTokens) {
            messages.push({
                to: pushToken,
                sound: 'default' as const,
                title: title,
                body: body,
                data: { eventId: eventId, type: 'event_update' },
            });
        }

        // 3. Chunk messages to respect Expo's API limits
        let chunks = expo.chunkPushNotifications(messages);
        let tickets = [];

        // 4. Send the chunks to the Expo push notification service
        for (let chunk of chunks) {
            try {
                let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                console.log(ticketChunk);
                tickets.push(...ticketChunk);
            } catch (error) {
                console.error('Error sending chunk:', error);
            }
        }

        return tickets;

    } catch (error) {
        console.error("Failed to send notifications:", error);
        throw error;
    }
}
