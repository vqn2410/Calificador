import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, ClipboardList, PenTool, Save, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CourseDetails() {
    const { currentUser } = useAuth();
    const { courseId } = useParams();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowEdit, setAllowEdit] = useState(true);

    const [trimestre, setTrimestre] = useState('1er Trimestre');
    const [grades, setGrades] = useState({});
    const [generalComments, setGeneralComments] = useState({});
    const [inasistencias, setInasistencias] = useState({});
    const [diasHabiles, setDiasHabiles] = useState({});

    // courseId is like "1A-TM"
    const grado = parseInt(courseId.charAt(0));
    const seccion = courseId.charAt(1);
    const isConceptual = grado <= 3;

    const baseSubjects = ['Prácticas del Lenguaje', 'Matemática', 'Ciencias Sociales', 'Ciencias Naturales', 'Educación Física'];
    let subjects = grado >= 4 ? [...baseSubjects, 'Inglés', 'Artística'] : [...baseSubjects, 'Artística'];

    const isStrictAreaTeacher = currentUser?.roles?.includes('docente_area') && (!currentUser.roles.includes('docente') && !currentUser.roles.includes('administrador'));

    const teacherFull = currentUser?.displayName || `${currentUser?.nombre || ''} ${currentUser?.apellido || ''}`.trim() || 'Docente';
    const teacherRoleStr = currentUser?.roles?.includes('equipo_conduccion')
        ? 'Equipo de Conducción'
        : (currentUser?.roles?.includes('docente_area') ? `Docente de Área: ${currentUser.materiaEspecial}` : 'Docente');
    const signature = `${teacherFull} - ${teacherRoleStr}`;

    if (isStrictAreaTeacher && currentUser?.materiaEspecial) {
        // Enforce strict visibility: Area teachers only see their own subjects
        subjects = [currentUser.materiaEspecial];
    }

    const fetchStudents = async () => {
        setLoading(true);
        try {
            // Fetch Global Config
            const configRef = doc(db, 'config', 'appSettings');
            const configSnap = await getDoc(configRef);
            const canEditGlobal = configSnap.exists() ? configSnap.data().allowTeacherDataEntry : true;

            const isControlUser = currentUser?.roles?.some(r => ['administrador', 'equipo_conduccion'].includes(r));
            setAllowEdit(canEditGlobal || isControlUser);

            const q = query(collection(db, 'estudiantes'), where('cursoId', '==', courseId));
            const querySnapshot = await getDocs(q);
            const stData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            setStudents(stData);

            const currentGrades = {};
            const currentComments = {};
            const currentInasistencias = {};
            const currentDiasHabiles = {};

            stData.forEach(st => {
                const informeActivo = st.informes?.find(inf => inf.trimestre === trimestre);
                if (informeActivo) {
                    currentGrades[st.id] = informeActivo.materias || {};
                    currentComments[st.id] = informeActivo.general || '';
                    currentInasistencias[st.id] = informeActivo.inasistencias || '';
                    currentDiasHabiles[st.id] = informeActivo.diasHabiles || '';
                } else {
                    currentGrades[st.id] = {};
                    currentComments[st.id] = '';
                    currentInasistencias[st.id] = '';
                    currentDiasHabiles[st.id] = '';
                }
            });

            setGrades(currentGrades);
            setGeneralComments(currentComments);
            setInasistencias(currentInasistencias);
            setDiasHabiles(currentDiasHabiles);

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
        setGeneralComments(prev => {
            const currentVal = prev[studentId] || {};
            const asObj = typeof currentVal === 'string' ? { legacy: { text: currentVal, signature: 'Observación General' } } : currentVal;

            return {
                ...prev,
                [studentId]: {
                    ...asObj,
                    [currentUser.uid]: { text: value, signature: signature, timestamp: new Date().toISOString() }
                }
            };
        });
    };

    const handleInasistenciasChange = (studentId, value) => {
        setInasistencias(prev => ({
            ...prev,
            [studentId]: value
        }));
    };

    const handleDiasHabilesChange = (studentId, value) => {
        setDiasHabiles(prev => ({
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
                    general: generalComments[st.id] || '',
                    inasistencias: inasistencias[st.id] || '',
                    diasHabiles: diasHabiles[st.id] || ''
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
                    {!allowEdit && (
                        <div className="badge badge-warning" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={14} /> MODO LECTURA: La carga de notas está bloqueada por administración.
                        </div>
                    )}
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
                        <option value="Período Extendido">Período Extendido</option>
                        <option value="Informe Final">Informe Final</option>
                    </select>

                    <button className="btn btn-outline" onClick={() => window.print()}>
                        <ClipboardList size={18} />
                        Descargar Planilla
                    </button>
                </div>
            </div>

            <style>{`
                .sheet-input {
                    text-align: center !important;
                    padding: 0.5rem !important;
                    font-weight: 700;
                }
                .obs-field {
                    min-width: 250px;
                    font-size: 0.85rem;
                    padding: 0.6rem;
                    border: 1px dashed var(--color-primary);
                    background: transparent;
                    width: 100%;
                }
                .other-obs {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 4px;
                    padding: 8px;
                    margin-bottom: 8px;
                    font-size: 0.75rem;
                    color: #475569;
                }
                .obs-author {
                    font-weight: 700;
                    color: var(--color-primary);
                    display: block;
                    margin-top: 4px;
                }
            `}</style>

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
                                <th className="vertical-text" style={{ padding: '1rem', width: '40px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>DÍAS HÁBILES</th>
                                <th className="vertical-text" style={{ padding: '1rem', width: '40px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle' }}>INASISTENCIAS</th>
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
                                                    className="input-field sheet-input"
                                                    style={{ minWidth: '80px', cursor: (!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)) ? 'not-allowed' : 'pointer' }}
                                                    value={grades[st.id]?.[sub] || ''}
                                                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                                                    disabled={!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)}
                                                >
                                                    <option value="" disabled>-</option>
                                                    <option value="Sobresaliente">S</option>
                                                    <option value="Muy bueno">MB</option>
                                                    <option value="Bueno">B</option>
                                                    <option value="Regular">R</option>
                                                    <option value="Desaprobado">D</option>
                                                </select>
                                            ) : (
                                                <input
                                                    className="input-field sheet-input"
                                                    type="number" min="1" max="10"
                                                    placeholder="-"
                                                    style={{ width: '60px', cursor: (!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)) ? 'not-allowed' : 'text' }}
                                                    value={grades[st.id]?.[sub] || ''}
                                                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                                                    disabled={!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <input
                                            className="input-field mb-0 text-center"
                                            style={{ width: '50px', padding: '0.25rem', cursor: !allowEdit ? 'not-allowed' : 'text' }}
                                            type="number" min="0"
                                            value={diasHabiles[st.id] || ''}
                                            onChange={(e) => handleDiasHabilesChange(st.id, e.target.value)}
                                            disabled={!allowEdit}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <input
                                            className="input-field mb-0 text-center"
                                            style={{ width: '50px', padding: '0.25rem', cursor: !allowEdit ? 'not-allowed' : 'text' }}
                                            type="number" min="0" step="0.5"
                                            value={inasistencias[st.id] || ''}
                                            onChange={(e) => handleInasistenciasChange(st.id, e.target.value)}
                                            disabled={!allowEdit}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div className="flex flex-col gap-2">
                                            {/* Existing observations from other teachers */}
                                            {Object.entries(generalComments[st.id] || {}).map(([uid, obs]) => (
                                                uid !== currentUser?.uid && obs?.text && (
                                                    <div key={uid} className="other-obs">
                                                        "{obs.text}"
                                                        <span className="obs-author">-{obs.signature}</span>
                                                    </div>
                                                )
                                            ))}

                                            {/* Current teacher observation input */}
                                            <input
                                                className="input-field obs-field"
                                                placeholder={allowEdit ? `Tu comentario como ${teacherRoleStr}...` : "Edición bloqueada"}
                                                value={generalComments[st.id]?.[currentUser?.uid]?.text || (typeof generalComments[st.id] === 'string' ? generalComments[st.id] : '')}
                                                onChange={(e) => handleCommentChange(st.id, e.target.value)}
                                                disabled={!allowEdit}
                                                style={{ cursor: !allowEdit ? 'not-allowed' : 'text' }}
                                            />
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
                    <div className="mt-6 flex justify-end no-print">
                        <button
                            className="btn btn-secondary flex items-center gap-2"
                            onClick={handleSaveGrades}
                            disabled={saving || !allowEdit}
                        >
                            <Save size={18} />
                            {saving ? 'Guardando en BD...' : !allowEdit ? 'Carga Bloqueada' : 'Guardar Calificaciones Trimestrales'}
                        </button>
                    </div>
                )}

                {isConceptual && (
                    <div style={{ marginTop: '1rem', borderTop: '2px solid #e2e8f0', paddingTop: '1rem' }}>
                        <div style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                            REFERENCIAS DE CALIFICACIÓN
                        </div>
                        <table style={{ width: '100%', maxWidth: '600px', margin: '0 auto', fontSize: '0.75rem', borderCollapse: 'collapse', textAlign: 'center' }}>
                            <tbody>
                                <tr>
                                    <td style={{ fontWeight: 'bold', padding: '4px', border: '1px solid #e2e8f0' }}>S</td><td style={{ textAlign: 'left', padding: '4px', border: '1px solid #e2e8f0' }}>Sobresaliente</td>
                                    <td style={{ fontWeight: 'bold', padding: '4px', border: '1px solid #e2e8f0' }}>MB</td><td style={{ textAlign: 'left', padding: '4px', border: '1px solid #e2e8f0' }}>Muy bueno</td>
                                    <td style={{ fontWeight: 'bold', padding: '4px', border: '1px solid #e2e8f0' }}>B</td><td style={{ textAlign: 'left', padding: '4px', border: '1px solid #e2e8f0' }}>Bueno</td>
                                    <td style={{ fontWeight: 'bold', padding: '4px', border: '1px solid #e2e8f0' }}>R</td><td style={{ textAlign: 'left', padding: '4px', border: '1px solid #e2e8f0' }}>Regular</td>
                                    <td style={{ fontWeight: 'bold', padding: '4px', border: '1px solid #e2e8f0' }}>D</td><td style={{ textAlign: 'left', padding: '4px', border: '1px solid #e2e8f0' }}>Desaprobado</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
