import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login, currentUser } = useAuth();
    const navigate = useNavigate();
    const [loginType, setLoginType] = useState('institucional'); // 'institucional' or 'familia'

    useEffect(() => {
        if (currentUser) {
            if (currentUser.mustChangePassword) {
                navigate('/force-password-change');
            } else {
                navigate('/panel');
            }
        }
    }, [currentUser, navigate]);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        let finalEmail = email.trim();

        if (loginType === 'familia') {
            const cleanDni = finalEmail.replace(/[\.\s-]/g, '');
            if (!/^\d+$/.test(cleanDni)) {
                setError('Para el acceso de familias, ingrese solo números (DNI).');
                setLoading(false);
                return;
            }
            finalEmail = `${cleanDni}@familia.com`;
        } else {
            if (!finalEmail.includes('@')) {
                setError('Debe ingresar un correo electrónico válido.');
                setLoading(false);
                return;
            }
        }

        try {
            // ── Step 1: Authenticate with Firebase Auth ──────────────
            let userCredential;
            try {
                userCredential = await login(finalEmail, password);
            } catch (authErr) {
                const code = authErr.code || '';
                if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                    setError('Correo o contraseña incorrectos. Verificá tus datos.');
                } else if (code === 'auth/too-many-requests') {
                    setError('Demasiados intentos fallidos. Esperá unos minutos o restablecé tu contraseña.');
                } else if (code === 'auth/network-request-failed') {
                    setError('Sin conexión a Internet. Verificá tu red.');
                } else {
                    setError('Error al iniciar sesión: ' + (authErr.message || code));
                }
                setLoading(false);
                return;
            }

            const user = userCredential.user;

            // ── Step 2: Read profile + config (now authenticated) ────
            const [docSnap, configSnap] = await Promise.all([
                getDoc(doc(db, 'docentes', user.uid)),
                getDoc(doc(db, 'config', 'appSettings')),
            ]);

            const allowFamily = configSnap.exists() ? configSnap.data().allowFamilyAccess : true;

            let roles = ['familia'];
            if (docSnap.exists()) {
                const data = docSnap.data();
                roles = data.roles || (data.role ? [data.role] : ['familia']);
            }

            const isStaff = roles.some(r =>
                ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r)
            );

            if (!allowFamily && !isStaff) {
                await signOut(auth);
                setError('El acceso para Familias está deshabilitado. Solo Personal Institucional puede ingresar.');
                setLoading(false);
                return;
            }

            const mustChange = docSnap.exists() ? docSnap.data().mustChangePassword : false;
            navigate(mustChange ? '/force-password-change' : '/panel');

        } catch (err) {
            console.error('Login error:', err);
            setError('Error inesperado. Intentá nuevamente.');
        }
        setLoading(false);
    }


    return (
        <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#ffffff' }}>
            {/* Left side: Image + Cards (Desktop only) */}
            <div className="login-hero" style={{
                flex: 1,
                position: 'relative',
                backgroundImage: 'url("https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                padding: '3rem'
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent, rgba(0,0,0,0.2))' }}></div>


            </div>

            {/* Right side: Login Form */}
            <div className="login-form-container" style={{
                flex: '0 0 480px',
                padding: '2rem 3rem',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                position: 'relative',
                justifyContent: 'center'
            }}>
                {/* Help Button top right */}
                <div style={{ position: 'absolute', top: '2rem', right: '2rem' }}>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: '500' }}>
                        Ayuda <span style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'var(--color-primary)' }}>?</span>
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '2.5rem', marginTop: '-2rem' }}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <img
                            src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg"
                            alt="Logo Escuela Primaria 6"
                            style={{ width: '90px', height: '90px', borderRadius: '50%', objectFit: 'contain', border: '3px solid var(--color-primary)', padding: '4px', backgroundColor: 'white' }}
                        />
                    </div>
                    <h2 style={{ color: 'var(--color-primary)', fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem' }}>
                        ¡Bienvenido! 👋
                    </h2>
                    
                    <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                        <button 
                            type="button"
                            onClick={() => { setLoginType('institucional'); setError(''); }}
                            style={{ 
                                flex: 1, 
                                padding: '0.75rem', 
                                background: 'none', 
                                border: 'none', 
                                borderBottom: loginType === 'institucional' ? '3px solid var(--color-primary)' : 'none',
                                color: loginType === 'institucional' ? 'var(--color-primary)' : '#64748b',
                                fontWeight: loginType === 'institucional' ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Institucional
                        </button>
                        <button 
                            type="button"
                            onClick={() => { setLoginType('familia'); setError(''); }}
                            style={{ 
                                flex: 1, 
                                padding: '0.75rem', 
                                background: 'none', 
                                border: 'none', 
                                borderBottom: loginType === 'familia' ? '3px solid var(--color-primary)' : 'none',
                                color: loginType === 'familia' ? 'var(--color-primary)' : '#64748b',
                                fontWeight: loginType === 'familia' ? '700' : '500',
                                cursor: 'pointer'
                            }}
                        >
                            Familias
                        </button>
                    </div>
                </div>

                {error && <div className="badge badge-error" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '340px', margin: '0 auto' }}>
                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <input
                            id="email"
                            type={loginType === 'familia' ? 'text' : 'email'}
                            className="input-field"
                            placeholder={loginType === 'familia' ? 'DNI del Responsable' : 'Usuario o correo'}
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ padding: '0.85rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                className="input-field"
                                placeholder={loginType === 'familia' ? 'Clave (DNI por defecto)' : 'Clave'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ padding: '0.85rem 1rem', paddingRight: '2.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0', display: 'flex', alignItems: 'center' }}
                                tabIndex={-1}
                                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn w-full"
                        disabled={loading}
                        style={{
                            padding: '0.85rem',
                            borderRadius: '6px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            backgroundColor: '#86a0bc', // Similar to Patagonia button color
                            border: 'none',
                            color: 'white',
                            transition: 'background-color 0.2s',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Ingresando...' : 'Ingresar'}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: '700', textDecoration: 'none' }}>
                            Recuperar mi usuario o clave
                        </Link>
                    </div>
                </form>

                {/* Footer right side */}
                <div style={{ position: 'absolute', bottom: '2rem', left: 0, right: 0, textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
                    <span style={{ fontWeight: '500' }}>Encontranos en nuestras redes</span>
                    <div style={{ display: 'flex', gap: '0.75rem', color: '#64748b' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><path d="M4 4l11.733 16h4.267l-11.733 -16z" /><path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" /></svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ cursor: 'pointer' }}><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                    </div>
                </div>
            </div>

            <style>{`
                @media (max-width: 900px) {
                    .login-hero {
                        display: none !important;
                    }
                    .login-form-container {
                        flex: 1 !important;
                        padding: 2rem !important;
                        justify-content: center !important;
                    }
                }
            `}</style>
        </div>
    );
}
