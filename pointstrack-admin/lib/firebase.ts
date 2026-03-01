import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDdT22pcUw865pCncceQJSL_9e_Y6JyNtw",
    authDomain: "points-baec4.firebaseapp.com",
    projectId: "points-baec4",
    storageBucket: "points-baec4.firebasestorage.app",
    messagingSenderId: "637900275414",
    appId: "1:637900275414:web:e1176c805eca2bc9a81377",
    measurementId: "G-6B4CL94SH7"
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
