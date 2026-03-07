import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Lock, Fingerprint, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';

/* ── WebAuthn / Biometric helpers ───────────────────────── */
function b64ToUint8(str) {
    return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
function uint8ToB64(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function checkBiometricAvailable() {
    try {
        return (
            typeof PublicKeyCredential !== 'undefined' &&
            await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        );
    } catch { return false; }
}

async function registerBiometric(userId) {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const cred = await navigator.credentials.create({
        publicKey: {
            challenge,
            rp: { name: 'App Calificaciones', id: window.location.hostname },
            user: {
                id: new TextEncoder().encode(userId),
                name: userId,
                displayName: 'Usuario',
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'required',
            },
            timeout: 60000,
        },
    });
    if (cred) {
        localStorage.setItem(`biometric_cred_${userId}`, uint8ToB64(cred.rawId));
        return true;
    }
    return false;
}

async function verifyBiometric(userId) {
    const storedId = localStorage.getItem(`biometric_cred_${userId}`);
    if (!storedId) return false;
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
        publicKey: {
            challenge,
            allowCredentials: [{ type: 'public-key', id: b64ToUint8(storedId) }],
            userVerification: 'required',
            timeout: 60000,
        },
    });
    return !!assertion;
}

/* ── Component ──────────────────────────────────────────── */
export default function LockScreen() {
    const { currentUser, unlockSession, logout } = useAuth();

    const [mode, setMode] = useState('main'); // 'main' | 'password'
    const [password, setPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [error, setError] = useState('');
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [hasBiometricRegistered, setHasBiometricRegistered] = useState(false);
    const [biometricLoading, setBiometricLoading] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);

    const [autoTriggered, setAutoTriggered] = useState(false);

    const nombre = currentUser?.displayName?.split(' ')[0] || 'Usuario';
    const email = currentUser?.email || '';
    const userId = currentUser?.uid || email;
    const biometricEnabled = localStorage.getItem('biometricEnabled') === 'true';

    useEffect(() => {
        checkBiometricAvailable().then(available => {
            setBiometricAvailable(available);
            const hasReg = !!localStorage.getItem(`biometric_cred_${userId}`);
            setHasBiometricRegistered(hasReg);

            // Auto-trigger biometric if enabled, available and registered
            if (available && hasReg && biometricEnabled && !autoTriggered) {
                setAutoTriggered(true);
                setTimeout(() => handleBiometricAuto(), 400);
            }
        });
    }, [userId]); // eslint-disable-line

    /* ── Auto-trigger (called on mount, silent errors) ──── */
    async function handleBiometricAuto() {
        setBiometricLoading(true);
        try {
            const ok = await verifyBiometric(userId);
            if (ok) { unlockSession(); return; }
            setError('Verificación fallida. Usá tu contraseña o intentá de nuevo.');
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                // User dismissed — show password silently
                setMode('password');
            } else if (err.name === 'InvalidStateError') {
                localStorage.removeItem(`biometric_cred_${userId}`);
                setHasBiometricRegistered(false);
            }
            // Don't show error on auto-trigger — just let them see the screen
        } finally {
            setBiometricLoading(false);
        }
    }

    /* ── Manual biometric unlock ────────────────────────── */
    async function handleBiometric() {
        setError('');
        setBiometricLoading(true);
        try {
            if (!hasBiometricRegistered) {
                // First time: register the biometric
                const registered = await registerBiometric(userId);
                if (registered) {
                    setHasBiometricRegistered(true);
                    unlockSession();
                }
            } else {
                const ok = await verifyBiometric(userId);
                if (ok) {
                    unlockSession();
                } else {
                    setError('No se pudo verificar la biometría.');
                }
            }
        } catch (err) {
            if (err.name === 'NotAllowedError') {
                setError('Verificación cancelada.');
            } else if (err.name === 'InvalidStateError') {
                // Credential not found — re-register
                localStorage.removeItem(`biometric_cred_${userId}`);
                setHasBiometricRegistered(false);
                setError('Biometría no encontrada. Intentá nuevamente para registrarla.');
            } else {
                setError('Error al verificar biometría. Usá tu contraseña.');
            }
        } finally {
            setBiometricLoading(false);
        }
    }

    /* ── Password unlock ────────────────────────────────── */
    async function handlePassword(e) {
        e.preventDefault();
        if (!password) return;
        setError('');
        setPwdLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setPassword('');
            unlockSession();
        } catch {
            setError('Contraseña incorrecta. Intentá nuevamente.');
        } finally {
            setPwdLoading(false);
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #044b7f 0%, #0a2540 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
        }}>
            {/* Lock icon */}
            <div style={{
                width: 80, height: 80, borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '2px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '1.25rem',
                backdropFilter: 'blur(8px)',
            }}>
                <Lock size={38} color="white" />
            </div>

            <h2 style={{ color: 'white', margin: 0, fontSize: '1.4rem' }}>Sesión bloqueada</h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0.5rem 0 2rem', fontSize: '0.9rem', textAlign: 'center' }}>
                Hola, <strong style={{ color: 'white' }}>{nombre}</strong>.
                {biometricLoading
                    ? ' Verificando tu identidad...'
                    : ' Desbloquear para continuar.'}
            </p>

            {/* Pulsing indicator when auto-verifying */}
            {biometricLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: '50%',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        border: '2px solid rgba(255,255,255,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        animation: 'pulse 1.2s ease-in-out infinite',
                    }}>
                        <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.6;transform:scale(0.93)} }`}</style>
                        <Fingerprint size={36} color="white" />
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.88rem' }}>Tocá el sensor o mirá la cámara</p>
                </div>
            )}

            <div style={{ width: '100%', maxWidth: 380 }}>
                {/* ── Main options ── */}
                {mode === 'main' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Biometric button */}
                        {biometricAvailable && (
                            <button
                                onClick={handleBiometric}
                                disabled={biometricLoading}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '1rem',
                                    padding: '1rem 1.25rem',
                                    backgroundColor: biometricLoading ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.15)',
                                    border: '1.5px solid rgba(255,255,255,0.3)',
                                    borderRadius: '1rem', color: 'white',
                                    cursor: biometricLoading ? 'wait' : 'pointer',
                                    backdropFilter: 'blur(8px)',
                                    transition: 'all 0.2s',
                                    width: '100%',
                                }}
                            >
                                <div style={{ width: 44, height: 44, borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Fingerprint size={24} color="white" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                                        {biometricLoading
                                            ? 'Verificando...'
                                            : hasBiometricRegistered
                                                ? 'Desbloquear con huella / Face ID'
                                                : 'Configurar huella / Face ID'
                                        }
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
                                        {hasBiometricRegistered ? 'Autenticación biométrica' : 'Primera vez: registrar en este dispositivo'}
                                    </div>
                                </div>
                            </button>
                        )}

                        {/* Password button */}
                        <button
                            onClick={() => { setMode('password'); setError(''); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '1rem',
                                padding: '1rem 1.25rem',
                                backgroundColor: 'rgba(255,255,255,0.1)',
                                border: '1.5px solid rgba(255,255,255,0.2)',
                                borderRadius: '1rem', color: 'white',
                                cursor: 'pointer', width: '100%',
                                backdropFilter: 'blur(8px)',
                            }}
                        >
                            <div style={{ width: 44, height: 44, borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <ShieldCheck size={22} color="white" />
                            </div>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Ingresar contraseña</div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>{email}</div>
                            </div>
                        </button>

                        {/* Logout */}
                        <button
                            onClick={logout}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.75rem',
                                backgroundColor: 'transparent',
                                border: '1px solid rgba(255,255,255,0.2)',
                                borderRadius: '0.75rem', color: 'rgba(255,255,255,0.6)',
                                cursor: 'pointer', width: '100%', fontSize: '0.85rem',
                                marginTop: '0.25rem',
                            }}
                        >
                            <LogOut size={16} /> Cerrar sesión completamente
                        </button>

                        {error && <p style={{ color: '#fca5a5', textAlign: 'center', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
                    </div>
                )}

                {/* ── Password form ── */}
                {mode === 'password' && (
                    <form onSubmit={handlePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                className="input-field"
                                placeholder="Tu contraseña"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                autoFocus
                                style={{ backgroundColor: 'rgba(255,255,255,0.9)', paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPwd(v => !v)}
                                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: 0 }}>{error}</p>}

                        <button
                            type="submit"
                            disabled={pwdLoading || !password}
                            className="btn btn-primary w-full"
                            style={{ backgroundColor: 'white', color: 'var(--color-primary)' }}
                        >
                            {pwdLoading ? 'Verificando...' : 'Desbloquear'}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setMode('main'); setError(''); setPassword(''); }}
                            style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', textAlign: 'center' }}
                        >
                            ← Volver
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
