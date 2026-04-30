import { Fragment, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, ClipboardList, PenTool, Save, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCourseDetails, getCourseLabel } from '../config/constants';

export default function CourseDetails() {
    const { currentUser, activeRole } = useAuth();
    const { courseId } = useParams();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [allowEdit, setAllowEdit] = useState(true);

    const isControlUser = ['administrador', 'equipo_conduccion'].includes(activeRole);
    const hasAccess = isControlUser || (currentUser?.cursosAsignados || []).includes(courseId);

    const [trimestre, setTrimestre] = useState('1er Trimestre');
    const [grades, setGrades] = useState({});
    const [generalComments, setGeneralComments] = useState({});
    const [inasistencias, setInasistencias] = useState({});
    const [diasHabiles, setDiasHabiles] = useState({});

    const courseDetails = getCourseDetails(courseId);
    if (!courseDetails && hasAccess) {
        return <div className="container"><h2>Error: Curso no encontrado en la configuración oficial.</h2></div>;
    }

    const { grado, seccion, tipo } = courseDetails || { grado: 1, seccion: 'A', tipo: 'Conceptual' };
    const isConceptual = tipo === 'Conceptual';

    const baseSubjects = ['Prácticas del Lenguaje', 'Matemática', 'Ciencias Sociales', 'Ciencias Naturales', 'Educación Física'];
    let subjects = grado >= 4 ? [...baseSubjects, 'Inglés', 'Artística'] : [...baseSubjects, 'Artística'];

    const isStrictAreaTeacher = activeRole === 'docente_area';

    const teacherFull = currentUser?.displayName || 'Docente';

    let teacherRoleStr = 'Docente';
    if (activeRole === 'equipo_conduccion') teacherRoleStr = 'Equipo de Conducción';
    else if (activeRole === 'administrador') teacherRoleStr = 'Administrador';
    else if (activeRole === 'docente_area') teacherRoleStr = `Docente de Área: ${currentUser?.materiaEspecial || 'Especialista'}`;

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

    const formatGrade = (grade) => {
        if (!grade) return '-';
        const map = {
            'Sobresaliente': 'S',
            'Muy bueno': 'MB',
            'Bueno': 'B',
            'Regular': 'R',
            'Desaprobado': 'D'
        };
        return map[grade] || grade;
    };

    const renderGradeInput = (st, sub) => {
        if (isConceptual) {
            return (
                <select
                    className="input-field sheet-input"
                    style={{ minWidth: '45px', padding: '0.3rem !important', fontSize: '0.8rem', cursor: (!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)) ? 'not-allowed' : 'pointer' }}
                    value={grades[st.id]?.[sub] || ''}
                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                    disabled={!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)}
                >
                    <option value="">-</option>
                    <option value="Sobresaliente">S</option>
                    <option value="Muy bueno">MB</option>
                    <option value="Bueno">B</option>
                    <option value="Regular">R</option>
                    <option value="Desaprobado">D</option>
                </select>
            );
        } else {
            return (
                <input
                    className="input-field sheet-input"
                    type="number" min="1" max="10"
                    placeholder="-"
                    style={{ width: '40px', padding: '0.3rem !important', fontSize: '0.8rem', cursor: (!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)) ? 'not-allowed' : 'text' }}
                    value={grades[st.id]?.[sub] || ''}
                    onChange={(e) => handleGradeChange(st.id, sub, e.target.value)}
                    disabled={!allowEdit || (isStrictAreaTeacher && currentUser?.materiaEspecial !== sub)}
                />
            );
        }
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

    if (!hasAccess) {
        return (
            <div className="container" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <Lock size={64} color="var(--color-error)" style={{ marginBottom: '1rem' }} />
                <h1>Acceso No Permitido</h1>
                <p>No tienes permisos para ver o editar las calificaciones de este curso (<b>{getCourseLabel(courseId)}</b>).
                    Si crees que esto es un error, por favor contacta al equipo directivo.</p>
                <Link to="/panel/cursos" className="btn btn-primary mt-4">Ver Mis Cursos Asignados</Link>
            </div>
        );
    }

    if (loading) return <div className="container"><h2>Cargando estudiantes...</h2></div>;

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                <div>
                    <h1 className="flex items-center gap-2" style={{ fontSize: '1.25rem' }}>
                        <PenTool size={20} color="var(--color-primary)" />
                        Carga de Notas
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Curso: <strong>{grado}° "{seccion}"</strong></p>
                    {!allowEdit && (
                        <div className="badge badge-warning" style={{ marginTop: '0.4rem', fontSize: '0.65rem' }}>
                            <Lock size={12} /> CARGA BLOQUEADA
                        </div>
                    )}
                </div>

                <div className="w-full md:w-auto flex flex-wrap gap-2">
                    <select
                        className="input-field mb-0 flex-1"
                        value={trimestre}
                        onChange={(e) => setTrimestre(e.target.value)}
                        style={{ width: 'auto', fontSize: '0.85rem', padding: '0.5rem' }}
                    >
                        <option value="1er Trimestre">1er Trim.</option>
                        <option value="2do Trimestre">2do Trim.</option>
                        <option value="3er Trimestre">3er Trim.</option>
                        <option value="Período Extendido">Extendido</option>
                        <option value="Informe Final">Final</option>
                    </select>

                    <button className="btn btn-outline flex-1" onClick={() => window.print()} style={{ fontSize: '0.85rem', padding: '0.5rem' }}>
                        <ClipboardList size={16} />
                        Planilla
                    </button>
                </div>
            </div>

            <style>{`
                @page {
                    margin: 1cm;
                }

                /* Specific named page for wide reports like "Carga de Notas" - OFICIO */
                @page landscape-page {
                    size: legal landscape;
                    margin: 0;
                }

                .landscape-print {
                    page: landscape-page;
                    width: 100%;
                    padding: 0.5cm;
                }

                @media print {
                    body { margin: 0; }
                    .container { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                    
                    .print-table {
                        table-layout: fixed;
                        width: 100% !important;
                        border: 1px solid black !important;
                    }
                    .print-table th, .print-table td {
                        padding: 1px !important;
                        font-size: 0.6rem !important;
                        overflow: hidden;
                        border: 1px solid #000 !important;
                    }
                    .vertical-text {
                        height: 90px !important;
                    }
                    .student-name-cell {
                        width: 180px !important;
                        font-size: 0.75rem !important;
                        white-space: nowrap !important;
                        overflow: visible !important;
                        text-overflow: clip !important;
                    }
                    .sheet-input {
                        width: 100% !important;
                        min-width: unset !important;
                        padding: 0 !important;
                        font-size: 0.6rem !important;
                        height: auto !important;
                        border: none !important;
                    }
                    .obs-column {
                        width: auto !important;
                    }
                }

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

            <div id="printable-area" className="card landscape-print" style={{ padding: '0' }}>
                <div className="print-only" style={{ border: '2px solid black', borderBottom: 'none', padding: '10px' }}>
                    <div style={{ textAlign: 'center', fontSize: '0.65rem', marginBottom: '5px', fontWeight: 'bold', borderBottom: '1px solid black', paddingBottom: '3px' }}>
                        Sistema de Calificaciones · E.P N° 6 "Rafael Obligado"
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4" style={{ flex: 1 }}>
                            <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                            <div>
                                <h2 style={{ margin: 0, textTransform: 'uppercase', fontWeight: 'bold', fontSize: '1rem' }}>ESCUELA PRIMARIA N°6</h2>
                                <h3 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.85rem' }}>RAFAEL OBLIGADO</h3>
                                <div style={{ marginTop: '5px', fontWeight: 'bold', fontSize: '0.85rem' }}>PLANILLA DE CALIFICACIONES - {trimestre.toUpperCase()}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', marginBottom: '5px', fontSize: '0.8rem' }}>CICLO LECTIVO<br />{new Date().getFullYear()}</div>
                            <div style={{ border: '1px solid black', padding: '5px', fontWeight: 'bold', fontSize: '0.8rem' }}>AÑO: {grado}° {seccion} | {courseId.split('-')[1] === 'TM' ? 'TM' : courseId.split('-')[1] === 'TT' ? 'TT' : courseId.split('-')[1]}</div>
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-background)', borderBottom: '2px solid var(--color-border)' }}>
                                <th className="print-only" rowSpan={trimestre === 'Informe Final' ? 2 : 1} style={{ padding: '0.5rem', width: '30px', textAlign: 'center', verticalAlign: 'middle' }}>N°</th>
                                <th className="student-name-cell" rowSpan={trimestre === 'Informe Final' ? 2 : 1} style={{ padding: '0.5rem', minWidth: '130px', textAlign: 'left', verticalAlign: 'middle', fontSize: '0.85rem' }}>ESTUDIANTE</th>
                                {subjects.map((sub, i) => (
                                    <th key={i} colSpan={trimestre === 'Informe Final' ? 5 : 1} style={{ padding: '0.5rem', borderLeft: '1px solid var(--color-border)', textAlign: 'center', fontSize: '0.75rem' }}>
                                        {sub.toUpperCase()}
                                    </th>
                                ))}
                                {!isStrictAreaTeacher && (
                                    <>
                                        <th className="vertical-text" rowSpan={trimestre === 'Informe Final' ? 2 : 1} style={{ padding: '0.5rem', width: '35px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle', fontSize: '0.7rem' }}>DÍAS</th>
                                        <th className="vertical-text" rowSpan={trimestre === 'Informe Final' ? 2 : 1} style={{ padding: '0.5rem', width: '35px', whiteSpace: 'normal', textAlign: 'center', verticalAlign: 'middle', fontSize: '0.7rem' }}>INAS.</th>
                                    </>
                                )}
                                <th className="obs-column no-print" rowSpan={trimestre === 'Informe Final' ? 2 : 1} style={{ padding: '0.5rem', minWidth: '150px', textAlign: 'left', verticalAlign: 'middle', fontSize: '0.85rem' }}>OBSERVACIONES</th>
                            </tr>
                            {trimestre === 'Informe Final' && (
                                <tr style={{ backgroundColor: 'var(--color-background)', fontSize: '0.65rem' }}>
                                    {subjects.map((sub, i) => (
                                        <Fragment key={i}>
                                            <th style={{ padding: '2px', borderLeft: '1px solid var(--color-border)', width: '20px' }}>1T</th>
                                            <th style={{ padding: '2px', width: '20px' }}>2T</th>
                                            <th style={{ padding: '2px', width: '20px' }}>3T</th>
                                            <th style={{ padding: '2px', width: '20px' }}>EX</th>
                                            <th style={{ padding: '2px', backgroundColor: '#f1f5f9', width: '20px' }}>FIN</th>
                                        </Fragment>
                                    ))}
                                </tr>
                            )}
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
                                    <td className="print-only" style={{ padding: '0.4rem', textAlign: 'center', fontSize: '0.8rem' }}>{index + 1}</td>
                                    <td className="student-name-cell" style={{ padding: '0.4rem' }}>
                                        <Link to={`/estudiantes/${st.id}`} className="no-print flex items-center gap-1 mb-1" style={{ fontWeight: 600, color: 'var(--color-primary)', fontSize: '0.85rem' }}>
                                            <User size={14} />
                                            {st.nombre}
                                        </Link>
                                        <div className="no-print" style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>DNI: {st.dni}</div>
                                        <div className="print-only" style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem' }}>{st.nombre.toUpperCase()}</div>
                                    </td>
                                    {subjects.map((sub, i) => (
                                        <Fragment key={i}>
                                            {trimestre === 'Informe Final' ? (
                                                <>
                                                    <td style={{ padding: '2px', textAlign: 'center', fontSize: '0.7rem', borderLeft: '1px solid var(--color-border)' }}>
                                                        {formatGrade(st.informes?.find(inf => inf.trimestre === '1er Trimestre')?.materias?.[sub])}
                                                    </td>
                                                    <td style={{ padding: '2px', textAlign: 'center', fontSize: '0.7rem' }}>
                                                        {formatGrade(st.informes?.find(inf => inf.trimestre === '2do Trimestre')?.materias?.[sub])}
                                                    </td>
                                                    <td style={{ padding: '2px', textAlign: 'center', fontSize: '0.7rem' }}>
                                                        {formatGrade(st.informes?.find(inf => inf.trimestre === '3er Trimestre')?.materias?.[sub])}
                                                    </td>
                                                    <td style={{ padding: '2px', textAlign: 'center', fontSize: '0.7rem' }}>
                                                        {formatGrade(st.informes?.find(inf => inf.trimestre === 'Período Extendido')?.materias?.[sub])}
                                                    </td>
                                                    <td style={{ padding: '2px', textAlign: 'center', backgroundColor: '#f1f5f9' }}>
                                                        {renderGradeInput(st, sub)}
                                                    </td>
                                                </>
                                            ) : (
                                                <td style={{ padding: '0.4rem' }}>
                                                    {renderGradeInput(st, sub)}
                                                </td>
                                            )}
                                        </Fragment>
                                    ))}
                                    {!isStrictAreaTeacher && (
                                        <>
                                            <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                                                <input
                                                    className="input-field mb-0 text-center"
                                                    style={{ width: '40px', padding: '0.3rem', fontSize: '0.8rem', cursor: (!allowEdit || isStrictAreaTeacher) ? 'not-allowed' : 'text' }}
                                                    type="number" min="0"
                                                    value={diasHabiles[st.id] || ''}
                                                    onChange={(e) => handleDiasHabilesChange(st.id, e.target.value)}
                                                    disabled={!allowEdit || isStrictAreaTeacher}
                                                />
                                            </td>
                                            <td style={{ padding: '0.4rem', textAlign: 'center' }}>
                                                <input
                                                    className="input-field mb-0 text-center"
                                                    style={{ width: '40px', padding: '0.3rem', fontSize: '0.8rem', cursor: (!allowEdit || isStrictAreaTeacher) ? 'not-allowed' : 'text' }}
                                                    type="number" min="0" step="0.5"
                                                    value={inasistencias[st.id] || ''}
                                                    onChange={(e) => handleInasistenciasChange(st.id, e.target.value)}
                                                    disabled={!allowEdit || isStrictAreaTeacher}
                                                />
                                            </td>
                                        </>
                                    )}
                                    <td className="no-print" style={{ padding: '1rem' }}>
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

                <div className="print-only" style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.65rem', fontWeight: 600 }}>
                    <div><strong>1T:</strong> 1er Trimestre</div>
                    <div><strong>2T:</strong> 2do Trimestre</div>
                    <div><strong>3T:</strong> 3er Trimestre</div>
                    <div><strong>EX:</strong> Período Extendido</div>
                    <div><strong>FIN:</strong> Calificación Final</div>
                </div>

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
