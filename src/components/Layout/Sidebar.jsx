import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    LogOut,
    GraduationCap,
    ShieldCheck,
    X
} from 'lucide-react';

export default function Sidebar({ isOpen, setIsOpen }) {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();

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
            <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
                <div className="flex items-center gap-2 mb-4">
                    <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela 6" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'contain', backgroundColor: 'white' }} />
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Escuela Primaria N°6 <br />
                        <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.8, color: '#e2e8f0' }}>"Rafael Obligado"</p>
                        <span style={{ color: 'var(--color-accent)', fontSize: '1rem' }}>Calificador Digital</span></h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.8, color: '#e2e8f0' }}>D.G.C y E de la Provincia de Buenos Aires</p>
            </div>

            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!currentUser?.roles?.includes('familia') || currentUser?.roles?.length > 1 ? (
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
                            <Users size={20} />
                            <span style={{ fontWeight: 500 }}>Mis Cursos</span>
                        </NavLink>
                    </>
                ) : null}

                {currentUser?.roles?.includes('familia') && (
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

                {currentUser?.roles?.includes('administrador') && (
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
                        <span style={{ fontWeight: 500 }}>Administración</span>
                    </NavLink>
                )}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {currentUser?.email ? currentUser.email[0].toUpperCase() : 'D'}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: '#fff' }}>{currentUser?.displayName || 'Docente'}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>Rol: {currentUser?.roles?.join(', ') || 'docente'}</p>
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
