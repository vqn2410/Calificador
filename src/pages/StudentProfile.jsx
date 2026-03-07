import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Download, GraduationCap, ChevronLeft, Calendar } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function StudentProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);

    // Default mock fallback
    const mockStudent = {
        id: studentId,
        nombre: 'Pérez, Juan Miguel',
        dni: '45.123.456',
        curso: '2A-TM',
        asistencia: '95%',
        informes: [
            { trimestre: '1er Trimestre', materias: { 'Prácticas del Lenguaje': 'Bueno', 'Matemática': 'Regular', 'Ciencias Sociales': 'Muy bueno', 'Ciencias Naturales': 'Sobresaliente', 'Educación Física': 'Bueno', 'Inglés': '-', 'Artística': 'Muy bueno' }, general: 'Alumno con gran dedicación y empeño.' },
            { trimestre: '2do Trimestre', materias: { 'Prácticas del Lenguaje': '-', 'Matemática': '-', 'Ciencias Sociales': '-', 'Ciencias Naturales': '-', 'Educación Física': '-', 'Inglés': '-', 'Artística': '-' }, general: '-' }
        ]
    };

    useEffect(() => {
        async function fetchStudent() {
            try {
                const d = await getDoc(doc(db, 'estudiantes', studentId));
                if (d.exists()) {
                    setStudent({ id: d.id, ...d.data() });
                } else {
                    setStudent(mockStudent);
                }
            } catch (err) {
                setStudent(mockStudent);
            } finally {
                setLoading(false);
            }
        }
        fetchStudent();
    }, [studentId]);

    // View tracking for families
    useEffect(() => {
        if (!loading && student && currentUser?.roles?.includes('familia')) {
            const trackView = async () => {
                const isFirstTimeToday = true; // optional logic, but we can just blindly log it.
                if (isFirstTimeToday) {
                    try {
                        const studentRef = doc(db, 'estudiantes', studentId);
                        await updateDoc(studentRef, {
                            vistasFamilia: arrayUnion({
                                fecha: new Date().toISOString(),
                                usuario: currentUser.email || currentUser.dni
                            })
                        });
                    } catch (err) {
                        console.error('Error tracking view', err);
                    }
                }
            };
            trackView();
        }
    }, [student, currentUser, loading, studentId]);

    if (loading) return <div className="container" style={{ paddingTop: '100px' }}><h2>Cargando trayectoria...</h2></div>;

    const currentYear = new Date().getFullYear();
    const baseAreas = [
        'Prácticas del Lenguaje',
        'Matemática',
        'Ciencias Sociales',
        'Ciencias Naturales',
        'Educación Artística',
        'Educación Física',
        'Inglés'
    ];

    const evaluatedAreas = new Set();
    student?.informes?.forEach(inf => {
        if (inf.materias) {
            Object.keys(inf.materias).forEach(m => evaluatedAreas.add(m));
        }
    });

    let activeAreas = baseAreas.filter(a => evaluatedAreas.has(a));
    evaluatedAreas.forEach(a => {
        if (!activeAreas.includes(a)) activeAreas.push(a);
    });
    if (activeAreas.length === 0) activeAreas = baseAreas;

    const formatGrade = (grade) => {
        if (!grade) return '';
        const map = {
            'Sobresaliente': 'S',
            'Muy bueno': 'MB',
            'Bueno': 'B',
            'Regular': 'R',
            'Desaprobado': 'D'
        };
        return map[grade] || grade;
    };

    const getGrade = (trimName, area) => {
        const inf = student?.informes?.find(i => i.trimestre === trimName);
        return inf?.materias?.[area] || '';
    };

    const getInasistencias = (trimName) => {
        const inf = student?.informes?.find(i => i.trimestre === trimName);
        return inf?.inasistencias || '';
    };

    const getDiasHabiles = (trimName) => {
        const inf = student?.informes?.find(i => i.trimestre === trimName);
        return inf?.diasHabiles || '';
    };

    const getObservacion = (trimName) => {
        const inf = student?.informes?.find(i => i.trimestre === trimName);
        return inf?.general || '';
    };

    const getStatusColor = (calc) => {
        if (!calc) return 'var(--color-text-main)';
        if (['Sobresaliente', 'Muy bueno', 'Bueno', '8', '9', '10'].includes(calc)) return 'var(--color-success)';
        if (['Desaprobado', 'Regular', '1', '2', '3'].includes(calc)) return 'var(--color-error)';
        return 'var(--color-text-main)';
    };

    const getFinalGrade = (area) => {
        const manualFinal = getGrade('Informe Final', area);
        if (manualFinal) return manualFinal;

        const val1 = getGrade('1er Trimestre', area);
        const val2 = getGrade('2do Trimestre', area);
        const val3 = getGrade('3er Trimestre', area);
        const pe = getGrade('Período Extendido', area);

        if (!val1 && !val2 && !val3 && !pe) return '';

        let isConceptual = false;
        const conceptualScores = { 'Sobresaliente': 10, 'Muy bueno': 8, 'Bueno': 7, 'Regular': 5, 'Desaprobado': 3, 'S': 10, 'MB': 8, 'B': 7, 'R': 5, 'D': 3 };

        const parseVal = (val) => {
            if (!val) return null;
            if (conceptualScores[val]) {
                isConceptual = true;
                return conceptualScores[val];
            }
            const num = parseFloat(val);
            return isNaN(num) ? null : num;
        };

        const numToConceptual = (val) => {
            if (val >= 9.5) return 'Sobresaliente';
            if (val >= 8) return 'Muy bueno';
            if (val >= 7) return 'Bueno';
            if (val >= 4) return 'Regular';
            return 'Desaprobado';
        }

        const n1 = parseVal(val1);
        const n2 = parseVal(val2);
        const n3 = parseVal(val3);

        const sum = [n1, n2, n3].reduce((a, b) => a + (b || 0), 0);
        const count = [n1, n2, n3].filter(n => n !== null).length;

        let finalNum = count > 0 ? (sum / count) : null;
        let finalStatus = '';

        if (finalNum !== null) {
            const passed = finalNum >= 7;
            if (!passed && pe) {
                return pe; // Si desaprobó y hay nota de PE, queda la nota de PE
            }
            if (isConceptual) {
                finalStatus = numToConceptual(finalNum);
            } else {
                finalStatus = Math.round(finalNum).toString();
            }
        }

        return finalStatus;
    };

    const sumValues = (trims, getter) => trims.reduce((acc, trim) => {
        const val = parseFloat(getter(trim));
        return acc + (!isNaN(val) ? val : 0);
    }, 0);

    const getTrimestreFromDate = (isoDate) => {
        if (!isoDate) return '-';
        const m = new Date(isoDate).getMonth() + 1;
        if (m >= 3 && m <= 5) return '1er Trimestre';
        if (m >= 6 && m <= 8) return '2do Trimestre';
        if (m >= 9 && m <= 12) return '3er Trimestre';
        return 'Fuera de Término / Verano';
    };

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <div className="no-print mb-4 mt-2">
                <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                    <ChevronLeft size={16} /> Volver
                </button>
            </div>

            <div className="card mb-4 no-print" style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}>
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div style={{ backgroundColor: 'white', color: 'var(--color-primary)', padding: '1.5rem', borderRadius: 'var(--radius-full)' }}>
                            <User size={48} />
                        </div>
                        <div>
                            <h1 style={{ color: 'white', margin: 0 }}>{student?.nombre}</h1>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>DNI: {student?.dni}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                                    <GraduationCap size={12} style={{ marginRight: '4px' }} /> {student?.cursoId || student?.curso}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button className="btn" style={{ backgroundColor: 'white', color: 'var(--color-primary)' }} onClick={() => window.print()}>
                        <Download size={18} />
                        Boletín Digital Oficial
                    </button>
                </div>
            </div>

            <div className="boletin-oficial-container">
                <style>{`
                    .boletin-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 2rem;
                        font-family: sans-serif;
                    }
                    .bol-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 0.75rem;
                        text-align: center;
                    }
                    .bol-table th {
                        background-color: #9ca3af;
                        color: white;
                        border: 2px solid white;
                        padding: 8px 4px;
                        font-size: 0.7rem;
                        text-transform: uppercase;
                    }
                    .bol-table td {
                        background-color: #e5e7eb;
                        border: 2px solid white;
                        padding: 8px 4px;
                        font-weight: 600;
                        color: #374151;
                    }
                    .bol-table td.area-title {
                        text-align: left;
                        padding-left: 8px;
                        text-transform: uppercase;
                        font-size: 0.7rem;
                    }
                    .obs-block {
                        background-color: #e5e7eb;
                        border-radius: 4px;
                        min-height: 80px;
                        margin-bottom: 0.5rem;
                        position: relative;
                        padding: 1.5rem 1rem 1rem 1rem;
                        font-size: 0.8rem;
                        color: #374151;
                    }
                    .obs-badge {
                        background-color: white;
                        border-radius: 20px;
                        padding: 2px 12px;
                        font-size: 0.65rem;
                        font-weight: bold;
                        color: #6b7280;
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    }
                    .header-info {
                        color: #4b5563;
                        font-weight: bold;
                        font-size: 0.9rem;
                        margin-bottom: 1rem;
                        display: flex;
                        gap: 1rem;
                    }
                    .header-pill {
                        background-color: #9ca3af;
                        color: white;
                        border-radius: 20px;
                        padding: 4px 16px;
                        display: inline-block;
                        font-size: 1rem;
                        letter-spacing: 1px;
                    }
                    @media print {
                        .boletin-oficial-container { padding: 0; }
                        body { background-color: white !important; }
                        @page { margin: 1cm; size: landscape; }
                        .obs-block { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                        .bol-table th { background-color: #9ca3af !important; color: white !important; -webkit-print-color-adjust: exact; }
                        .bol-table td { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; }
                        .header-pill { background-color: #9ca3af !important; color: white !important; -webkit-print-color-adjust: exact; }
                    }
                    @media (max-width: 768px) {
                        .boletin-grid { grid-template-columns: 1fr; }
                    }
                `}</style>

                <div className="print-only mb-4 text-center">
                    <h2>BOLETÍN DE CALIFICACIONES - {student?.nombre}</h2>
                </div>

                <div className="boletin-grid">
                    {/* LEFT COLUMN: GRADES TABLE */}
                    <div>
                        <div className="header-info uppercase">
                            <span>CICLO LECTIVO 20{currentYear.toString().slice(-2)}</span>
                            <span>AÑO {(student?.cursoId || student?.curso || '')?.charAt(0)}°</span>
                            <span>SECCIÓN {(student?.cursoId || student?.curso || '')?.charAt(1)}</span>
                        </div>

                        <table className="bol-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '25%' }}>ÁREA CURRICULAR</th>
                                    <th>1° INFORME</th>
                                    <th>2° INFORME</th>
                                    <th>3° INFORME</th>
                                    <th>PERÍODO EXTENDIDO</th>
                                    <th>INFORME FINAL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeAreas.map(area => (
                                    <tr key={area}>
                                        <td className="area-title">{area}</td>
                                        <td style={{ color: getStatusColor(getGrade('1er Trimestre', area)) }}>{formatGrade(getGrade('1er Trimestre', area))}</td>
                                        <td style={{ color: getStatusColor(getGrade('2do Trimestre', area)) }}>{formatGrade(getGrade('2do Trimestre', area))}</td>
                                        <td style={{ color: getStatusColor(getGrade('3er Trimestre', area)) }}>{formatGrade(getGrade('3er Trimestre', area))}</td>
                                        <td style={{ color: getStatusColor(getGrade('Período Extendido', area)) }}>{formatGrade(getGrade('Período Extendido', area))}</td>
                                        <td style={{ color: getStatusColor(getFinalGrade(area)) }}>{formatGrade(getFinalGrade(area))}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <td className="area-title" style={{ marginTop: '4px' }}>DÍAS HÁBILES</td>
                                    <td>{getDiasHabiles('1er Trimestre')}</td>
                                    <td>{getDiasHabiles('2do Trimestre')}</td>
                                    <td>{getDiasHabiles('3er Trimestre')}</td>
                                    <td></td>
                                    <td style={{ fontWeight: 800 }}>{sumValues(trims, getDiasHabiles) || ''}</td>
                                </tr>
                                <tr>
                                    <td className="area-title">INASISTENCIAS</td>
                                    <td>{getInasistencias('1er Trimestre')}</td>
                                    <td>{getInasistencias('2do Trimestre')}</td>
                                    <td>{getInasistencias('3er Trimestre')}</td>
                                    <td></td>
                                    <td style={{ fontWeight: 800 }}>{sumValues(trims, getInasistencias) || ''}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* RIGHT COLUMN: OBSERVATIONS */}
                    <div>
                        <div className="header-info uppercase justify-between items-center" style={{ marginBottom: '1.2rem' }}>
                            <span>AÑO {(student?.cursoId || student?.curso || '')?.charAt(0)}° - 20{currentYear.toString().slice(-2)}</span>
                            <span className="header-pill">OBSERVACIONES</span>
                        </div>

                        <div className="obs-block">
                            <span className="obs-badge">1° INFORME</span>
                            {getObservacion('1er Trimestre')}
                        </div>

                        <div className="obs-block">
                            <span className="obs-badge">2° INFORME</span>
                            {getObservacion('2do Trimestre')}
                        </div>

                        <div className="obs-block">
                            <span className="obs-badge">3° INFORME</span>
                            {getObservacion('3er Trimestre')}
                        </div>

                        <div className="obs-block" style={{ minHeight: '60px' }}>
                            <span className="obs-badge">PERÍODO EXTENDIDO</span>
                        </div>

                        <div className="obs-block" style={{ minHeight: '60px' }}>
                            <span className="obs-badge">INFORME FINAL</span>
                        </div>
                    </div>
                </div>

                {/* CUADRO DE REFERENCIAS */}
                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '2px solid #e5e7eb', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#4b5563', fontWeight: 'bold', marginBottom: '0.5rem', textAlign: 'center' }}>
                        REFERENCIAS DE CALIFICACIÓN
                    </div>
                    <table className="bol-table" style={{ width: '100%', maxWidth: '600px', margin: '0 auto', fontSize: '0.7rem' }}>
                        <tbody>
                            <tr>
                                <td style={{ fontWeight: 'bold' }}>S</td><td style={{ textAlign: 'left', backgroundColor: 'white' }}>Sobresaliente</td>
                                <td style={{ fontWeight: 'bold' }}>MB</td><td style={{ textAlign: 'left', backgroundColor: 'white' }}>Muy bueno</td>
                                <td style={{ fontWeight: 'bold' }}>B</td><td style={{ textAlign: 'left', backgroundColor: 'white' }}>Bueno</td>
                                <td style={{ fontWeight: 'bold' }}>R</td><td style={{ textAlign: 'left', backgroundColor: 'white' }}>Regular</td>
                                <td style={{ fontWeight: 'bold' }}>D</td><td style={{ textAlign: 'left', backgroundColor: 'white' }}>Desaprobado</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* AUDITORIA DE VISTAS (SOLO PARA DOCENTES/DIRECTIVOS) */}
            {!currentUser?.roles?.includes('familia') && (
                <div className="card mt-4 no-print" style={{ border: '2px dashed var(--color-border)', backgroundColor: '#f9fafb' }}>
                    <h3 className="mb-4 flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                        <User size={20} />
                        Auditoría: Registro de Lectura (Familia)
                    </h3>

                    {student?.vistasFamilia && student.vistasFamilia.length > 0 ? (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#e5e7eb', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem' }}>Trimestre Estimado</th>
                                        <th style={{ padding: '0.75rem' }}>Fecha de Lectura</th>
                                        <th style={{ padding: '0.75rem' }}>Usuario (DNI / Correo)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[...student.vistasFamilia].reverse().map((vista, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #d1d5db' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{getTrimestreFromDate(vista.fecha)}</td>
                                            <td style={{ padding: '0.75rem' }}>{new Date(vista.fecha).toLocaleString()}</td>
                                            <td style={{ padding: '0.75rem' }}>{vista.usuario}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                            Ningún familiar ha abierto el boletín de este estudiante aún.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
