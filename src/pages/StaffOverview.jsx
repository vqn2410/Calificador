import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { VALID_COURSES } from '../config/constants';
import { Users, User, BookOpen, Layers, MapPin } from 'lucide-react';

export default function StaffOverview() {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStaff() {
            try {
                const querySnapshot = await getDocs(collection(db, 'docentes'));
                const staffData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setStaff(staffData);
            } catch (err) {
                console.error("Error fetching staff:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStaff();
    }, []);

    const getTeachersForCourse = (courseId) => {
        return staff.filter(s => s.cursosAsignados?.includes(courseId));
    };

    const getParallelSection = (courseId) => {
        // e.g. "4A-TM" -> Parallel is usually "4B-TM"
        const grado = courseId.charAt(0);
        const seccion = courseId.charAt(1);
        const turno = courseId.split('-')[1];

        let parallelSec = '';
        if (seccion === 'A') parallelSec = 'B';
        else if (seccion === 'B') parallelSec = 'A';
        else if (seccion === 'C') parallelSec = 'D';
        else if (seccion === 'D') parallelSec = 'C';

        return `${grado}${parallelSec}-${turno}`;
    };

    if (loading) return <div className="container"><h2>Cargando planta docente...</h2></div>;

    // Group courses by Grade
    const grades = [1, 2, 3, 4, 5, 6];

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div className="mb-6">
                <h1>Organización Institucional</h1>
                <p>Planta Funcional de Docentes y Especialistas de la EP N° 6</p>
            </div>

            {grades.map(grado => (
                <div key={grado} className="mb-8">
                    <h2 style={{ color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', display: 'inline-block', marginBottom: '1.5rem', paddingRight: '2rem' }}>
                        {grado}° Año
                    </h2>

                    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        {VALID_COURSES.filter(c => c.grado === grado).map(course => {
                            const courseTeachers = getTeachersForCourse(course.id);
                            const gradeTeacher = courseTeachers.find(t => t.roles?.includes('docente'));
                            const areaTeachers = courseTeachers.filter(t => t.roles?.includes('docente_area'));

                            // For 4th-6th, show the parallel teacher who shares the binario
                            let parallelTeacher = null;
                            if (grado >= 4) {
                                const parallelId = getParallelSection(course.id);
                                parallelTeacher = staff.find(t => t.roles?.includes('docente') && t.cursosAsignados?.includes(parallelId));
                            }

                            return (
                                <div key={course.id} className="card" style={{ borderLeft: '5px solid var(--color-primary)' }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Sección: {course.grado}° "{course.seccion}"</h3>
                                            <div className="flex items-center gap-2 mt-1" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                <MapPin size={14} />
                                                <span>Turno {course.turno} | {course.tipo}</span>
                                            </div>
                                        </div>
                                        <div className={`badge ${course.turno === 'Mañana' ? 'badge-success' : 'badge-warning'}`}>
                                            {course.id}
                                        </div>
                                    </div>

                                    <div className="staff-roles-grid" style={{ display: 'grid', gap: '1rem' }}>
                                        {/* Titular */}
                                        <div style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                Docente de Grado
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User size={16} />
                                                <span style={{ fontWeight: 600 }}>{gradeTeacher ? `${gradeTeacher.apellido}, ${gradeTeacher.nombre}` : 'Sin asignar'}</span>
                                            </div>
                                        </div>

                                        {/* Paralelo (Solo 4-6) */}
                                        {grado >= 4 && (
                                            <div style={{ backgroundColor: '#fefce8', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a16207', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                    Docente Paralelo (Binario)
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Layers size={16} />
                                                    <span style={{ fontWeight: 600 }}>{parallelTeacher ? `${parallelTeacher.apellido}, ${parallelTeacher.nombre}` : 'Sin asignar'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Especialistas */}
                                        <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                                                Especialidades de Área
                                            </div>
                                            {areaTeachers.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                    {areaTeachers.map(at => (
                                                        <div key={at.id} style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: 700 }}>{at.materiaEspecial || 'Área'}</span>
                                                            <span style={{ color: '#166534' }}>{at.apellido}, {at.nombre.charAt(0)}.</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#166534', fontStyle: 'italic' }}>Pendiente de vinculación...</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
