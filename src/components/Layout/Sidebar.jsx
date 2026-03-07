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
    X
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
    const { currentUser, logout, activeRole, switchRole } = useAuth();
    const navigate = useNavigate();

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
            <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }}>
                <div className="flex items-center gap-2 mb-4">
                    <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela 6" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }} />
                    <h2 style={{ margin: 0, fontSize: '0.9rem' }}>EP N°6 <br />
                        <span style={{ color: 'var(--color-accent)', fontSize: '0.9rem' }}>Calificador Digital</span></h2>
                </div>
                {currentUser?.roles?.length > 1 && (
                    <div style={{ marginTop: '1rem' }}>
                        <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: '0.25rem' }}>CAMBIAR PERFIL:</label>
                        <div className="flex flex-wrap gap-1">
                            {currentUser.roles.map(r => (
                                <button
                                    key={r}
                                    onClick={() => switchRole(r)}
                                    style={{
                                        fontSize: '0.65rem',
                                        padding: '0.2rem 0.4rem',
                                        borderRadius: '4px',
                                        border: activeRole === r ? '1px solid var(--color-accent)' : '1px solid rgba(255,255,255,0.2)',
                                        backgroundColor: activeRole === r ? 'rgba(202,138,4,0.2)' : 'transparent',
                                        color: activeRole === r ? 'var(--color-accent)' : 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {roleLabels[r] || r.toUpperCase()}
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
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {currentUser?.email ? currentUser.email[0].toUpperCase() : 'U'}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{currentUser?.displayName || 'Usuario'}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Perfil Activo: <br /><b>{roleLabels[activeRole] || activeRole}</b></p>
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
