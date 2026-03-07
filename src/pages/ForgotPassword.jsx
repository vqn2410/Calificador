import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setMessage('');
            setError('');
            setLoading(true);
            await resetPassword(email);
            setMessage('Se ha enviado un correo electrónico con instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada (revise la carpeta de spam).');
        } catch (err) {
            console.error(err);
            setError('No se pudo enviar el correo de recuperación. Verifique que el correo ingresado sea correcto o contacte al administrador.');
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
                    <h2 style={{ color: 'var(--color-primary)', fontSize: '1.75rem', marginBottom: '0.5rem' }}>Recuperar Acceso</h2>
                    <p style={{ color: 'var(--color-text-muted)' }}>Calificador Digital EP 6</p>
                </div>

                {error && <div className="badge badge-error" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem' }}>{error}</div>}
                {message && <div className="badge badge-success" style={{ display: 'block', textAlign: 'center', marginBottom: '1.5rem', padding: '0.75rem' }}>{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label" htmlFor="email">Correo Electrónico Registrado</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                id="email"
                                type="email"
                                className="input-field"
                                placeholder="tu-email@abc.gob.ar"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                            <Mail size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-4"
                        disabled={loading}
                    >
                        {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>
                        <ArrowLeft size={16} />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
}
