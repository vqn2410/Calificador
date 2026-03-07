import { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
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

    async function login(email, password) {
        return signInWithEmailAndPassword(auth, email, password);
    }

    function logout() {
        return signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch role and extra data from 'docentes' or 'users' collection
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

                    // Admin override
                    if (user.email === 'vergaranicolas209@gmail.com' && !userData.roles.includes('administrador')) {
                        userData.roles.push('administrador');
                    }

                    const finalRoles = Array.isArray(userData.roles) ? userData.roles : [userData.roles];

                    // Check Global Config for Family Access
                    const configRef = doc(db, 'config', 'appSettings');
                    const configSnap = await getDoc(configRef);
                    const allowFamily = configSnap.exists() ? configSnap.data().allowFamilyAccess : true;

                    const isStaff = finalRoles.some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r));

                    if (!allowFamily && !isStaff) {
                        // User is ONLY family and access is restricted
                        await signOut(auth);
                        setCurrentUser(null);
                        setLoading(false);
                        return;
                    }

                    setCurrentUser({
                        uid: user.uid,
                        email: user.email,
                        displayName: userData.displayName || user.displayName || 'Usuario',
                        ...userData,
                        roles: finalRoles
                    });
                } catch (error) {
                    console.error("Error fetching user data", error);
                    setCurrentUser({ uid: user.uid, email: user.email, roles: ['familia'] });
                }
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
