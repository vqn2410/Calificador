import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

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
