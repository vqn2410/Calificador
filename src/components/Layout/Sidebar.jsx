import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    LogOut,
    GraduationCap,
    ShieldCheck,
    Eye,
    Map,
    X,
    MessageSquare,
    Settings,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function Sidebar({ isOpen, setIsOpen }) {
    const { currentUser, logout, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    // Track unread messages
    useEffect(() => {
        if (!currentUser?.uid) return;
        const q = query(collection(db, 'mensajes'), orderBy('fechaEnvio', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const uid = currentUser.uid;
            const count = snap.docs
                .map(d => d.data())
                .filter(m => {
                    const visible = activeRole === 'familia'
                        ? m.audiencia === 'familias' || m.audiencia === 'todos'
                        : true;
                    return visible && !(m.leido?.[uid]);
                }).length;
            setUnreadCount(count);
        });
        return () => unsub();
    }, [currentUser?.uid, activeRole]);

    const roleLabels = {
        'administrador': 'Administrador',
        'equipo_conduccion': 'Equipo Conducción',
        'docente': 'Docente Titular',
        'docente_area': 'Docente de Área',
        'familia': 'Familiar'
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión', error);
        }
    };

    const handleLinkClick = () => {
        if (setIsOpen) setIsOpen(false);
    };

    return (
        <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
            {isOpen && (
                <button
                    className="no-print"
                    onClick={() => setIsOpen(false)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'white' }}
                >
                    <X size={24} />
                </button>
            )}
            <div style={{ paddingBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
                <div className="flex items-center gap-2 mb-4">
                    <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela 6" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }} />
                    <h2 style={{ margin: 0, fontSize: '0.9rem' }}>EP N°6 <br />
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>Calificador Digital</span></h2>
                </div>

                {currentUser?.roles?.length > 1 && (
                    <div style={{ 
                        marginTop: '0.5rem', 
                        marginBottom: '1rem'
                    }}>
                        <button
                            onClick={() => {
                                // Toggle between the most likely roles or just trigger a role switch
                                // For better UX, if there are exactly 2 roles, swap them.
                                // If more, we'll keep the list but make the trigger RED.
                                const nextRole = currentUser.roles.find(r => r !== activeRole);
                                if (currentUser.roles.length === 2 && nextRole) {
                                    switchRole(nextRole);
                                }
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                width: '100%',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                padding: '0.85rem',
                                borderRadius: '12px',
                                fontWeight: 800,
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
                                border: '2px solid rgba(255,255,255,0.2)',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            <ShieldCheck size={20} />
                            CAMBIAR DE ROL
                        </button>
                        
                        {/* If more than 2 roles, show the list below the red button but keep the button as the main trigger */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                            {currentUser.roles.map(r => (
                                <button
                                    key={r}
                                    onClick={() => switchRole(r)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        width: '100%',
                                        fontSize: '0.7rem',
                                        padding: '0.4rem 0.75rem',
                                        borderRadius: '6px',
                                        backgroundColor: activeRole === r ? 'rgba(255,255,255,0.15)' : 'transparent',
                                        color: activeRole === r ? 'white' : 'rgba(255,255,255,0.5)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontWeight: activeRole === r ? 700 : 400
                                    }}
                                >
                                    <span>{roleLabels[r] || r.toUpperCase()}</span>
                                    {activeRole === r && <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#ef4444' }} />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {activeRole !== 'familia' ? (
                    <>
                        <NavLink
                            to="/"
                            onClick={handleLinkClick}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'var(--transition)'
                            })}
                        >
                            <LayoutDashboard size={20} />
                            <span style={{ fontWeight: 500 }}>Inicio</span>
                        </NavLink>

                        <NavLink
                            to="/cursos"
                            onClick={handleLinkClick}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'var(--transition)'
                            })}
                        >
                            <GraduationCap size={20} />
                            <span style={{ fontWeight: 500 }}>Mis Cursos</span>
                        </NavLink>

                        <NavLink
                            to="/mis-estudiantes"
                            onClick={handleLinkClick}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'var(--transition)'
                            })}
                        >
                            <Users size={20} />
                            <span style={{ fontWeight: 500 }}>Mis Estudiantes</span>
                        </NavLink>

                        <NavLink
                            to="/audit-views"
                            onClick={handleLinkClick}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'var(--transition)'
                            })}
                        >
                            <Eye size={20} />
                            <span style={{ fontWeight: 500 }}>Registro Visualizaciones</span>
                        </NavLink>

                        <NavLink
                            to="/organizacion-institucional"
                            onClick={handleLinkClick}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                                backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                                transition: 'var(--transition)'
                            })}
                        >
                            <Map size={20} />
                            <span style={{ fontWeight: 500 }}>Organización Institucional</span>
                        </NavLink>
                    </>
                ) : (
                    <NavLink
                        to="/mis-hijos"
                        onClick={handleLinkClick}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                            backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            transition: 'var(--transition)'
                        })}
                    >
                        <Users size={20} />
                        <span style={{ fontWeight: 500 }}>Mis Hijos</span>
                    </NavLink>
                )}

                {(activeRole === 'administrador' || activeRole === 'equipo_conduccion') && (
                    <NavLink
                        to="/admin"
                        onClick={handleLinkClick}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                            backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                            transition: 'var(--transition)'
                        })}
                    >
                        <ShieldCheck size={20} />
                        <span>Administración General</span>
                    </NavLink>
                )}

                {/* ── Secciones globales ── */}
                <NavLink
                    to="/mensajeria"
                    onClick={handleLinkClick}
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                        transition: 'var(--transition)', position: 'relative',
                    })}
                >
                    <div style={{ position: 'relative' }}>
                        <MessageSquare size={20} />
                        {unreadCount > 0 && (
                            <span style={{ position: 'absolute', top: -6, right: -8, backgroundColor: '#ef4444', color: 'white', borderRadius: '50%', width: 16, height: 16, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <span style={{ fontWeight: 500 }}>Mensajería</span>
                </NavLink>

                <NavLink
                    to="/configuracion"
                    onClick={handleLinkClick}
                    style={({ isActive }) => ({
                        display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem',
                        borderRadius: 'var(--radius-md)', color: 'white', opacity: isActive ? 1 : 0.7,
                        backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                        transition: 'var(--transition)'
                    })}
                >
                    <Settings size={20} />
                    <span style={{ fontWeight: 500 }}>Configuración</span>
                </NavLink>
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{currentUser?.displayName || 'Usuario'}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Perfil Activo: <br /><b>{activeRole === 'equipo_conduccion' && currentUser?.cargo ? currentUser.cargo : (roleLabels[activeRole] || activeRole)}</b></p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2"
                    style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', backgroundColor: 'transparent', color: '#fca5a5', border: '1px solid #fca5a5' }}
                >
                    <LogOut size={18} />
                    <span>Cerrar Sesión</span>
                </button>
            </div>

        </aside>
    );
}
