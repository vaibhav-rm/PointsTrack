import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export interface Event {
    id: string;
    title: string;
    type: string;
    description: string;
    points: number;
    semester: number;
    date: string;
    certificateUrl?: string;
    createdAt: string;
}

const useEvents = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'events'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventsData: Event[] = [];
            snapshot.forEach((doc) => {
                eventsData.push({ id: doc.id, ...doc.data() } as Event);
            });
            setEvents(eventsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching events:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { events, loading };
};

export default useEvents;
