import { useState, useEffect } from 'react';
import { Settings, Moon, Sun, Fingerprint, Bell, BellOff, Lock, ChevronRight, ShieldCheck, Smartphone } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { requestFCMToken } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

function ToggleSwitch({ enabled, onToggle, id }) {
    return (
        <button
            id={id}
            onClick={onToggle}
            role="switch"
            aria-checked={enabled}
            style={{
                width: 52, height: 28,
                borderRadius: 14,
                backgroundColor: enabled ? 'var(--color-primary)' : 'var(--color-border)',
                border: 'none', cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.25s ease',
                flexShrink: 0,
            }}
        >
            <span style={{
                position: 'absolute',
                top: 3, left: enabled ? 26 : 3,
                width: 22, height: 22,
                borderRadius: '50%',
                backgroundColor: 'white',
                transition: 'left 0.25s ease',
                boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            }} />
        </button>
    );
}

function SettingRow({ icon, title, description, children }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem 1.25rem',
            borderBottom: '1px solid var(--color-border)',
            gap: '1rem',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    backgroundColor: 'var(--color-background)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-primary)', flexShrink: 0,
                }}>
                    {icon}
                </div>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{title}</div>
                    {description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</div>}
                </div>
            </div>
            <div style={{ flexShrink: 0 }}>{children}</div>
        </div>
    );
}

function SectionCard({ title, children }) {
    return (
        <div className="card" style={{ padding: 0, marginBottom: '1.25rem', overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)' }}>
                    {title}
                </h3>
            </div>
            {children}
        </div>
    );
}

export default function Configuracion() {
    const { darkMode, toggleDarkMode } = useTheme();
    const { currentUser, lockSession } = useAuth();

    const userId = currentUser?.uid;

    // Persisted prefs in localStorage
    const [biometricEnabled, setBiometricEnabled] = useState(() =>
        localStorage.getItem('biometricEnabled') === 'true'
    );
    const [notificationsEnabled, setNotificationsEnabled] = useState(() =>
        localStorage.getItem('notificationsEnabled') === 'true'
    );
    const [biometricSupported, setBiometricSupported] = useState(false);
    const [fcmStatus, setFcmStatus] = useState('idle'); // idle | requesting | granted | denied | error

    useEffect(() => {
        (async () => {
            try {
                if (typeof PublicKeyCredential !== 'undefined') {
                    const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
                    setBiometricSupported(ok);
                }
            } catch { /* ignore */ }

            // Check existing notif permission
            if ('Notification' in window && Notification.permission === 'granted') {
                setFcmStatus('granted');
            } else if ('Notification' in window && Notification.permission === 'denied') {
                setFcmStatus('denied');
            }
        })();
    }, []);

    /* ── Biometric toggle ─────────────────────────────────── */
    async function handleBiometricToggle() {
        const newVal = !biometricEnabled;
        if (newVal) {
            // Register biometric if not already done
            const hasCredential = !!localStorage.getItem(`biometric_cred_${userId}`);
            if (!hasCredential) {
                try {
                    const challenge = crypto.getRandomValues(new Uint8Array(32));
                    const cred = await navigator.credentials.create({
                        publicKey: {
                            challenge,
                            rp: { name: 'App Calificaciones', id: window.location.hostname },
                            user: { id: new TextEncoder().encode(userId), name: currentUser.email, displayName: currentUser.displayName || 'Usuario' },
                            pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
                            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'required' },
                            timeout: 60000,
                        },
                    });
                    if (cred) {
                        const id = btoa(String.fromCharCode(...new Uint8Array(cred.rawId))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
                        localStorage.setItem(`biometric_cred_${userId}`, id);
                    }
                } catch (err) {
                    alert('No se pudo registrar la biometría: ' + err.message);
                    return;
                }
            }
        }
        setBiometricEnabled(newVal);
        localStorage.setItem('biometricEnabled', newVal);
    }

    /* ── Notifications toggle ─────────────────────────────── */
    async function handleNotificationsToggle() {
        if (notificationsEnabled) {
            setNotificationsEnabled(false);
            localStorage.setItem('notificationsEnabled', 'false');
            return;
        }

        setFcmStatus('requesting');
        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                setFcmStatus('denied');
                return;
            }

            const token = await requestFCMToken();
            if (token && userId) {
                // Store FCM token in the user's Firestore doc
                await updateDoc(doc(db, 'docentes', userId), { fcmToken: token });
            }

            setFcmStatus('granted');
            setNotificationsEnabled(true);
            localStorage.setItem('notificationsEnabled', 'true');
        } catch (err) {
            console.error('Notification error:', err);
            setFcmStatus('error');
        }
    }

    const notifLabel = () => {
        if (fcmStatus === 'requesting') return 'Solicitando permiso...';
        if (fcmStatus === 'denied') return 'Bloqueado en el navegador';
        if (fcmStatus === 'error') return 'Error al activar';
        return notificationsEnabled ? 'Activas' : 'Desactivadas';
    };

    return (
        <div className="container" style={{ paddingBottom: '3rem', maxWidth: 640 }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <h1 className="flex items-center gap-2">
                    <Settings color="var(--color-primary)" size={28} />
                    Configuración
                </h1>
                <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Personalizá tu experiencia en la aplicación.</p>
            </div>

            {/* ── Apariencia ── */}
            <SectionCard title="Apariencia">
                <SettingRow
                    icon={darkMode ? <Moon size={20} /> : <Sun size={20} />}
                    title="Modo Oscuro"
                    description="Cambia el tema visual de la aplicación"
                >
                    <ToggleSwitch id="dark-mode-toggle" enabled={darkMode} onToggle={toggleDarkMode} />
                </SettingRow>
            </SectionCard>

            {/* ── Seguridad ── */}
            <SectionCard title="Seguridad y Privacidad">
                {biometricSupported ? (
                    <SettingRow
                        icon={<Fingerprint size={20} />}
                        title="Desbloqueo Biométrico"
                        description="Usá huella digital o Face ID para desbloquear la sesión"
                    >
                        <ToggleSwitch id="biometric-toggle" enabled={biometricEnabled} onToggle={handleBiometricToggle} />
                    </SettingRow>
                ) : (
                    <SettingRow
                        icon={<Smartphone size={20} />}
                        title="Biometría no disponible"
                        description="Tu dispositivo o navegador no soporta autenticación biométrica"
                    >
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No soportado</span>
                    </SettingRow>
                )}

                <SettingRow
                    icon={<Lock size={20} />}
                    title="Bloquear sesión ahora"
                    description="Cierra la pantalla sin cerrar sesión"
                >
                    <button onClick={lockSession} className="btn btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}>
                        Bloquear
                    </button>
                </SettingRow>

                <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={14} />
                    La sesión se bloquea automáticamente luego de 60 minutos de inactividad.
                </div>
            </SectionCard>

            {/* ── Notificaciones ── */}
            <SectionCard title="Notificaciones">
                <SettingRow
                    icon={notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                    title="Notificaciones Push"
                    description={notifLabel()}
                >
                    <ToggleSwitch
                        id="notifications-toggle"
                        enabled={notificationsEnabled}
                        onToggle={handleNotificationsToggle}
                    />
                </SettingRow>
                {fcmStatus === 'denied' && (
                    <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.78rem', color: 'var(--color-error)', backgroundColor: '#fee2e2', margin: '0 1rem 1rem', borderRadius: 8 }}>
                        Las notificaciones están bloqueadas en tu navegador. Habilitálas desde la configuración del sitio (ícono 🔒 en la barra de dirección).
                    </div>
                )}
                <div style={{ padding: '0.75rem 1.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Recibirás notificaciones de mensajes institucionales, avisos de conducción y novedades sobre tus hijos.
                </div>
            </SectionCard>

            {/* ── Cuenta ── */}
            <SectionCard title="Cuenta">
                <SettingRow
                    icon={<ShieldCheck size={20} />}
                    title="Cuenta vinculada"
                    description={currentUser?.email}
                >
                    <ChevronRight size={18} color="var(--color-text-muted)" />
                </SettingRow>
            </SectionCard>
        </div>
    );
}
