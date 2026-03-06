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
                        const data = docSnap.data();
                        userData = data;
                        // Transformar el viejo "role" string a "roles" array si fuera necesario
                        if (data.role && !data.roles) {
                            userData.roles = [data.role];
                            if (data.role === 'docente_curso') userData.roles.push('docente');
                        }
                        if (!userData.roles) userData.roles = ['familia'];
                    }

                    // Forzar rol de administrador para el usuario indicado
                    if (user.email === 'vergaranicolas209@gmail.com') {
                        if (!userData.roles) userData.roles = [];
                        if (!userData.roles.includes('administrador')) userData.roles.push('administrador');
                        if (!userData.displayName) {
                            userData.displayName = 'Administrador General';
                        }
                    }

                    setCurrentUser({ ...user, ...userData });
                } catch (error) {
                    console.error("Error fetching user data", error);
                    setCurrentUser(user);
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
