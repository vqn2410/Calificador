import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Users, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#044b7f', '#f8981d', '#0d6db3', '#008f5e', '#ef4444', '#f59e0b', '#10b981', '#64748b'];

export default function Dashboard() {
    const { currentUser } = useAuth();

    const rolesArr = currentUser?.roles || [];
    const isFamilyOnly = rolesArr.includes('familia') && !rolesArr.some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r));
    if (isFamilyOnly) {
        return <Navigate to="/mis-hijos" replace />;
    }

    const [stats, setStats] = useState([
        { label: 'Cursos Asignados', value: '0', icon: <Users size={24} color="var(--color-primary)" /> },
        { label: 'Estudiantes', value: '0', icon: <GraduationCap size={24} color="var(--color-secondary)" /> },
        { label: 'Docentes Totales', value: '0', icon: <BookOpen size={24} color="var(--color-accent)" /> }
    ]);
    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = rolesArr.includes('administrador') || rolesArr.includes('equipo_conduccion');
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
                    { label: isAdmin ? 'Cursos Totales (aprox)' : 'Mis Cursos', value: isAdmin ? '12' : myCourses.length.toString(), icon: <Users size={24} color="var(--color-primary)" /> },
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

            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div className="card">
                    <h3 className="flex items-center gap-2 mb-4">
                        <BookOpen size={20} color="var(--color-primary)" />
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

                    {myCourses.length > 0 && (
                        <div style={{ marginTop: '2rem' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text-muted)' }}>Mis Accesos Rápidos</h4>
                            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.5rem' }}>
                                {myCourses.map((c, idx) => (
                                    <Link key={idx} to={`/cursos/${c}`} className="btn btn-outline" style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                                        <span style={{ fontWeight: 700, fontSize: '1rem' }}>{c.split('-')[0]}</span>
                                        <span style={{ fontSize: '0.65rem' }}>{c.split('-')[1]}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="card">
                    <h3 className="flex items-center gap-2 mb-4">
                        <Users size={20} color="var(--color-primary)" />
                        Distribución de Estudiantes
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
