import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { User } from 'firebase/auth';

export interface UserData {
    name: string;
    email: string;
    phone: string;
    college: string;
    usn: string;
    year: number;
    semester: number;
    lateralEntry: boolean;
    requiredPoints: number;
    createdAt: string;
}

const useUserData = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (doc) => {
            if (doc.exists()) {
                setUserData(doc.data() as UserData);
            } else {
                console.log('No such document!');
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching user data:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    return { userData, loading };
};

export default useUserData;
