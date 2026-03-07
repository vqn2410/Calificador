import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState(null);
    const [needsRolePicker, setNeedsRolePicker] = useState(false);
    const [isLocked, setIsLocked] = useState(false);

    const inactivityTimer = useRef(null);

    /* ── Inactivity tracking ────────────────────────────────── */
    function resetInactivityTimer() {
        if (!currentUser) return;
        localStorage.setItem('lastActivity', Date.now().toString());
        clearTimeout(inactivityTimer.current);
        inactivityTimer.current = setTimeout(() => {
            setIsLocked(true);
        }, INACTIVITY_LIMIT_MS);
    }

    function lockSession() {
        setIsLocked(true);
    }

    function unlockSession() {
        setIsLocked(false);
        resetInactivityTimer();
    }

    // Attach activity listeners while logged in
    useEffect(() => {
        if (!currentUser) return;

        const events = ['mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
        const handler = () => resetInactivityTimer();
        events.forEach(e => window.addEventListener(e, handler, { passive: true }));

        // Check on focus (tab switch back)
        const onFocus = () => {
            const last = parseInt(localStorage.getItem('lastActivity') || '0');
            if (Date.now() - last > INACTIVITY_LIMIT_MS) {
                setIsLocked(true);
            }
        };
        window.addEventListener('focus', onFocus);

        // Visibility change: lock immediately if biometric enabled, else check inactivity
        const onVisible = () => {
            const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';
            if (document.visibilityState === 'hidden') {
                // App going to background
                if (biometricEnabled) {
                    // Lock immediately so biometric is required on return
                    setIsLocked(true);
                }
            } else {
                // App returning to foreground
                const last = parseInt(localStorage.getItem('lastActivity') || '0');
                if (last && Date.now() - last > INACTIVITY_LIMIT_MS) {
                    setIsLocked(true);
                }
            }
        };
        document.addEventListener('visibilitychange', onVisible);

        resetInactivityTimer();

        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            window.removeEventListener('focus', onFocus);
            document.removeEventListener('visibilitychange', onVisible);
            clearTimeout(inactivityTimer.current);
        };
    }, [currentUser]);

    /* ── Auth functions ─────────────────────────────────────── */
    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function logout() {
        localStorage.removeItem('activeRole');
        localStorage.removeItem('lastActivity');
        clearTimeout(inactivityTimer.current);
        setActiveRole(null);
        setNeedsRolePicker(false);
        setIsLocked(false);
        return signOut(auth);
    }

    function switchRole(role) {
        if (currentUser && currentUser.roles.includes(role)) {
            setActiveRole(role);
            localStorage.setItem('activeRole', role);
        }
    }

    function confirmRole(role) {
        if (currentUser && currentUser.roles.includes(role)) {
            setActiveRole(role);
            localStorage.setItem('activeRole', role);
            setNeedsRolePicker(false);
            resetInactivityTimer();
        }
    }

    /* ── Auth state listener ────────────────────────────────── */
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, 'docentes', user.uid);
                    const docSnap = await getDoc(docRef);

                    let userData = { roles: ['familia'] };
                    if (docSnap.exists()) {
                        userData = docSnap.data();
                        if (userData.role && !userData.roles) {
                            userData.roles = [userData.role];
                        }
                    }
                    if (!userData.roles) userData.roles = ['familia'];

                    if (user.email === 'vergaranicolas209@gmail.com' && !userData.roles.includes('administrador')) {
                        userData.roles.push('administrador');
                    }

                    const finalRoles = Array.isArray(userData.roles) ? userData.roles : [userData.roles];

                    const configRef = doc(db, 'config', 'appSettings');
                    const configSnap = await getDoc(configRef);
                    const allowFamily = configSnap.exists() ? configSnap.data().allowFamilyAccess : true;

                    const isStaff = finalRoles.some(r =>
                        ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r)
                    );

                    if (!allowFamily && !isStaff) {
                        await signOut(auth);
                        setCurrentUser(null);
                        setLoading(false);
                        return;
                    }

                    const userObj = {
                        uid: user.uid,
                        email: user.email,
                        displayName: userData.displayName || user.displayName || 'Usuario',
                        ...userData,
                        roles: finalRoles
                    };

                    setCurrentUser(userObj);

                    try {
                        await updateDoc(docRef, { lastLogin: new Date().toISOString() });
                    } catch (_) { /* ignore */ }

                    // Check if session was locked due to inactivity on a previous page load
                    const lastActivity = parseInt(localStorage.getItem('lastActivity') || '0');
                    const wasInactive = lastActivity && (Date.now() - lastActivity > INACTIVITY_LIMIT_MS);

                    const savedRole = localStorage.getItem('activeRole');
                    if (savedRole && finalRoles.includes(savedRole)) {
                        setActiveRole(savedRole);
                        setNeedsRolePicker(false);
                        if (wasInactive) setIsLocked(true);
                    } else if (finalRoles.length > 1) {
                        setActiveRole(null);
                        setNeedsRolePicker(true);
                    } else {
                        setActiveRole(finalRoles[0]);
                        setNeedsRolePicker(false);
                    }

                } catch (error) {
                    console.error('Error fetching user data', error);
                    setCurrentUser({ uid: user.uid, email: user.email, roles: ['familia'] });
                    setActiveRole('familia');
                    setNeedsRolePicker(false);
                }
            } else {
                setCurrentUser(null);
                setActiveRole(null);
                setNeedsRolePicker(false);
                setIsLocked(false);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        activeRole,
        needsRolePicker,
        isLocked,
        login,
        resetPassword,
        logout,
        switchRole,
        confirmRole,
        lockSession,
        unlockSession,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
