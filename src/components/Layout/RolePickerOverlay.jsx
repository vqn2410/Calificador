import { useAuth } from '../../context/AuthContext';

const roleLabels = {
    administrador: 'Administrador',
    docente: 'Docente',
    docente_area: 'Docente de Área',
    equipo_conduccion: 'Equipo de Conducción',
    familia: 'Familia',
};

const roleIcons = {
    administrador: '🛡️',
    docente: '📚',
    docente_area: '🎯',
    equipo_conduccion: '🏛️',
    familia: '👨‍👩‍👧',
};

const roleDescriptions = {
    administrador: 'Acceso completo a administración del sistema',
    docente: 'Carga de calificaciones y seguimiento de estudiantes',
    docente_area: 'Gestión de tu materia específica',
    equipo_conduccion: 'Supervisión y reportes institucionales',
    familia: 'Ver el boletín de tus hijos',
};

export default function RolePickerOverlay() {
    const { currentUser, confirmRole } = useAuth();

    const roles = currentUser?.roles || [];
    const nombre = currentUser?.displayName || 'Usuario';
    const cargo = currentUser?.cargo;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'var(--color-background)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            minHeight: '100dvh',
        }}>
            {/* Background decoration */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '40vh',
                background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
                zIndex: 0,
                borderRadius: '0 0 40% 40% / 0 0 60px 60px',
            }} />

            <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
                {/* User avatar + greeting */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: 80, height: 80,
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                        fontSize: '2rem',
                    }}>
                        👤
                    </div>
                    <h2 style={{ color: 'white', margin: 0, fontSize: '1.3rem' }}>¡Hola, {nombre.split(' ')[0]}!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.85)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
                        ¿Con qué perfil deseas ingresar hoy?
                    </p>
                </div>

                {/* Role cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {roles.map(role => {
                        const label = role === 'equipo_conduccion' && cargo
                            ? cargo
                            : (roleLabels[role] || role);
                        const icon = roleIcons[role] || '👤';
                        const desc = roleDescriptions[role] || '';

                        return (
                            <button
                                key={role}
                                onClick={() => confirmRole(role)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem 1.25rem',
                                    backgroundColor: 'white',
                                    border: '2px solid var(--color-border)',
                                    borderRadius: '1rem',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    width: '100%',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(4,75,127,0.15)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                                }}
                            >
                                <div style={{
                                    width: 52, height: 52, flexShrink: 0,
                                    borderRadius: '12px',
                                    backgroundColor: 'var(--color-background)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.6rem',
                                }}>
                                    {icon}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                        {label}
                                    </div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                                        {desc}
                                    </div>
                                </div>
                                <div style={{ color: 'var(--color-primary)', fontSize: '1.2rem' }}>›</div>
                            </button>
                        );
                    })}
                </div>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
                    Podés cambiar de perfil en cualquier momento desde el menú
                </p>
            </div>
        </div>
    );
}
