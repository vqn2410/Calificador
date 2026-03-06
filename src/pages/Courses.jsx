import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BookOpen, Users } from 'lucide-react';

export default function Courses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                const querySnapshot = await getDocs(collection(db, 'cursos'));
                const coursesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                if (coursesData.length > 0) {
                    setCourses(coursesData);
                } else {
                    // Mock data (24 cursos)
                    const mockCourses = [];
                    for (let grado = 1; grado <= 6; grado++) {
                        ['A', 'B'].forEach((sec) => mockCourses.push({ id: `${grado}${sec}-TM`, grado, seccion: sec, turno: 'Mañana', tipo: grado <= 3 ? 'Conceptual' : 'Numérica' }));
                        ['C', 'D'].forEach((sec) => mockCourses.push({ id: `${grado}${sec}-TT`, grado, seccion: sec, turno: 'Tarde', tipo: grado <= 3 ? 'Conceptual' : 'Numérica' }));
                    }
                    setCourses(mockCourses);
                }
            } catch (err) {
                console.error("Firebase error", err);
                // Fallback Mock
                const mockCourses = [];
                for (let grado = 1; grado <= 6; grado++) {
                    ['A', 'B'].forEach((sec) => mockCourses.push({ id: `${grado}${sec}-TM`, grado, seccion: sec, turno: 'Mañana', tipo: grado <= 3 ? 'Conceptual' : 'Numérica' }));
                    ['C', 'D'].forEach((sec) => mockCourses.push({ id: `${grado}${sec}-TT`, grado, seccion: sec, turno: 'Tarde', tipo: grado <= 3 ? 'Conceptual' : 'Numérica' }));
                }
                setCourses(mockCourses);
            } finally {
                setLoading(false);
            }
        }

        fetchCourses();
    }, []);

    if (loading) return <div className="container"><h2>Cargando cursos...</h2></div>;

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1>Mis Cursos</h1>
                    <p>Organización Institucional: 24 Secciones Disponibles.</p>
                </div>
            </div>

            <div className="flex" style={{ flexDirection: 'column', gap: '1rem' }}>
                {courses.map(course => (
                    <Link to={`/cursos/${course.id}`} key={course.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'var(--transition)' }}>
                        <div className="flex items-center gap-4">
                            <div style={{ padding: '1rem', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: 'var(--radius-md)' }}>
                                <BookOpen size={24} />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--color-primary)' }}>
                                    {course.grado}° "{course.seccion}"
                                </h2>
                                <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                                    <Users size={16} />
                                    <span>Ver Estudiantes y Calificaciones</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`badge ${course.turno === 'Mañana' ? 'badge-success' : 'badge-warning'}`}>
                                Turno {course.turno}
                            </span>
                            <span className={`badge ${course.tipo === 'Conceptual' ? 'badge-success' : 'badge-error'}`}>
                                {course.tipo}
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
