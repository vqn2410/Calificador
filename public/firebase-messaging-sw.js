/* ── Firebase Messaging Service Worker ─────────────────────
   Maneja notificaciones push en background (app cerrada/minimizada)
──────────────────────────────────────────────────────────── */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDCFu9StssL0VQctxwd2O70gdGhhgxGB20",
    authDomain: "calificadorep6.firebaseapp.com",
    projectId: "calificadorep6",
    storageBucket: "calificadorep6.firebasestorage.app",
    messagingSenderId: "1098667925276",
    appId: "1:1098667925276:web:3703cc0137674e17b3e4d9",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    const { title, body, icon } = payload.notification || {};
    self.registration.showNotification(title || 'Nueva notificación', {
        body: body || '',
        icon: icon || '/logo192.png',
        badge: '/logo192.png',
        data: payload.data,
        tag: 'ep6-notification',
    });
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(clientList => {
            for (const client of clientList) {
                if (client.url && 'focus' in client) return client.focus();
            }
            if (clients.openWindow) return clients.openWindow('/mensajeria');
        })
    );
});
