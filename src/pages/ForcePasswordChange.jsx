import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { Lock, AlertTriangle, CheckCircle, GraduationCap } from 'lucide-react';

export default function ForcePasswordChange() {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Si no está logueado o ya cambió la contraseña
        if (!currentUser) {
            navigate('/login');
        } else if (currentUser.mustChangePassword === false) {
            navigate('/');
        }
    }, [currentUser, navigate]);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            return setError('Las contraseñas no coinciden. Verifique por favor.');
        }

        if (newPassword.length < 6) {
            return setError('La contraseña debe tener al menos 6 caracteres.');
        }

        setLoading(true);
        try {
            // Actualizar contraseña en Firebase Auth usando el current user de Auth
            const userAuth = auth.currentUser;
            if (!userAuth) throw new Error("Sesión caducada o no válida.");

            await updatePassword(userAuth, newPassword);

            // Actualizar el flag en la colección docentes
            const docRef = doc(db, 'docentes', currentUser.uid);
            await updateDoc(docRef, {
                mustChangePassword: false
            });

            setSuccess(true);
            setTimeout(() => {
                // Forzar reload para que tome todo con normalidad y regenere el currentUser.
                window.location.href = '/';
            }, 2000);

        } catch (err) {
            console.error(err);
            if (err.code === 'auth/requires-recent-login') {
                setError('Por seguridad, vuelva a iniciar sesión e intente nuevamente.');
            } else {
                setError('Ocurrió un error al intentar cambiar la contraseña: ' + err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) return null;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-primary)' }}>
            <div className="card fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center' }}>
                <div className="flex justify-center mb-4">
                    <div style={{ backgroundColor: 'var(--color-background)', padding: '1rem', borderRadius: '50%' }}>
                        <GraduationCap size={48} color="var(--color-accent)" />
                    </div>
                </div>

                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Cambio de Contraseña</h1>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                    Por políticas de seguridad, debe cambiar la contraseña generada por la institución en su primer inicio de sesión.
                </p>

                {error && (
                    <div className="badge badge-error mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', fontSize: '0.875rem' }}>
                        <AlertTriangle size={16} />
                        <span style={{ textAlign: 'left' }}>{error}</span>
                    </div>
                )}

                {success ? (
                    <div className="badge badge-success mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem', fontSize: '1rem' }}>
                        <CheckCircle size={20} />
                        Contraseña actualizada con éxito. Ingresando...
                    </div>
                ) : (
                    <form onSubmit={handleChangePassword}>
                        <div className="input-group" style={{ textAlign: 'left' }}>
                            <label className="input-label">Usuario / DNI:</label>
                            <input className="input-field" disabled value={currentUser.email.replace('@familia.com', '')} style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-muted)' }} />
                        </div>

                        <div className="input-group" style={{ textAlign: 'left', position: 'relative' }}>
                            <label className="input-label">Nueva Contraseña</label>
                            <input
                                className="input-field"
                                type="password"
                                required
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                            <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '1rem', top: '2.3rem' }} />
                        </div>

                        <div className="input-group" style={{ textAlign: 'left', position: 'relative' }}>
                            <label className="input-label">Repita la Nueva Contraseña</label>
                            <input
                                className="input-field"
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                style={{ paddingLeft: '2.5rem' }}
                            />
                            <Lock size={18} color="var(--color-text-muted)" style={{ position: 'absolute', left: '1rem', top: '2.3rem' }} />
                        </div>

                        <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading}>
                            {loading ? 'Actualizando credenciales...' : 'Confirmar y Entrar'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
