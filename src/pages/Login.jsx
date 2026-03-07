import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { LogIn } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (currentUser) {
            if (currentUser.mustChangePassword) {
                navigate('/force-password-change');
            } else {
                navigate('/');
            }
        }
    }, [currentUser, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);

            // 1. Check App Settings
            const configRef = doc(db, 'config', 'appSettings');
            const configSnap = await getDoc(configRef);
            const allowFamily = configSnap.exists() ? configSnap.data().allowFamilyAccess : true;

            let finalEmail = email.trim();

            if (!finalEmail.includes('@')) {
                setError('Debe ingresar un correo electrónico válido.');
                setLoading(false);
                return;
            }

            if (!allowFamily && finalEmail.endsWith('@familia.com')) {
                setError('El acceso para Familias está temporalmente deshabilitado por el administrador.');
                setLoading(false);
                return;
            }

            const userCredential = await login(finalEmail, password);
            const user = userCredential.user;

            // 2. Double check role after login in case they aren't @familia but only have family role
            // AuthContext will sign them out, but we want to show a message here
            const docRef = doc(db, 'docentes', user.uid);
            const docSnap = await getDoc(docRef);
            let roles = ['familia'];
            if (docSnap.exists()) {
                roles = docSnap.data().roles || (docSnap.data().role ? [docSnap.data().role] : ['familia']);
            }

            const isStaff = roles.some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r));

            if (!allowFamily && !isStaff) {
                await signOut(auth);
                setError('El acceso para Familias está deshabilitado. Solo Personal Institucional puede ingresar.');
                setLoading(false);
                return;
            }

            const mustChange = docSnap.exists() ? docSnap.data().mustChangePassword : false;

            if (mustChange) {
                navigate('/force-password-change');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError('Error al iniciar sesión. Verifique sus credenciales.');
            console.error(err);
        }
        setLoading(false);
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-primary)' }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', padding: '2rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <img
                            src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg"
                            alt="Logo Escuela Primaria 6"
                            style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'contain', border: '3px solid var(--color-primary)', padding: '4px', backgroundColor: 'white' }}
                        />
                    </div>
                    <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.5rem', lineHeight: '1.3' }}>
                        Bienvenidos al <br /> Calificador Digital
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', fontWeight: '600' }}>
                        EP N° 6 "Rafael Obligado"
                    </p>
                </div>

                {error && <div className="badge badge-error" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">Usuario (Correo Electrónico)</label>
                        <input
                            id="email"
                            type="email"
                            className="input-field"
                            placeholder="ejemplo@abc.gob.ar"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label" htmlFor="password">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            className="input-field"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-4"
                        disabled={loading}
                    >
                        {loading ? 'Ingresando...' : (
                            <>
                                <LogIn size={20} />
                                <span>Ingresar al Sistema</span>
                            </>
                        )}
                    </button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </div>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    <p>¿Problemas para ingresar? Contacte al administrador institucional.</p>
                </div>
            </div>
        </div>
    );
}
