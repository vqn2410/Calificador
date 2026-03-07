import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeRole, setActiveRole] = useState(null);

    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    async function resetPassword(email) {
        return sendPasswordResetEmail(auth, email);
    }

    function logout() {
        localStorage.removeItem('activeRole');
        setActiveRole(null);
        return signOut(auth);
    }

    function switchRole(role) {
        if (currentUser && currentUser.roles.includes(role)) {
            setActiveRole(role);
            localStorage.setItem('activeRole', role);
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

                    const isStaff = finalRoles.some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r));

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

                    // Initialize activeRole
                    const savedRole = localStorage.getItem('activeRole');
                    if (savedRole && finalRoles.includes(savedRole)) {
                        setActiveRole(savedRole);
                    } else {
                        setActiveRole(finalRoles[0]);
                    }

                } catch (error) {
                    console.error("Error fetching user data", error);
                    setCurrentUser({ uid: user.uid, email: user.email, roles: ['familia'] });
                    setActiveRole('familia');
                }
            } else {
                setCurrentUser(null);
                setActiveRole(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        activeRole,
        login,
        resetPassword,
        logout,
        switchRole
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
