import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { VALID_COURSES, getCourseDetails } from '../config/constants';
import { BookOpen, Users, ShieldAlert } from 'lucide-react';

export default function Courses() {
    const { currentUser, activeRole } = useAuth();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            try {
                // Roles that see EVERYTHING (24 sections)
                const isControlUser = ['administrador', 'equipo_conduccion'].includes(activeRole);

                if (isControlUser) {
                    // Try to get from DB, if empty use constants
                    const querySnapshot = await getDocs(collection(db, 'cursos'));
                    let dbCourses = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setCourses(dbCourses.length > 0 ? dbCourses : VALID_COURSES);
                } else {
                    // Specific teacher: MUST match Dashboard "cursosAsignados" source
                    const assignedIds = currentUser?.cursosAsignados || [];

                    // Fetch full data from DB only for those assigned
                    const querySnapshot = await getDocs(collection(db, 'cursos'));
                    const dbData = querySnapshot.docs.reduce((acc, d) => ({ ...acc, [d.id]: d.data() }), {});

                    // Map Ids to full objects (from DB or fallback to constants)
                    const filtered = assignedIds.map(id => {
                        const details = getCourseDetails(id) || { grado: id.charAt(0), seccion: id.charAt(1) };
                        return { id, ...details, ...(dbData[id] || {}) };
                    });

                    setCourses(filtered);
                }
            } catch (err) {
                console.error("Error matching courses:", err);
                // Last resort fallback
                const assigned = currentUser?.cursosAsignados || [];
                setCourses(assigned.map(id => getCourseDetails(id) || { id, grado: '?', seccion: '?' }));
            } finally {
                setLoading(false);
            }
        }

        fetchCourses();
    }, [activeRole, currentUser]);

    if (loading) return <div className="container"><h2>Cargando cursos...</h2></div>;

    if (courses.length === 0) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <ShieldAlert size={64} color="var(--color-error)" style={{ marginBottom: '1rem' }} />
                <h1>Sin Cursos Asignados</h1>
                <p>No tienes cursos vinculados a tu perfil. Contacta al administrador si crees que esto es un error.</p>
                <Link to="/" className="btn btn-primary mt-4">Volver al Inicio</Link>
            </div>
        );
    }

    return (
        <div className="container">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1>Mis Cursos</h1>
                    <p>Gestiona las calificaciones de tus secciones asignadas.</p>
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
