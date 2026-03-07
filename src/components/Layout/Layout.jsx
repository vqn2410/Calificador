import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, LogOut, ShieldCheck } from 'lucide-react';

export default function Layout() {
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
                <button onClick={handleLogout} className="btn" style={{ padding: '0.4rem', color: '#fca5a5' }} title="Cerrar Sesión">
                    <LogOut size={20} />
                </button>
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
                {(!(currentUser?.roles || []).includes('familia') || (currentUser?.roles || []).length > 1) && (
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

                {(currentUser?.roles || []).includes('familia') && (
                    <NavLink to="/mis-hijos" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        <Users size={20} />
                        <span>Mis Hijos</span>
                    </NavLink>
                )}

                {(currentUser?.roles?.includes('administrador') || currentUser?.roles?.includes('equipo_conduccion')) && (
                    <NavLink to="/admin" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                        <ShieldCheck size={20} />
                        <span>Admin</span>
                    </NavLink>
                )}
            </nav>
        </div>
    );
}
