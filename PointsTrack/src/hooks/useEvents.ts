import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../lib/api';

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
    // The ledger row's owner; mapped from `studentId` so screens can detect
    // whether the current user created the entry.
    userId?: string;
    organizerId?: string | null;
}

// The student's points ledger (GET /points). Realtime listeners are replaced
// with a fetch that re-runs each time the screen regains focus.
const useEvents = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchEvents = useCallback(async () => {
        try {
            const rows = await api.get<any[]>('/points');
            setEvents(rows.map((r) => ({ ...r, userId: r.studentId })));
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [fetchEvents])
    );

    return { events, loading, refetch: fetchEvents };
};

export default useEvents;
