import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../config/firebase';
import { VALID_COURSES } from '../config/constants';
import { useAuth } from '../context/AuthContext';
import { Users, User, BookOpen, Layers, MapPin, Edit3, Check, RefreshCcw, X } from 'lucide-react';

export default function StaffOverview() {
    const { activeRole } = useAuth();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [savingId, setSavingId] = useState(null);

    const isAdmin = ['administrador', 'equipo_conduccion'].includes(activeRole);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'docentes'));
            const staffData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStaff(staffData);
        } catch (err) {
            console.error("Error fetching staff:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStaff();
    }, []);

    const handleUpdateAssignment = async (teacherId, courseId, action) => {
        setSavingId(courseId);
        try {
            const teacherRef = doc(db, 'docentes', teacherId);
            await updateDoc(teacherRef, {
                cursosAsignados: action === 'add' ? arrayUnion(courseId) : arrayRemove(courseId)
            });
            await fetchStaff();
        } catch (err) {
            console.error("Error updating assignment", err);
            alert("No se pudo actualizar la asignación.");
        } finally {
            setSavingId(null);
        }
    };

    const handleReplaceTitular = async (newTeacherId, oldTeacherId, courseId) => {
        setSavingId(courseId);
        try {
            if (oldTeacherId) {
                const oldRef = doc(db, 'docentes', oldTeacherId);
                await updateDoc(oldRef, { cursosAsignados: arrayRemove(courseId) });
            }
            if (newTeacherId) {
                const newRef = doc(db, 'docentes', newTeacherId);
                await updateDoc(newRef, { cursosAsignados: arrayUnion(courseId) });
            }
            await fetchStaff();
        } catch (err) {
            console.error(err);
        } finally {
            setSavingId(null);
        }
    };

    const getTeachersForCourse = (courseId) => {
        return staff.filter(s => s.cursosAsignados?.includes(courseId));
    };

    const getParallelSection = (courseId) => {
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

    if (loading && staff.length === 0) return <div className="container"><h2>Cargando planta docente...</h2></div>;

    const grades = [1, 2, 3, 4, 5, 6];
    const titularPool = staff.filter(s => s.roles?.includes('docente') || s.roles?.includes('administrador'));
    const areaPool = staff.filter(s => s.roles?.includes('docente_area'));

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div>
                    <h1>Organización Institucional</h1>
                    <p>Planta Funcional de Docentes y Especialistas de la EP N° 6</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`btn flex items-center gap-2 ${isEditing ? 'btn-secondary' : 'btn-outline'}`}
                        style={{ border: isEditing ? 'none' : '2px solid var(--color-primary)' }}
                    >
                        {isEditing ? <><Check size={18} /> Finalizar Edición</> : <><Edit3 size={18} /> Gestionar Designaciones</>}
                    </button>
                )}
            </div>

            {grades.map(grado => (
                <div key={grado} className="mb-8">
                    <h2 style={{ color: 'var(--color-primary)', borderBottom: '2px solid var(--color-primary)', display: 'inline-block', marginBottom: '1.5rem', paddingRight: '2rem' }}>
                        {grado}° Año
                    </h2>

                    <div className="flex flex-col gap-4">
                        {VALID_COURSES.filter(c => c.grado === grado).map(course => {
                            const courseTeachers = getTeachersForCourse(course.id);
                            const gradeTeacher = courseTeachers.find(t => t.roles?.includes('docente'));
                            const areaTeachers = courseTeachers.filter(t => t.roles?.includes('docente_area'));
                            const isSaving = savingId === course.id;

                            let parallelTeacher = null;
                            if (grado >= 4) {
                                const parallelId = getParallelSection(course.id);
                                parallelTeacher = staff.find(t => t.roles?.includes('docente') && t.cursosAsignados?.includes(parallelId));
                            }

                            return (
                                <div key={course.id} className="card" style={{ borderLeft: '5px solid var(--color-primary)', opacity: isSaving ? 0.6 : 1 }}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Sección: {course.grado}° "{course.seccion}"</h3>
                                            <div className="flex items-center gap-2 mt-1" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                <MapPin size={14} />
                                                <span>Turno {course.turno} | {course.tipo}</span>
                                            </div>
                                        </div>
                                        <div className={`badge ${course.turno === 'Mañana' ? 'badge-success' : 'badge-warning'}`}>
                                            {isSaving ? <RefreshCcw className="animate-spin" size={14} /> : course.id}
                                        </div>
                                    </div>

                                    <div className="staff-roles-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                        {/* Titular */}
                                        <div style={{ backgroundColor: '#f0f9ff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                Docente de Grado
                                            </div>
                                            {isEditing ? (
                                                <select
                                                    className="input-field mb-0"
                                                    style={{ fontSize: '0.85rem' }}
                                                    value={gradeTeacher?.id || ''}
                                                    disabled={isSaving}
                                                    onChange={(e) => handleReplaceTitular(e.target.value, gradeTeacher?.id, course.id)}
                                                >
                                                    <option value="">- Seleccionar Titular -</option>
                                                    {titularPool.map(s => (
                                                        <option key={s.id} value={s.id}>{s.apellido}, {s.nombre}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <User size={16} />
                                                    <span style={{ fontWeight: 600 }}>{gradeTeacher ? `${gradeTeacher.apellido}, ${gradeTeacher.nombre}` : 'Sin asignar'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Paralelo */}
                                        {grado >= 4 && (
                                            <div style={{ backgroundColor: '#fefce8', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a16207', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                                    Docente Paralelo
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Layers size={16} />
                                                    <span style={{ fontWeight: 600 }}>{parallelTeacher ? `${parallelTeacher.apellido}, ${parallelTeacher.nombre}` : 'Sin asignar'}</span>
                                                </div>
                                                {isEditing && <p style={{ margin: '5px 0 0', fontSize: '0.65rem', fontStyle: 'italic' }}>(Referencial)</p>}
                                            </div>
                                        )}

                                        {/* Especialistas */}
                                        <div style={{ backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', gridColumn: grado < 4 ? 'span 2' : 'span 1' }}>
                                            <div className="flex justify-between items-center mb-2">
                                                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803d', textTransform: 'uppercase' }}>
                                                    Especialidades de Área
                                                </div>
                                                {isEditing && (
                                                    <select
                                                        className="input-field mb-0"
                                                        style={{ width: 'auto', fontSize: '0.7rem', padding: '2px 5px' }}
                                                        value=""
                                                        disabled={isSaving}
                                                        onChange={(e) => handleUpdateAssignment(e.target.value, course.id, 'add')}
                                                    >
                                                        <option value="">+ Vincular Área</option>
                                                        {areaPool.filter(ap => !courseTeachers.some(ct => ct.id === ap.id)).map(s => (
                                                            <option key={s.id} value={s.id}>{s.materiaEspecial || 'Área'}: {s.apellido}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                            {areaTeachers.length > 0 ? (
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem' }}>
                                                    {areaTeachers.map(at => (
                                                        <div key={at.id} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.5)', padding: '2px 5px', borderRadius: '4px' }}>
                                                            <div>
                                                                <span style={{ fontWeight: 700 }}>{at.materiaEspecial || 'Área'}</span>
                                                                <p style={{ margin: 0, fontSize: '0.75rem', color: '#166534' }}>{at.apellido}</p>
                                                            </div>
                                                            {isEditing && (
                                                                <button
                                                                    onClick={() => handleUpdateAssignment(at.id, course.id, 'remove')}
                                                                    style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ fontSize: '0.85rem', color: '#166534', fontStyle: 'italic' }}>Pendiente...</div>
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
