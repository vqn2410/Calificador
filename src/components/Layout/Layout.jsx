import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { createPortal } from 'react-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard, Users, LogOut, ShieldCheck, ChevronDown,
    UserCircle2, MessageSquare, Settings, GraduationCap, Map,
    Eye, MoreHorizontal, X
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

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
    const location = useLocation();
    const [showRoleMenu, setShowRoleMenu] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const roleButtonRef = useRef(null);

    const handleLogout = async () => {
        try { await logout(); navigate('/login'); } catch (e) { console.error(e); }
    };

    const handleSwitchRole = (role) => { switchRole(role); setShowRoleMenu(false); };

    const toggleRoleMenu = () => {
        if (!showRoleMenu && roleButtonRef.current) {
            const rect = roleButtonRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
        }
        setShowRoleMenu(v => !v);
    };

    // Close menus on navigation
    useEffect(() => { setShowMoreMenu(false); setShowRoleMenu(false); }, [location.pathname]);

    const hasMultipleRoles = (currentUser?.roles || []).length > 1;
    const isAdminOrConduccion = activeRole === 'administrador' || activeRole === 'equipo_conduccion';
    const isStaff = activeRole !== 'familia';

    // ── Build nav item lists ───────────────────────────────────
    const primaryItems = [];
    const moreItems = [];

    if (activeRole === 'familia') {
        primaryItems.push({ to: '/panel/mis-hijos', icon: <Users size={22} />, label: 'Mis Hijos' });
        primaryItems.push({ to: '/panel/mensajeria', icon: <MessageSquare size={22} />, label: 'Mensajería' });
        primaryItems.push({ to: '/panel/configuracion', icon: <Settings size={22} />, label: 'Config.' });
    } else {
        primaryItems.push({ to: '/panel', icon: <LayoutDashboard size={22} />, label: 'Inicio', exact: true });
        primaryItems.push({ to: '/panel/cursos', icon: <GraduationCap size={22} />, label: 'Cursos' });
        primaryItems.push({ to: '/panel/mis-estudiantes', icon: <Users size={22} />, label: 'Alumnos' });
        primaryItems.push({ to: '/panel/mensajeria', icon: <MessageSquare size={22} />, label: 'Mensajes' });

        // "Más" items
        if (isAdminOrConduccion) {
            moreItems.push({ to: '/panel/admin', icon: <ShieldCheck size={24} />, label: 'Administración' });
            moreItems.push({ to: '/panel/organizacion-institucional', icon: <Map size={24} />, label: 'Organización' });
            moreItems.push({ to: '/panel/audit-views', icon: <Eye size={24} />, label: 'Registros' });
        }
        moreItems.push({ to: '/panel/configuracion', icon: <Settings size={24} />, label: 'Configuración' });
    }

    const isInMore = moreItems.some(i => location.pathname === i.to || location.pathname.startsWith(i.to + '/'));

    return (
        <div className="app-layout">
            {/* ── Mobile Header ── */}
            <header className="mobile-header no-print">
                <div className="flex items-center gap-2">
                    <img
                        src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg"
                        alt="Logo EP6"
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }}
                    />
                    <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>EP N°6 – Rafael Obligado</span>
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.68rem' }}>Calificador Digital</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {hasMultipleRoles && (
                        <div style={{ position: 'relative' }}>
                            <button
                                ref={roleButtonRef}
                                onClick={toggleRoleMenu}
                                className="btn flex items-center gap-1"
                                style={{ 
                                    padding: '0.4rem 0.65rem', 
                                    fontSize: '0.75rem', 
                                    backgroundColor: '#ef4444', 
                                    color: 'white', 
                                    border: '1px solid rgba(255,255,255,0.3)', 
                                    borderRadius: '8px',
                                    fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                <UserCircle2 size={16} />
                                <span>CAMBIAR ROL</span>
                                <ChevronDown size={13} />
                            </button>

                            {showRoleMenu && createPortal(
                                <>
                                    <div onClick={() => setShowRoleMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 9000 }} />
                                    <div style={{
                                        position: 'fixed', top: dropdownPos.top, right: dropdownPos.right,
                                        zIndex: 9001, backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)', borderRadius: '10px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 180, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.68rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', fontWeight: 700 }}>Cambiar perfil</div>
                                        {(currentUser?.roles || []).map(role => (
                                            <button key={role} onClick={() => handleSwitchRole(role)} style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                width: '100%', textAlign: 'left', padding: '0.65rem 0.75rem', fontSize: '0.875rem',
                                                backgroundColor: activeRole === role ? 'rgba(4,75,127,0.08)' : 'transparent',
                                                color: activeRole === role ? 'var(--color-primary)' : 'var(--color-text-main)',
                                                fontWeight: activeRole === role ? 700 : 400, border: 'none', cursor: 'pointer',
                                                borderLeft: activeRole === role ? '3px solid var(--color-primary)' : '3px solid transparent',
                                            }}>
                                                <span>{role === 'equipo_conduccion' && currentUser?.cargo ? currentUser.cargo : (roleLabels[role] || role)}</span>
                                                {activeRole === role && <span style={{ color: 'var(--color-primary)' }}>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>,
                                document.body
                            )}
                        </div>
                    )}

                    <button onClick={handleLogout} className="btn" style={{ padding: '0.35rem', color: '#fca5a5' }}>
                        <LogOut size={19} />
                    </button>
                </div>
            </header>

            <Sidebar />

            <main className="app-main fade-in">
                <Outlet />
                <footer className="app-footer">
                    <span>Sistema de Calificaciones · E.P N° 6 "Rafael Obligado"</span>
                </footer>
            </main>

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="mobile-bottom-nav no-print">
                {primaryItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={!!item.exact}
                        style={({ isActive }) => ({
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '2px', padding: '0.4rem 0.25rem', flex: 1,
                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            fontSize: '0.6rem', fontWeight: isActive ? 700 : 500,
                            textDecoration: 'none', transition: 'color 0.15s',
                        })}
                    >
                        {item.icon}
                        <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
                    </NavLink>
                ))}

                {moreItems.length > 0 && (
                    <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '2px', padding: '0.4rem 0.25rem', flex: 1, border: 'none',
                            background: 'none', cursor: 'pointer',
                            color: isInMore || showMoreMenu ? 'var(--color-primary)' : 'var(--color-text-muted)',
                            fontSize: '0.6rem', fontWeight: isInMore || showMoreMenu ? 700 : 500,
                        }}
                    >
                        <MoreHorizontal size={22} />
                        <span>Más</span>
                    </button>
                )}
            </nav>

            {/* ── More menu — rendered via portal to escape stacking contexts ── */}
            {showMoreMenu && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        onClick={() => setShowMoreMenu(false)}
                        style={{
                            position: 'fixed', inset: 0,
                            backgroundColor: 'rgba(0,0,0,0.45)',
                            zIndex: 8000,
                            backdropFilter: 'blur(2px)',
                        }}
                    />
                    {/* Sheet */}
                    <div style={{
                        position: 'fixed',
                        bottom: 65,          // height of bottom nav
                        left: 0, right: 0,
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: '20px 20px 0 0',
                        zIndex: 8001,
                        boxShadow: '0 -8px 32px rgba(0,0,0,0.25)',
                        padding: '0 0 1.5rem',
                        animation: 'slideUp 0.2s ease-out',
                    }}>
                        <style>{`@keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }`}</style>

                        {/* Handle bar */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '0.75rem 0 0.25rem' }}>
                            <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: 'var(--color-border)' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 1.25rem 0.75rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Más secciones</span>
                            <button onClick={() => setShowMoreMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '0.25rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', padding: '0.5rem 1rem' }}>
                            {moreItems.map(item => {
                                const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                                return (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setShowMoreMenu(false)}
                                        style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                                            padding: '1rem 0.5rem', borderRadius: 14, textDecoration: 'none',
                                            backgroundColor: isActive ? 'rgba(4,75,127,0.1)' : 'var(--color-background)',
                                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                            fontWeight: isActive ? 700 : 500, fontSize: '0.72rem', textAlign: 'center',
                                            border: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                                        }}
                                    >
                                        {item.icon}
                                        <span style={{ lineHeight: 1.2 }}>{item.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    </div>
                </>,
                document.body   // ← Portal to body, completely outside any stacking context
            )}
        </div>
    );
}
