import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
    Users,
    Search,
    Filter,
    ChevronRight,
    TrendingUp,
    BookOpen,
    ArrowLeft,
    BarChart2,
    X,
    User
} from 'lucide-react';
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    BarChart,
    Bar,
    Legend
} from 'recharts';

export default function MyStudents() {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCourse, setSelectedCourse] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Courses
                const coursesSnap = await getDocs(collection(db, 'cursos'));
                const coursesData = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCourses(coursesData.sort((a, b) => a.id.localeCompare(b.id)));

                // Fetch Students
                const studentsSnap = await getDocs(query(collection(db, 'estudiantes'), orderBy('nombre', 'asc')));
                const studentsData = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStudents(studentsData);
            } catch (error) {
                console.error("Error fetching students/courses:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredStudents = students.filter(st => {
        const matchesCourse = selectedCourse === 'all' || st.cursoId === selectedCourse;
        const matchesSearch = String(st.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(st.dni || '').includes(searchTerm);
        return matchesCourse && matchesSearch;
    });

    const handleHistoryClick = (student) => {
        setSelectedStudent(student);
        setShowHistory(true);
    };

    // Prepare data for the chart
    const getChartData = (student) => {
        if (!student?.informes) return [];

        const trimesters = ['1er Trimestre', '2do Trimestre', '3er Trimestre'];
        const data = trimesters.map(trim => {
            const informe = student.informes.find(inf => inf.trimestre === trim);
            if (!informe || !informe.materias) return { name: trim, value: 0 };

            // Map grades to numeric values
            const grades = Object.values(informe.materias).map(g => {
                if (!g) return 0;
                if (!isNaN(g)) return parseFloat(g);
                const map = { 'Sobresaliente': 10, 'Muy bueno': 8, 'Bueno': 7, 'Regular': 5, 'Desaprobado': 2, 'S': 10, 'MB': 8, 'B': 7, 'R': 5, 'D': 2 };
                return map[g] || 0;
            }).filter(v => v > 0);

            const avg = grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
            return {
                name: trim.replace(' Trimestre', ''),
                promedio: parseFloat(avg.toFixed(2))
            };
        });
        return data;
    };

    const getInasistenciasData = (student) => {
        if (!student?.informes) return [];
        return ['1er Trimestre', '2do Trimestre', '3er Trimestre'].map(trim => {
            const inf = student.informes.find(i => i.trimestre === trim);
            return {
                name: trim.replace(' Trimestre', ''),
                inasistencias: parseFloat(inf?.inasistencias || 0)
            };
        });
    };

    if (loading) return <div className="container"><h2>Cargando Mis Estudiantes...</h2></div>;

    return (
        <div className="container">
            <div className="header-actions mb-6">
                <div>
                    <h1 className="flex items-center gap-2">
                        <Users color="var(--color-primary)" />
                        Mis Estudiantes
                    </h1>
                    <p style={{ margin: 0 }}>Gestión de trayectoria y visualización de historial académico.</p>
                </div>
            </div>

            <div className="card mb-6" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
                        <input
                            type="text"
                            className="input-field mb-0 pl-10"
                            placeholder="Buscar por nombre o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={18} style={{ color: '#64748b' }} />
                        <select
                            className="input-field mb-0"
                            style={{ width: 'auto' }}
                            value={selectedCourse}
                            onChange={(e) => setSelectedCourse(e.target.value)}
                        >
                            <option value="all">Todos los cursos</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.grado}° "{c.seccion}" ({c.id.split('-')[1]})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-responsive" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                <table className="w-full" style={{ borderCollapse: 'collapse', textAlign: 'left', minWidth: 480 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                            <th style={{ padding: '1rem' }}>Estudiante</th>
                            <th style={{ padding: '1rem' }}>Curso</th>
                            <th style={{ padding: '1rem' }}>DNI</th>
                            <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    No se encontraron estudiantes con los criterios de búsqueda.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map(st => (
                                <tr key={st.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover:bg-slate-50">
                                    <td style={{ padding: '1rem' }}>
                                        <div className="flex items-center gap-3">
                                            <div style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', borderRadius: '50%', color: 'var(--color-primary)' }}>
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600 }}>{st.nombre}</div>
                                                {st.famFiliacion && (
                                                    <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                        {st.famFiliacion.parentesco}: {st.famFiliacion.dni}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}>
                                            {st.cursoId || 'Sin asignar'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', color: '#64748b' }}>{st.dni}</td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                className="btn btn-outline"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                onClick={() => handleHistoryClick(st)}
                                            >
                                                <TrendingUp size={14} className="mr-1" /> Historial
                                            </button>
                                            <button
                                                className="btn"
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                                                onClick={() => navigate(`/estudiantes/${st.id}`)}
                                            >
                                                <BookOpen size={14} className="mr-1" /> Boletín Digital
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL HISTORIAL ACADEMICO */}
            {showHistory && selectedStudent && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)} style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div className="card shadow-2xl"
                        onClick={e => e.stopPropagation()}
                        style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>

                        <button
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                            onClick={() => setShowHistory(false)}
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-6 flex items-center gap-4">
                            <div style={{ padding: '1rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%' }}>
                                <BarChart2 size={32} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0 }}>Historial Académico</h2>
                                <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary)' }}>{selectedStudent.nombre}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="card mb-0" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                                <h4 className="flex items-center gap-2 mb-4">
                                    <TrendingUp size={16} color="var(--color-primary)" />
                                    Evolución de Calificaciones (Promedio)
                                </h4>
                                <div style={{ height: '240px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={getChartData(selectedStudent)}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.1} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                            <YAxis domain={[0, 10]} fontSize={11} stroke="#94a3b8" />
                                            <Tooltip />
                                            <Area
                                                type="monotone"
                                                dataKey="promedio"
                                                stroke="var(--color-primary)"
                                                fillOpacity={1}
                                                fill="url(#colorValue)"
                                                strokeWidth={3}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card mb-0" style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
                                <h4 className="flex items-center gap-2 mb-4">
                                    <TrendingUp size={16} color="#ef4444" />
                                    Inasistencias por Trimestre
                                </h4>
                                <div style={{ height: '240px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getInasistenciasData(selectedStudent)}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                                            <YAxis fontSize={11} stroke="#94a3b8" />
                                            <Tooltip />
                                            <Bar dataKey="inasistencias" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                            {['1er Trimestre', '2do Trimestre', '3er Trimestre'].map(trim => {
                                const inf = selectedStudent.informes?.find(i => i.trimestre === trim);
                                return (
                                    <div key={trim} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748b' }}>{trim.toUpperCase()}</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
                                            {inf?.materias ? (Object.values(inf.materias).filter(v => v !== '-').length) : 0} áreas
                                        </div>
                                        <div style={{ fontSize: '0.65rem' }}>{inf?.inasistencias || 0} inasistencias</div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 flex justify-end">
                            <button className="btn btn-outline" onClick={() => setShowHistory(false)}>Cerrar Historial</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
