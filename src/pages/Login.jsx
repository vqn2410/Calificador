import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, LogIn } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setError('');
            setLoading(true);
            const loginEmail = email.includes('@') ? email : `${email}@familia.com`;
            await login(loginEmail, password);
            navigate('/');
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(4,75,127,0.1)', marginBottom: '1rem' }}>
                        <GraduationCap size={32} color="var(--color-primary)" />
                    </div>
                    <h2 style={{ color: 'var(--color-primary)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Calificador Digital</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Portal Docente y Acceso Familiar</p>
                </div>

                {error && <div className="badge badge-error" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">Usuario (Email) o DNI (Familias)</label>
                        <input
                            id="email"
                            type="text"
                            className="input-field"
                            placeholder="docente@abc.gob.ar o DNI"
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
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    <p>¿Problemas para ingresar? Contacte al administrador institucional.</p>
                </div>
            </div>
        </div>
    );
}
