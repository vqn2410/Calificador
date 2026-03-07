import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, BookOpen, GraduationCap, Clock } from 'lucide-react';

export default function Dashboard() {
    const { currentUser } = useAuth();

    if (currentUser?.roles?.includes('familia') && !currentUser?.roles?.includes('docente') && !currentUser?.roles?.includes('docente_area') && !currentUser?.roles?.includes('administrador')) {
        return <Navigate to="/mis-hijos" replace />;
    }

    const stats = [
        { label: 'Cursos Asignados', value: '4', icon: <Users size={24} color="var(--color-primary)" /> },
        { label: 'Estudiantes', value: '124', icon: <GraduationCap size={24} color="var(--color-secondary)" /> },
        { label: 'Materias', value: '8', icon: <BookOpen size={24} color="var(--color-accent)" /> },
        { label: 'Informes Pendientes', value: '12', icon: <Clock size={24} color="var(--color-warning)" /> }
    ];

    return (
        <div className="container">
            <h1 className="mb-4">Dashboard</h1>
            <p className="mb-4" style={{ fontSize: '1.2rem' }}>¡Hola, {currentUser?.displayName || 'Docente'}! Este es el resumen de tu ciclo lectivo.</p>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                {stats.map((stat, i) => (
                    <div key={i} className="card flex items-center gap-4">
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-lg)' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500 }}>{stat.label}</p>
                            <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--color-text-main)' }}>{stat.value}</h2>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="card">
                    <h3 className="flex items-center gap-2">
                        <Clock size={20} color="var(--color-primary)" />
                        Próximos Cierres Trimestrales
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {['1er Trimestre: 31 de Mayo', '2do Trimestre: 31 de Agosto', '3er Trimestre: 30 de Noviembre'].map((t, idx) => (
                            <li key={idx} style={{ padding: '1rem 0', borderBottom: idx !== 2 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: 500 }}>{t.split(':')[0]}</span>
                                <span className={`badge ${idx === 0 ? 'badge-warning' : 'badge-success'}`}>{t.split(':')[1]}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="card">
                    <h3 className="flex items-center gap-2">
                        <BookOpen size={20} color="var(--color-primary)" />
                        Acceso Rápido - Cursos (Secciones)
                    </h3>
                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        {['1°A - Turno Mañana', '3°C - Turno Tarde', '5°B - Turno Mañana', '6°D - Turno Tarde'].map((c, idx) => (
                            <div key={idx} className="btn btn-outline flex flex-col items-center justify-center p-4">
                                <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>{c.split('-')[0]}</span>
                                <span style={{ fontSize: '0.75rem' }}>{c.split('-')[1]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
