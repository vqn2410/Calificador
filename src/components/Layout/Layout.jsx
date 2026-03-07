import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

    // Close "more" menu on navigation
    useEffect(() => { setShowMoreMenu(false); }, [location.pathname]);

    const hasMultipleRoles = (currentUser?.roles || []).length > 1;
    const isStaff = activeRole !== 'familia';
    const isAdminOrConduccion = activeRole === 'administrador' || activeRole === 'equipo_conduccion';

    // ── Build the full nav item list per role ─────────────────
    const allNavItems = [];

    if (activeRole === 'familia') {
        allNavItems.push({ to: '/mis-hijos', icon: <Users size={20} />, label: 'Mis Hijos' });
    } else {
        allNavItems.push({ to: '/', icon: <LayoutDashboard size={20} />, label: 'Inicio', exact: true });
        allNavItems.push({ to: '/cursos', icon: <GraduationCap size={20} />, label: 'Cursos' });
        allNavItems.push({ to: '/mis-estudiantes', icon: <Users size={20} />, label: 'Alumnos' });
        if (isAdminOrConduccion) {
            allNavItems.push({ to: '/admin', icon: <ShieldCheck size={20} />, label: 'Admin' });
            allNavItems.push({ to: '/organizacion-institucional', icon: <Map size={20} />, label: 'Organización' });
            allNavItems.push({ to: '/audit-views', icon: <Eye size={20} />, label: 'Registros' });
        }
    }
    // All roles get these
    allNavItems.push({ to: '/mensajeria', icon: <MessageSquare size={20} />, label: 'Mensajería' });
    allNavItems.push({ to: '/configuracion', icon: <Settings size={20} />, label: 'Config.' });

    // Split: first 4 in bottom bar, rest in "Más"
    const PRIMARY_COUNT = 4;
    const primaryItems = allNavItems.slice(0, PRIMARY_COUNT);
    const moreItems = allNavItems.slice(PRIMARY_COUNT);

    const navItemStyle = (isActive) => ({
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        padding: '0.4rem 0.5rem',
        color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
        fontSize: '0.62rem', fontWeight: isActive ? 700 : 500,
        background: 'none', border: 'none', cursor: 'pointer',
        flex: 1, transition: 'color 0.15s',
        textDecoration: 'none',
    });

    return (
        <div className="app-layout">
            {/* Mobile Header */}
            <header className="mobile-header no-print">
                <div className="flex items-center gap-2">
                    <img
                        src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg"
                        alt="Logo EP6"
                        style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }}
                    />
                    <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
                        <span style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Escuela Primaria N°6</span>
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.7rem', fontWeight: 500 }}>Calificador Digital</span>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    {/* Role Switcher */}
                    {hasMultipleRoles && (
                        <div style={{ position: 'relative' }}>
                            <button
                                ref={roleButtonRef}
                                onClick={toggleRoleMenu}
                                className="btn flex items-center gap-1"
                                style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px' }}
                            >
                                <UserCircle2 size={15} />
                                <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {activeRole === 'equipo_conduccion' && currentUser?.cargo ? currentUser.cargo : (roleLabels[activeRole] || activeRole)}
                                </span>
                                <ChevronDown size={13} />
                            </button>

                            {showRoleMenu && (
                                <>
                                    <div onClick={() => setShowRoleMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1998 }} />
                                    <div style={{
                                        position: 'fixed', top: dropdownPos.top, right: dropdownPos.right,
                                        zIndex: 1999, backgroundColor: 'var(--color-surface)',
                                        border: '1px solid var(--color-border)', borderRadius: '10px',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.25)', minWidth: 180, overflow: 'hidden',
                                    }}>
                                        <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.68rem', color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', fontWeight: 700 }}>
                                            Cambiar perfil
                                        </div>
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
                                                {activeRole === role && <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>✓</span>}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <button onClick={handleLogout} className="btn" style={{ padding: '0.35rem', color: '#fca5a5' }} title="Cerrar Sesión">
                        <LogOut size={19} />
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

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="mobile-bottom-nav no-print">
                {/* Primary nav items */}
                {primaryItems.map(item => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.exact}
                        style={({ isActive }) => navItemStyle(isActive)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}

                {/* "Más" button — opens drawer with extra items */}
                {moreItems.length > 0 && (
                    <button
                        onClick={() => setShowMoreMenu(v => !v)}
                        style={navItemStyle(moreItems.some(i => location.pathname.startsWith(i.to)))}
                    >
                        <MoreHorizontal size={20} />
                        <span>Más</span>
                    </button>
                )}

                {/* More menu drawer */}
                {showMoreMenu && (
                    <>
                        {/* Backdrop */}
                        <div
                            onClick={() => setShowMoreMenu(false)}
                            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 499 }}
                        />
                        {/* Drawer */}
                        <div style={{
                            position: 'fixed', bottom: '60px', left: '50%', transform: 'translateX(-50%)',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '16px 16px 0 0',
                            width: '100%', maxWidth: 480,
                            zIndex: 500, boxShadow: '0 -4px 24px rgba(0,0,0,0.2)',
                            padding: '0.5rem 0 1rem',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1rem 0.75rem', borderBottom: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Más secciones</span>
                                <button onClick={() => setShowMoreMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.25rem', padding: '0 0.5rem' }}>
                                {moreItems.map(item => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        onClick={() => setShowMoreMenu(false)}
                                        style={({ isActive }) => ({
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                                            padding: '0.9rem 0.5rem', borderRadius: 12, textDecoration: 'none',
                                            backgroundColor: isActive ? 'rgba(4,75,127,0.08)' : 'transparent',
                                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-main)',
                                            fontWeight: isActive ? 700 : 500, fontSize: '0.72rem',
                                            transition: 'all 0.15s',
                                        })}
                                    >
                                        {item.icon}
                                        <span style={{ textAlign: 'center', lineHeight: 1.2 }}>{item.label}</span>
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </nav>
        </div>
    );
}
