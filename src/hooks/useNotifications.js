/**
 * useNotifications
 *
 * Escucha la colección "mensajes" en tiempo real.
 * Cuando llega un mensaje nuevo (mientras la app está abierta o en segundo
 * plano con el service worker activo), dispara una Browser Notification
 * nativa y muestra un banner in-app.
 *
 * SIN necesidad de Cloud Functions para el canal Firestore → Browser Notification.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, messaging, VAPID_KEY } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

const LOGO = 'https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg';

export function useNotifications() {
    const { currentUser, activeRole } = useAuth();
    const initializedRef = useRef(false);
    const latestTsRef = useRef(0);
    const [banner, setBanner] = useState(null); // { id, titulo, cuerpo }

    const uid = currentUser?.uid;

    // ── Register service worker + get FCM token once ─────────
    useEffect(() => {
        if (!uid || !messaging) return;
        const stored = localStorage.getItem('notificationsEnabled');
        if (stored !== 'true') return;

        (async () => {
            try {
                const reg = await navigator.serviceWorker.register(
                    '/firebase-messaging-sw.js',
                    { scope: '/' }
                );
                await navigator.serviceWorker.ready;
                const token = await getToken(messaging, {
                    vapidKey: VAPID_KEY,
                    serviceWorkerRegistration: reg,
                });
                if (token) {
                    // Save or refresh FCM token in Firestore
                    const saved = localStorage.getItem('fcmToken');
                    if (saved !== token) {
                        await updateDoc(doc(db, 'docentes', uid), { fcmToken: token });
                        localStorage.setItem('fcmToken', token);
                    }
                }
            } catch (e) {
                console.warn('FCM registration error:', e.message);
            }
        })();
    }, [uid]);

    // ── FCM foreground message handler ───────────────────────
    // (fires when Cloud Functions ARE deployed and app is in foreground)
    useEffect(() => {
        if (!messaging) return;
        const unsub = onMessage(messaging, (payload) => {
            const { title, body } = payload.notification || {};
            showBrowserNotification(title, body, payload.data?.mensajeId);
        });
        return unsub;
    }, []);

    // ── Firestore real-time → Browser Notification (works WITHOUT Blaze) ──
    useEffect(() => {
        if (!uid) return;
        if (Notification.permission !== 'granted') return;

        const q = query(collection(db, 'mensajes'), orderBy('fechaEnvio', 'desc'));

        const unsub = onSnapshot(q, (snap) => {
            if (!initializedRef.current) {
                // Prime: mark current newest as "seen", don't notify
                const newest = snap.docs.find(d => d.data().estado !== 'programado');
                if (newest) {
                    const ts = newest.data().fechaEnvio?.toMillis?.() || Date.now();
                    latestTsRef.current = ts;
                }
                initializedRef.current = true;
                return;
            }

            snap.docs.forEach((d) => {
                const msg = d.data();
                if (msg.estado === 'programado' || msg.estado === 'cancelado') return;
                if (!msg.fechaEnvio) return;

                const ts = msg.fechaEnvio.toMillis?.() || 0;
                if (ts <= latestTsRef.current) return;

                // Check visibility for this user's role
                const visible = activeRole === 'familia'
                    ? msg.audiencia === 'familias' || msg.audiencia === 'todos' || msg.audiencia === `usuario:${uid}`
                    : true;

                const isUnread = !(msg.leido?.[uid]);

                if (visible && isUnread) {
                    // Show native browser notification
                    showBrowserNotification(msg.titulo, msg.cuerpo, d.id);
                    // Show in-app banner
                    setBanner({ id: d.id, titulo: msg.titulo, cuerpo: msg.cuerpo });
                    latestTsRef.current = Math.max(latestTsRef.current, ts);
                }
            });
        });

        return () => unsub();
    }, [uid, activeRole]);

    function showBrowserNotification(title, body, tag) {
        if (Notification.permission !== 'granted') return;
        try {
            const n = new Notification(title || 'EP N°6', {
                body: body ? (body.length > 100 ? body.slice(0, 100) + '…' : body) : '',
                icon: LOGO,
                badge: LOGO,
                tag: tag || 'ep6-msg',
                requireInteraction: false,
            });
            n.addEventListener('click', () => {
                window.focus();
                window.location.hash = '#/mensajeria';
                n.close();
            });
        } catch (e) {
            console.warn('Notification API error:', e.message);
        }
    }

    const dismissBanner = useCallback(() => setBanner(null), []);

    return { banner, dismissBanner };
}
