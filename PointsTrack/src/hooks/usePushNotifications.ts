import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { api, type AuthUser } from '../lib/api';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export function usePushNotifications(user: AuthUser | null) {
    const [expoPushToken, setExpoPushToken] = useState('');
    const [notification, setNotification] = useState<Notifications.Notification | false>(false);
    const notificationListener = useRef<Notifications.EventSubscription | undefined>(undefined);
    const responseListener = useRef<Notifications.EventSubscription | undefined>(undefined);

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token ?? ''));

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log(response);
        });

        return () => {
            notificationListener.current?.remove();
            responseListener.current?.remove();
        };
    }, []);

    useEffect(() => {
        if (user?.id && expoPushToken) {
            // Save the push token against the student's profile via the API.
            const updatePushToken = async () => {
                try {
                    await api.put('/profile/student/push-token', { pushToken: expoPushToken });
                    console.log("Push token synced successfully");
                } catch (error) {
                    console.error("Failed to sync push token", error);
                }
            };
            updatePushToken();
        }
    }, [user, expoPushToken]);

    return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }
        // Set project ID required for Expo go
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: '298db394-ff52-47ef-ad0a-8bfed774b789'
        })).data;
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}
