import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Users, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#044b7f', '#f8981d', '#0d6db3', '#008f5e', '#ef4444', '#f59e0b', '#10b981', '#64748b'];

export default function Dashboard() {
    const { currentUser, activeRole } = useAuth();

    if (activeRole === 'familia') {
        return <Navigate to="/panel/mis-hijos" replace />;
    }

    const [stats, setStats] = useState([
        { label: 'Cursos Asignados', value: '0', icon: <Users size={24} color="var(--color-primary)" /> },
        { label: 'Estudiantes', value: '0', icon: <GraduationCap size={24} color="var(--color-secondary)" /> },
        { label: 'Docentes Totales', value: '0', icon: <BookOpen size={24} color="var(--color-accent)" /> }
    ]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = activeRole === 'administrador' || activeRole === 'equipo_conduccion';
    const myCourses = currentUser?.cursosAsignados || [];

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // Fetch Students
                let qStudents;
                if (isAdmin) {
                    qStudents = collection(db, 'estudiantes');
                } else if (myCourses.length > 0) {
                    qStudents = query(collection(db, 'estudiantes'), where('cursoId', 'in', myCourses));
                } else {
                    // No courses assigned, fetch nothing but handle state
                    setStats([
                        { label: 'Mis Cursos', value: '0', icon: <Users size={24} color="var(--color-primary)" /> },
                        { label: 'Mis Estudiantes', value: '0', icon: <GraduationCap size={24} color="var(--color-secondary)" /> },
                        { label: 'Docentes en Plataforma', value: '---', icon: <BookOpen size={24} color="var(--color-accent)" /> }
                    ]);
                    setChartData([]);
                    setLoading(false);
                    return;
                }

                let stDocs = [];
                if (qStudents) {
                    const stSnapshot = await getDocs(qStudents);
                    stDocs = stSnapshot.docs.map(doc => doc.data());
                }

                // Fetch Docentes
                let docDocs = [];
                if (isAdmin) {
                    const docSnapshot = await getDocs(collection(db, 'docentes'));
                    docDocs = docSnapshot.docs;
                }

                setStats([
                    { label: isAdmin ? 'Cursos Totales (aprox)' : 'Mis Cursos', value: isAdmin ? '24' : myCourses.length.toString(), icon: <Users size={24} color="var(--color-primary)" /> },
                    { label: isAdmin ? 'Estudiantes Totales' : 'Mis Estudiantes', value: stDocs.length.toString(), icon: <GraduationCap size={24} color="var(--color-secondary)" /> },
                    { label: 'Docentes en Plataforma', value: isAdmin ? docDocs.length.toString() : '---', icon: <BookOpen size={24} color="var(--color-accent)" /> }
                ]);

                // Construct Chart Data (Alumnos por curso)
                const courseCounts = {};
                stDocs.forEach(st => {
                    const c = st.cursoId || 'Sin Curso';
                    courseCounts[c] = (courseCounts[c] || 0) + 1;
                });

                const cData = Object.keys(courseCounts).map(k => ({
                    name: k, value: courseCounts[k]
                })).sort((a, b) => b.value - a.value);

                setChartData(cData);

            } catch (err) {
                console.error("Error fetching dashboard data", err);
            } finally {
                setLoading(false);
            }
        };

        if (currentUser) {
            fetchDashboardData();
        }
    }, [currentUser, isAdmin, myCourses]);

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="mb-1">Dashboard</h1>
                    <p style={{ fontSize: '1.1rem', margin: 0 }}>¡Hola, {currentUser?.displayName || 'Docente'}! Este es el resumen de tu ciclo lectivo.</p>
                </div>
                {currentUser?.roles?.length > 1 && (
                    <div className="flex flex-col items-end gap-2 no-print">
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Perfil Activo: {(activeRole || '').replace('_', ' ')}</span>
                        <div className="flex gap-2">
                            {currentUser.roles.map(r => r !== activeRole && (
                                <button 
                                    key={r} 
                                    onClick={() => switchRole(r)}
                                    className="btn"
                                    style={{ 
                                        padding: '0.4rem 0.8rem', 
                                        fontSize: '0.75rem', 
                                        backgroundColor: '#ef4444', 
                                        color: 'white',
                                        boxShadow: '0 4px 8px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    CAMBIAR A {r.replace('_', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="grid stats-grid" style={{ gap: '1rem', marginBottom: '2rem' }}>
                {stats.map((stat, i) => (
                    <div key={i} className="card flex items-center gap-3" style={{ padding: '0.75rem' }}>
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 500 }}>{stat.label}</p>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-text-main)' }}>{stat.value}</h2>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div className="card">
                    <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}>
                        <BookOpen size={20} color="var(--color-primary)" />
                        Próximos Cierres
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {['1er Trimestre: 31 de Mayo', '2do Trimestre: 31 de Agosto', '3er Trimestre: 30 de Noviembre'].map((t, idx) => (
                            <li key={idx} style={{ padding: '0.75rem 0', borderBottom: idx !== 2 ? '1px solid var(--color-border)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 500, fontSize: '0.85rem' }}>{t.split(':')[0]}</span>
                                <span className={`badge ${idx === 0 ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem' }}>{t.split(':')[1]}</span>
                            </li>
                        ))}
                    </ul>

                    {myCourses.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h4 style={{ fontSize: '0.8rem', marginBottom: '1rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Mis Accesos Rápidos</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                                {myCourses.map((c, idx) => (
                                    <Link key={idx} to={`/panel/cursos/${c}`} className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', padding: '0.4rem', border: '1px solid var(--color-border)' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.split('-')[0]}</span>
                                        <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>{c.split('-')[1]}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="flex items-center gap-2 mb-4" style={{ fontSize: '1.1rem' }}>
                        <Users size={20} color="var(--color-primary)" />
                        Estudiantes
                    </h3>
                    {loading ? <p>Cargando gráfico...</p> : chartData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [value, 'Estudiantes']} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', marginTop: '2rem' }}>No hay datos suficientes para graficar.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
