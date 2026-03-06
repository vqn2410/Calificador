import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, ClipboardList, PenTool, Save, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CourseDetails() {
    const { currentUser } = useAuth();
    const { courseId } = useParams();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [trimestre, setTrimestre] = useState('1er Trimestre');
    const [grades, setGrades] = useState({});
    const [generalComments, setGeneralComments] = useState({});

    // courseId is like "1A-TM"
    const grado = parseInt(courseId.charAt(0));
    const seccion = courseId.charAt(1);
    const isConceptual = grado <= 3;

    const baseSubjects = ['Prácticas del Lenguaje', 'Matemática', 'Ciencias Sociales', 'Ciencias Naturales', 'Educación Física'];
    let subjects = grado >= 4 ? [...baseSubjects, 'Inglés', 'Artística'] : [...baseSubjects, 'Artística'];

    const isStrictAreaTeacher = currentUser?.roles?.includes('docente_area') && (!currentUser.roles.includes('docente') && !currentUser.roles.includes('administrador'));

    if (isStrictAreaTeacher && currentUser?.materiaEspecial) {
        // Enforce strict visibility: Area teachers only see their own subjects
        subjects = [currentUser.materiaEspecial];
    }

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'estudiantes'), where('cursoId', '==', courseId));
            const querySnapshot = await getDocs(q);
            const stData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            setStudents(stData);

            // Populate local grades state based on current selected trimester
            const currentGrades = {};
            const currentComments = {};

            stData.forEach(st => {
                const informeActivo = st.informes?.find(inf => inf.trimestre === trimestre);
                if (informeActivo) {
                    currentGrades[st.id] = informeActivo.materias || {};
                    currentComments[st.id] = informeActivo.general || '';
                } else {
                    currentGrades[st.id] = {};
                    currentComments[st.id] = '';
                }
            });

            setGrades(currentGrades);
            setGeneralComments(currentComments);

        } catch (error) {
            console.error("Error fetching students:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, [courseId, trimestre]);

    const handleGradeChange = (studentId, subject, value) => {
        setGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [subject]: value
            }
        }));
    };

    const handleCommentChange = (studentId, value) => {
        setGeneralComments(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const handleSaveGrades = async () => {
        setSaving(true);
        try {
            const batchPromises = students.map(async (st) => {
                const studentRef = doc(db, 'estudiantes', st.id);

                // Keep the rest of the informes, remove old trimester if exists, add new
                let updatedInformes = st.informes ? [...st.informes] : [];
                updatedInformes = updatedInformes.filter(inf => inf.trimestre !== trimestre);

                updatedInformes.push({
                    trimestre: trimestre,
                    materias: grades[st.id] || {},
                    general: generalComments[st.id] || ''
                });

                await updateDoc(studentRef, {
                    informes: updatedInformes
                });
            });

            await Promise.all(batchPromises);
            alert('Calificaciones guardadas exitosamente en la base de datos.');

            // Refresh to get fresh snapshot data
            fetchStudents();
        } catch (err) {
            console.error("Error saving grades:", err);
            alert('Error al guardar las calificaciones.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="container"><h2>Cargando estudiantes...</h2></div>;

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <div className="mb-4 flex flex-wrap justify-between items-center gap-4 no-print" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <div>
                    <h1 className="flex items-center gap-2">
                        <PenTool color="var(--color-primary)" />
                        Asignación de Calificaciones
                    </h1>
                    <p style={{ margin: 0 }}>Curso: <strong>{grado}° "{seccion}"</strong> - Sistema: {isConceptual ? 'Conceptual' : 'Numérico'}</p>
                </div>

                <div className="flex gap-4">
                    <select
                        className="input-field mb-0"
                        value={trimestre}
                        onChange={(e) => setTrimestre(e.target.value)}
                        style={{ width: 'auto' }}
                    >
                        <option value="1er Trimestre">1er Trimestre</option>
                        <option value="2do Trimestre">2do Trimestre</option>
                        <option value="3er Trimestre">3er Trimestre</option>
                    </select>

                    <button className="btn btn-outline" onClick={() => window.print()}>
                        <ClipboardList size={18} />
                        Imprimir / Descargar
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '0' }}>
                <div className="print-only" style={{ border: '2px solid black', borderBottom: 'none', padding: '10px' }}>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4" style={{ flex: 1 }}>
                            <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                            <div>
                                <h2 style={{ margin: 0, textTransform: 'uppercase', fontWeight: 'bold' }}>ESCUELA PRIMARIA N°6</h2>
                                <h3 style={{ margin: 0, textTransform: 'uppercase' }}>RAFAEL OBLIGADO</h3>
                                <div style={{ marginTop: '5px', fontWeight: 'bold' }}>PLANILLA DE CALIFICACIONES - {trimestre.toUpperCase()}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', marginBottom: '5px' }}>CICLO LECTIVO<br />{new Date().getFullYear()}</div>
                            <div style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold' }}>AÑO: {grado}° {seccion} | {courseId.split('-')[1] === 'TM' ? 'TM' : courseId.split('-')[1] === 'TT' ? 'TT' : courseId.split('-')[1]}</div>
                        </div>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
                                <th className="print-only vertical-text" style={{ padding: '1rem', width: '40px', textAlign: 'center', verticalAlign: 'middle' }}>N° DE ORDEN</th>
                                <th style={{ padding: '1rem', minWidth: '200px', textAlign: 'center', verticalAlign: 'middle' }}>APELLIDO Y NOMBRE</th>
                                {subjects.map((sub, i) => (
                                    <th key={i} className="vertical-text" style={{ padding: '1rem', width: '40px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>{sub.toUpperCase()}</th>
                                ))}
                                <th className="print-only vertical-text" style={{ padding: '1rem', width: '40px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>DÍAS HÁBILES</th>
                                <th className="print-only vertical-text" style={{ padding: '1rem', width: '40px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>INASISTENCIAS</th>
                                <th style={{ padding: '1rem', minWidth: '200px', textAlign: 'center', verticalAlign: 'middle' }}>OBSERVACIONES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={subjects.length + 2} style={{ padding: '2rem', textAlign: 'center' }}>
                                        No hay estudiantes matriculados en este curso todavía.
                                    </td>
                                </tr>
                            ) : students.map((st, index) => (
                                <tr key={st.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td className="print-only" style={{ padding: '1rem', textAlign: 'center' }}>{index + 1}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <Link to={`/estudiantes/${st.id}`} className="no-print flex items-center gap-2 mb-1" style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                                            <User size={16} />
                                            {st.nombre}
                                        </Link>
                                        <div className="no-print" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>DNI: {st.dni}</div>
                                        <div className="print-only" style={{ fontWeight: 600, textTransform: 'uppercase' }}>{st.nombre.toUpperCase()}</div>
                                    </td>
                                    {subjects.map((sub, i) => (
                                        <td key={i} style={{ padding: '1rem' }}>
                                            {isConceptual ? (
                                                <select
                                                    className="input-field"
                                                    style={{ padding: '0.25rem 0.5rem', minWidth: '120px', cursor: (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub) ? 'not-allowed' : 'pointer' }}
                                                    value={grades[st.id]?.[sub] || ''}
                                                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                                                    disabled={isStrictAreaTeacher && currentUser?.materiaEspecial !== sub}
                                                >
                                                    <option value="" disabled>-</option>
                                                    <option value="Sobresaliente">Sobresaliente</option>
                                                    <option value="Muy bueno">Muy bueno</option>
                                                    <option value="Bueno">Bueno</option>
                                                    <option value="Regular">Regular</option>
                                                    <option value="Desaprobado">Desaprobado</option>
                                                </select>
                                            ) : (
                                                <input
                                                    className="input-field"
                                                    type="number" min="1" max="10"
                                                    placeholder="-"
                                                    style={{ width: '60px', padding: '0.25rem 0.5rem', cursor: (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub) ? 'not-allowed' : 'text' }}
                                                    value={grades[st.id]?.[sub] || ''}
                                                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                                                    disabled={isStrictAreaTeacher && currentUser?.materiaEspecial !== sub}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td className="print-only"></td>
                                    <td className="print-only"></td>
                                    <td style={{ padding: '1rem' }}>
                                        <div className="flex items-center gap-2">
                                            <input
                                                className="input-field flex-1"
                                                placeholder="Apreciación (opcional)..."
                                                style={{ minWidth: '200px', padding: '0.4rem', cursor: isStrictAreaTeacher ? 'not-allowed' : 'text' }}
                                                value={generalComments[st.id] || ''}
                                                onChange={(e) => handleCommentChange(st.id, e.target.value)}
                                                disabled={isStrictAreaTeacher}
                                            />
                                            {isStrictAreaTeacher && <Lock className="no-print" size={16} color="var(--color-text-muted)" title="Comentarios generales reservados al docente titular." />}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {isConceptual && (
                    <div className="print-only">
                        <table className="print-table" style={{ width: '100%', marginTop: '0', borderTop: 'none', textAlign: 'center' }}>
                            <tbody>
                                <tr style={{ backgroundColor: '#f3f4f6' }}>
                                    <td colSpan={subjects.length + 2} style={{ padding: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                                        CALIFICACIÓN: S (SOBRESALIENTE) MB (MUY BUENO) B (BUENO) R (REGULAR) D (DESAPROBADO)
                                    </td>
                                </tr>
                                <tr>
                                    <td rowSpan={2} style={{ width: '250px', fontWeight: 'bold', fontSize: '0.8rem' }}>CANTIDAD DE ESTUDIANTES<br />CON CALIFICACIÓN</td>
                                    {subjects.map(s => <td key={s} className="vertical-text" style={{ padding: '4px', fontSize: '0.7rem' }}>{s.toUpperCase()}</td>)}
                                    <td rowSpan={7} style={{ verticalAlign: 'bottom', paddingBottom: '20px', minWidth: '200px' }}>FIRMA DE LA DOCENTE</td>
                                </tr>
                                <tr></tr>
                                {['Sobresaliente', 'Muy bueno', 'Bueno', 'Regular', 'Desaprobado'].map(val => (
                                    <tr key={val}>
                                        <td style={{ fontSize: '0.8rem', fontWeight: 600, color: val === 'Sobresaliente' ? 'blue' : val === 'Desaprobado' ? 'red' : 'black' }}>
                                            {val.toUpperCase()}
                                        </td>
                                        {subjects.map(sub => {
                                            const count = students.filter(st => grades[st.id]?.[sub] === val).length;
                                            return <td key={sub} style={{ fontSize: '0.8rem' }}>{count}</td>;
                                        })}
                                    </tr>
                                ))}
                                <tr>
                                    <td style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>TOTAL DE ESTUDIANTES</td>
                                    {subjects.map(sub => (
                                        <td key={sub} style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{students.length}</td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {students.length > 0 && (
                    <div className="mt-6 flex justify-end">
                        <button
                            className="btn btn-secondary flex items-center gap-2"
                            onClick={handleSaveGrades}
                            disabled={saving}
                        >
                            <Save size={18} />
                            {saving ? 'Guardando en BD...' : 'Guardar Calificaciones Trimestrales'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
