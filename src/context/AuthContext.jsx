import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState(null);
    const [needsRolePicker, setNeedsRolePicker] = useState(false);

    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function logout() {
        localStorage.removeItem('activeRole');
        setActiveRole(null);
        setNeedsRolePicker(false);
        return signOut(auth);
    }

    function switchRole(role) {
        if (currentUser && currentUser.roles.includes(role)) {
            setActiveRole(role);
            localStorage.setItem('activeRole', role);
        }
    }

    // Called from the role picker on fresh login
    function confirmRole(role) {
        if (currentUser && currentUser.roles.includes(role)) {
            setActiveRole(role);
            localStorage.setItem('activeRole', role);
            setNeedsRolePicker(false);
        }
    }

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

                    // Record last login timestamp (non-critical)
                    try {
                        await updateDoc(docRef, { lastLogin: new Date().toISOString() });
                    } catch (_) { /* ignore */ }

                    // ── Role selection logic ──────────────────────────────
                    const savedRole = localStorage.getItem('activeRole');
                    if (savedRole && finalRoles.includes(savedRole)) {
                        // Returning user (page refresh): restore saved role
                        setActiveRole(savedRole);
                        setNeedsRolePicker(false);
                    } else if (finalRoles.length > 1) {
                        // Fresh login, multiple roles → show picker
                        setActiveRole(null);
                        setNeedsRolePicker(true);
                    } else {
                        // Single role: auto-select, no picker needed
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
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        activeRole,
        needsRolePicker,
        login,
        resetPassword,
        logout,
        switchRole,
        confirmRole,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
