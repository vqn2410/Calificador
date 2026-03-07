import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="app-layout">
            <button className="mobile-menu-btn no-print" onClick={toggleSidebar} style={{ position: 'fixed', top: '1rem', left: '1rem', zIndex: 50, background: 'var(--color-primary)', color: 'white', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: 'none', display: 'none' }}>
                <Menu size={24} />
            </button>

            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40 }} />
            )}

            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="app-main fade-in">
                <Outlet />
            </main>
        </div>
    );
}
