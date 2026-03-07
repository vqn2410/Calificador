import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export const firebaseConfig = {
    apiKey: "AIzaSyDCFu9StssL0VQctxwd2O70gdGhhgxGB20",
    authDomain: "calificadorep6.firebaseapp.com",
    projectId: "calificadorep6",
    storageBucket: "calificadorep6.firebasestorage.app",
    messagingSenderId: "1098667925276",
    appId: "1:1098667925276:web:3703cc0137674e17b3e4d9",
    measurementId: "G-44DHEBYENB"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let analytics;
if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
}
export { analytics };

// FCM Messaging (only in browser, not in SSR/service worker)
export let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn('FCM not available:', e.message);
    }
}

// VAPID key from Firebase Console → Project Settings → Cloud Messaging
// IMPORTANT: Replace this with your actual VAPID key from Firebase Console
export const VAPID_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDkBWsbqp7T_YfRkflCN_-Y74OTuHxqjG5WGvs7TPUEY';

export async function requestFCMToken() {
    if (!messaging) return null;
    try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        return token || null;
    } catch (err) {
        console.warn('FCM token error:', err.message);
        return null;
    }
}

export { onMessage, messaging as fcmMessaging };
