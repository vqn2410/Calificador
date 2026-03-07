import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, LogOut, ShieldCheck, ChevronDown, UserCircle2 } from 'lucide-react';
import { useState } from 'react';

const roleLabels = {
    'administrador': 'Administrador',
    'equipo_conduccion': 'Conducción',
    'docente': 'Docente Titular',
    'docente_area': 'Docente Área',
    'familia': 'Familiar'
};

export default function Layout() {
    const { currentUser, logout, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();
    const [showRoleMenu, setShowRoleMenu] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Error al cerrar sesión', error);
        }
    };

    const handleSwitchRole = (role) => {
        switchRole(role);
        setShowRoleMenu(false);
    };

    const hasMultipleRoles = (currentUser?.roles || []).length > 1;

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <header className="mobile-header no-print">
                <div className="flex items-center gap-2">
                    <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela 6" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }} />
                    <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
                        <span style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Escuela Primaria N°6</span>
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.75rem', fontWeight: 500 }}>Calificador Digital</span>
                    </div>
                </div>

                <div className="flex items-center gap-2" style={{ position: 'relative' }}>
                    {/* Role Switcher (only if user has multiple roles) */}
                    {hasMultipleRoles && (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setShowRoleMenu(!showRoleMenu)}
                                className="btn flex items-center gap-1"
                                style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }}
                                title="Cambiar perfil"
                            >
                                <UserCircle2 size={16} />
                                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeRole === 'equipo_conduccion' && currentUser?.cargo ? currentUser.cargo : (roleLabels[activeRole] || activeRole)}
                                </span>
                                <ChevronDown size={14} />
                            </button>

                            {showRoleMenu && (
                                <>
                                    {/* Backdrop */}
                                    <div
                                        onClick={() => setShowRoleMenu(false)}
                                        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
                                    />
                                    {/* Dropdown */}
                                    <div style={{
                                        position: 'absolute', right: 0, top: '110%', zIndex: 999,
                                        backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                                        borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                        minWidth: '160px', overflow: 'hidden'
                                    }}>
                                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.7rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', fontWeight: 700 }}>
                                            Cambiar perfil
                                        </div>
                                        {(currentUser?.roles || []).map(role => (
                                            <button
                                                key={role}
                                                onClick={() => handleSwitchRole(role)}
                                                style={{
                                                    display: 'block', width: '100%', textAlign: 'left',
                                                    padding: '0.6rem 0.75rem', fontSize: '0.875rem',
                                                    backgroundColor: activeRole === role ? 'rgba(4,75,127,0.1)' : 'transparent',
                                                    color: activeRole === role ? 'var(--color-primary)' : 'var(--color-text)',
                                                    fontWeight: activeRole === role ? 700 : 400,
                                                    border: 'none', cursor: 'pointer',
                                                    borderLeft: activeRole === role ? '3px solid var(--color-primary)' : '3px solid transparent'
                                                }}
                                            >
                                                {role === 'equipo_conduccion' && currentUser?.cargo ? currentUser.cargo : (roleLabels[role] || role)}
                                                {activeRole === role && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem', color: '#fca5a5' }} title="Cerrar Sesión">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <Sidebar />

            <main className="app-main fade-in">
                <Outlet />
                <footer className="app-footer">
                    <span>Exportado desde Sistema de Calificaciones de la E.P N° 6 "Rafael Obligado"</span>
                </footer>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav no-print">
                {activeRole !== 'familia' && (
                    <>
                        <NavLink to="/" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                            <LayoutDashboard size={20} />
                            <span>Inicio</span>
                        </NavLink>
                        <NavLink to="/cursos" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                            <Users size={20} />
                            <span>Cursos</span>
                        </NavLink>
                        <NavLink to="/mis-estudiantes" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                            <Users size={20} />
                            <span>Alumnos</span>
                        </NavLink>
                    </>
                )}

                {activeRole === 'familia' && (
                    <NavLink to="/mis-hijos" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Mis Hijos</span>
                    </NavLink>
                )}

                {(activeRole === 'administrador' || activeRole === 'equipo_conduccion') && (
                    <NavLink to="/admin" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        <ShieldCheck size={20} />
                        <span>Admin</span>
                    </NavLink>
                )}
            </nav>
        </div>
    );
}

