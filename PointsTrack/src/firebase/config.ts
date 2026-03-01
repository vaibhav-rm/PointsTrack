// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAuth, getAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDdT22pcUw865pCncceQJSL_9e_Y6JyNtw",
    authDomain: "points-baec4.firebaseapp.com",
    projectId: "points-baec4",
    storageBucket: "points-baec4.firebasestorage.app",
    messagingSenderId: "637900275414",
    appId: "1:637900275414:web:e1176c805eca2bc9a81377",
    measurementId: "G-6B4CL94SH7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services with ReactNative persistence (except on web)
let __auth;
if (Platform.OS === 'web') {
    __auth = getAuth(app);
} else {
    __auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
}
export const auth = __auth;
export const db = getFirestore(app);
export const storage = getStorage(app);

export let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then(yes => {
    if (yes) {
        analytics = getAnalytics(app);
    }
});

export default app;
