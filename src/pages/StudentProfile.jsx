import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Download, GraduationCap, ChevronLeft, Calendar, Users } from 'lucide-react';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { getCourseLabel } from '../config/constants';

export default function StudentProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [student, setStudent] = useState(null);
    const [familiares, setFamiliares] = useState([]);
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
                    const studentData = { id: d.id, ...d.data() };
                    setStudent(studentData);

                    // Cross-link with Familiars
                    const resps = studentData.responsables || (studentData.famFiliacion ? [studentData.famFiliacion] : []);
                    if (resps.length > 0) {
                        try {
                            const foundFamiliars = [];
                            for (const r of resps) {
                                const qFam = query(collection(db, 'docentes'), where('dni', '==', r.dni));
                                const snapFam = await getDocs(qFam);
                                if (!snapFam.empty) {
                                    foundFamiliars.push({ ...snapFam.docs[0].data(), parentesco: r.parentesco });
                                }
                            }
                            setFamiliares(foundFamiliars);
                        } catch (errFam) {
                            console.error("Error fetching familiar cross-links:", errFam);
                        }
                    }
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

    // View tracking for families (non-blocking)
    useEffect(() => {
        if (!loading && student && currentUser?.roles?.includes('familia')) {
            const trackView = async () => {
                try {
                    const studentRef = doc(db, 'estudiantes', studentId);

                    const userIdentifier = currentUser.email || currentUser.dni || currentUser.uid || 'Desconocido';

                    // Normalize DNI searching for parentesco (with and without dots)
                    const cleanDni = String(student.dni).replace(/[\.\s-]/g, '');
                    const dottedDni = cleanDni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    const parentesco = currentUser[`parentesco_${cleanDni}`] ||
                        currentUser[`parentesco_${dottedDni}`] ||
                        currentUser[`parentesco_${student.dni}`] ||
                        'Familiar';

                    const nombre = currentUser.displayName || 'Usuario';

                    await updateDoc(studentRef, {
                        vistasFamilia: arrayUnion({
                            fecha: new Date().toISOString(),
                            usuario: userIdentifier,
                            nombre: nombre === 'Usuario' ? userIdentifier : nombre,
                            parentesco: parentesco
                        })
                    });
                } catch (err) {
                    console.warn('Silent tracking failure:', err.message);
                }
            };
            trackView();
        }
    }, [studentId, loading, !!student, !!currentUser]);

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
        if (inf?.materias) {
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

    const getGrade = (trimName, mName) => {
        const inf = (student?.informes || []).find(i => i && i.trimestre === trimName);
        return inf?.materias?.[mName] || '';
    };

    const getInasistencias = (trimName) => {
        const inf = (student?.informes || []).find(i => i && i.trimestre === trimName);
        return inf?.inasistencias || '';
    };

    const getDiasHabiles = (trimName) => {
        const inf = (student?.informes || []).find(i => i && i.trimestre === trimName);
        return inf?.diasHabiles || '';
    };

    const trims = ['1er Trimestre', '2do Trimestre', '3er Trimestre'];

    const sumValues = (trimList, getter) => {
        const total = trimList.reduce((acc, t) => {
            const val = parseFloat(getter(t));
            return isNaN(val) ? acc : acc + val;
        }, 0);
        return total > 0 ? total : '';
    };

    const getObservacion = (trimName) => {
        const inf = (student?.informes || []).find(i => i && i.trimestre === trimName);
        const obs = inf?.general;
        if (!obs) return null;

        if (typeof obs === 'string') return <p style={{ margin: 0 }}>{obs}</p>;

        return Object.entries(obs).map(([uid, data]) => (
            <div key={uid} style={{ marginBottom: '0.75rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.75rem', lineHeight: '1.2' }}>"{data.text}"</p>
                <div style={{ marginTop: '3px', textAlign: 'right' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1e293b', display: 'block' }}>
                        {data.signature}
                    </span>
                </div>
            </div>
        ));
    };

    const getStatusColor = (calc) => {
        if (!calc) return 'var(--color-text-main)';
        if (['Sobresaliente', 'Muy bueno', 'Bueno', '8', '9', '10', 'S', 'MB', 'B'].includes(calc)) return 'var(--color-success)';
        if (['Desaprobado', 'Regular', '1', '2', '3', 'D', 'R'].includes(calc)) return 'var(--color-error)';
        return 'var(--color-text-main)';
    };

    const getFinalGrade = (area) => {
        const manualFinal = getGrade('Informe Final', area);
        if (manualFinal) return manualFinal;

        const val1 = getGrade('1er Trimestre', area);
        const val2 = getGrade('2do Trimestre', area);
        const val3 = getGrade('3er Trimestre', area);
        const pe = getGrade('Período Extendido', area);

        if (!val1 || !val2 || !val3) return '';

        let isConceptual = false;
        const concepts = ['Sobresaliente', 'Muy bueno', 'Bueno', 'Regular', 'Desaprobado'];
        if (concepts.includes(val1) || concepts.includes(val2) || concepts.includes(val3)) {
            isConceptual = true;
        }

        if (isConceptual) {
            if (pe) return pe;
            const values = [val1, val2, val3].map(v => concepts.indexOf(v));
            if (values.includes(4)) return 'Desaprobado';
            if (values.includes(3)) return 'Regular';
            return 'Bueno';
        } else {
            if (pe) return pe;
            const avg = (parseFloat(val1) + parseFloat(val2) + parseFloat(val3)) / 3;
            return avg >= 7 ? Math.round(avg).toString() : 'Regular';
        }
    };

    const getTrimestreFromDate = (isoDate) => {
        if (!isoDate) return '-';
        const m = new Date(isoDate).getMonth() + 1;
        if (m >= 3 && m <= 5) return '1er Trimestre';
        if (m >= 6 && m <= 8) return '2do Trimestre';
        if (m >= 9 && m <= 12) return '3er Trimestre';
        return 'Fuera de Término / Verano';
    };

    const formatDateTime = (isoDate) => {
        if (!isoDate) return '-';
        const d = new Date(isoDate);
        const day = d.getDate();
        const month = d.getMonth() + 1;
        const year = d.getFullYear();
        const hours = d.getHours().toString().padStart(2, '0');
        const minutes = d.getMinutes().toString().padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}hs`;
    };

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            {/* VOLVER (NO-PRINT) */}
            <div className="no-print mb-4 mt-2">
                <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ padding: '0.5rem 1rem' }}>
                    <ChevronLeft size={16} /> Volver
                </button>
            </div>

            {/* HEADER CARD (NO-PRINT) */}
            <div className="card mb-4 no-print" style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', padding: '1rem' }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: 'white', color: 'var(--color-primary)', padding: '0.75rem', borderRadius: 'var(--radius-full)' }}>
                            <User size={24} />
                        </div>
                        <div>
                            <h1 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>{student?.nombre}</h1>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem' }}>DNI: {student?.dni} | Fecha Nac.: {student?.fechaNacimiento || '-'}</p>
                        </div>
                    </div>

                    <button className="btn w-full md:w-auto" style={{ backgroundColor: 'white', color: 'var(--color-primary)', fontSize: '0.9rem', padding: '0.6rem 1rem' }} onClick={() => window.print()}>
                        <Download size={18} />
                        Boletín Oficial
                    </button>
                </div>
            </div>

            {/* BOLETIN OFICIAL CONTAINER (Doble Faz: Hoja 1 Calificaciones, Hoja 2 Observaciones) */}
            <div className="boletin-oficial-container">
                <style>{`
                    .boletin-page {
                        display: flex;
                        flex-direction: column;
                        gap: 0.8rem;
                        font-family: sans-serif;
                    }
                    .bol-table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 0.8rem;
                        text-align: center;
                    }
                    .bol-table th {
                        background-color: #f1f5f9;
                        color: #1e293b;
                        border: 1px solid #cbd5e1;
                        padding: 6px 4px;
                        font-size: 0.7rem;
                        text-transform: uppercase;
                    }
                    .bol-table td {
                        background-color: white;
                        border: 1px solid #cbd5e1;
                        padding: 5px 4px;
                        font-weight: 600;
                        color: #334155;
                    }
                    .bol-table td.area-title {
                        text-align: left;
                        padding-left: 8px;
                        text-transform: uppercase;
                        font-size: 0.65rem;
                        width: 40%;
                    }
                    .obs-container {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 0.75rem;
                    }
                    .obs-block {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 4px;
                        min-height: 60px;
                        position: relative;
                        padding: 1.4rem 0.6rem 0.5rem 0.6rem;
                        font-size: 0.75rem;
                        color: #1e293b;
                        line-height: 1.2;
                    }
                    .obs-badge {
                        background-color: #64748b;
                        color: white;
                        border-radius: 0 0 4px 0;
                        padding: 1px 8px;
                        font-size: 0.55rem;
                        font-weight: bold;
                        position: absolute;
                        top: 0;
                        left: 0;
                    }
                    .header-info {
                        color: #1e293b;
                        font-weight: bold;
                        font-size: 0.8rem;
                        margin-bottom: 0.3rem;
                        display: flex;
                        justify-content: space-between;
                        border-bottom: 2px solid #1e293b;
                        padding-bottom: 3px;
                    }
                    @media screen {
                        .boletin-page {
                            background-color: white;
                            padding: 2.5rem;
                            margin-bottom: 2rem;
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            box-shadow: var(--shadow-sm);
                            max-width: 800px;
                            margin-left: auto;
                            margin-right: auto;
                        }
                    }
                    @media print {
                        .boletin-oficial-container { padding: 0 !important; margin: 0 !important; }
                        body { background-color: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        @page { 
                            margin: 1cm; 
                            size: A4 portrait; 
                        }
                        .no-print { display: none !important; }
                        .obs-block { background-color: #fff !important; border: 1px solid #e2e8f0 !important; }
                        .bol-table th { background-color: #f1f5f9 !important; }
                        .boletin-page {
                            padding: 0;
                            margin: 0;
                            box-shadow: none;
                            border: none;
                            page-break-after: always;
                            break-after: page;
                        }
                        .boletin-page:last-child {
                            page-break-after: avoid;
                            break-after: avoid;
                        }
                    }
                    @media (max-width: 768px) {
                        .obs-container { grid-template-columns: 1fr; }
                        .boletin-page { padding: 1rem; border-radius: 0; box-shadow: none; border: none; margin-bottom: 1rem; }
                        .bol-table { font-size: 0.7rem; }
                        .bol-table th { padding: 4px 2px; font-size: 0.6rem; }
                        .bol-table td { padding: 4px 2px; }
                        .bol-table td.area-title { font-size: 0.6rem; padding-left: 4px; }
                        .header-info { flex-direction: column; gap: 2px; font-size: 0.7rem; }
                        .print-only img { width: 40px !important; height: 40px !important; }
                    }
                `}</style>

                {/* HOJA 1: CALIFICACIONES */}
                <div className="boletin-page">
                    {/* MEMBRETE INSTITUCIONAL (PRINT ONLY) */}
                    <div className="print-only" style={{ marginBottom: '0.8rem', borderBottom: '3px double #000', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 400, textTransform: 'uppercase' }}>Dirección General de Cultura y Educación</h3>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Escuela Primaria N°6 "Rafael Obligado"</h3>
                                <p style={{ margin: '1px 0 0 0', fontSize: '0.7rem', fontStyle: 'italic' }}>Provincia de Buenos Aires - Ciclo Lectivo {currentYear}</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ border: '1px solid #000', padding: '5px 10px', fontSize: '0.85rem', fontWeight: 800 }}>
                                    {getCourseLabel(student?.cursoId || student?.curso)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="print-only" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, border: '2px solid #000', display: 'inline-block', padding: '4px 20px' }}>
                            BOLETÍN DE TRAYECTORIA ESCOLAR
                        </h1>
                    </div>

                    {/* ENCABEZADO DE DATOS */}
                    <div>
                        <div className="header-info">
                            <span>ALUMNO: {student?.nombre.toUpperCase()}</span>
                            <span>DNI: {student?.dni}</span>
                            <span>NAC.: {student?.fechaNacimiento || '-'}</span>
                            <span>ESTADO: REGULAR</span>
                        </div>

                        {/* TABLA DE CALIFICACIONES */}
                        <table className="bol-table">
                            <thead>
                                <tr>
                                    <th>ÁREAS CURRICULARES</th>
                                    <th>1° INF</th>
                                    <th>2° INF</th>
                                    <th>3° INF</th>
                                    <th>P. EXT</th>
                                    <th>FINAL</th>
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
                                        <td style={{ color: getStatusColor(getFinalGrade(area)), fontWeight: 800 }}>{formatGrade(getFinalGrade(area))}</td>
                                    </tr>
                                ))}
                                <tr style={{ borderTop: '2px solid #1e293b' }}>
                                    <td className="area-title" style={{ fontWeight: 800 }}>DÍAS HÁBILES</td>
                                    <td>{getDiasHabiles('1er Trimestre')}</td>
                                    <td>{getDiasHabiles('2do Trimestre')}</td>
                                    <td>{getDiasHabiles('3er Trimestre')}</td>
                                    <td></td>
                                    <td style={{ fontWeight: 800 }}>{sumValues(trims, getDiasHabiles)}</td>
                                </tr>
                                <tr>
                                    <td className="area-title" style={{ fontWeight: 800 }}>INASISTENCIAS</td>
                                    <td>{getInasistencias('1er Trimestre')}</td>
                                    <td>{getInasistencias('2do Trimestre')}</td>
                                    <td>{getInasistencias('3er Trimestre')}</td>
                                    <td></td>
                                    <td style={{ fontWeight: 800 }}>{sumValues(trims, getInasistencias)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* REFERENCIAS */}
                    <div style={{ marginTop: '5px' }}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 800, marginBottom: '2px', textAlign: 'center' }}>Simbología: S (Sobresaliente), MB (Muy Bueno), B (Bueno), R (Regular), D (Desaprobado)</div>
                    </div>
                </div>

                {/* HOJA 2: OBSERVACIONES Y FIRMAS */}
                <div className="boletin-page">
                    {/* MEMBRETE INSTITUCIONAL (REPETIDO) */}
                    <div className="print-only" style={{ marginBottom: '0.8rem', borderBottom: '3px double #000', paddingBottom: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                            <img src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" alt="Logo Escuela" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
                            <div style={{ flex: 1 }}>
                                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 400, textTransform: 'uppercase' }}>Dirección General de Cultura y Educación</h3>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Escuela Primaria N°6 "Rafael Obligado"</h3>
                                <p style={{ margin: '1px 0 0 0', fontSize: '0.7rem', fontStyle: 'italic' }}>Provincia de Buenos Aires - Ciclo Lectivo {currentYear}</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ border: '1px solid #000', padding: '5px 10px', fontSize: '0.85rem', fontWeight: 800 }}>
                                    {getCourseLabel(student?.cursoId || student?.curso)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="print-only" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                        <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, border: '2px solid #000', display: 'inline-block', padding: '4px 20px' }}>
                            OBSERVACIONES PEDAGÓGICAS
                        </h1>
                    </div>

                    <div className="header-info">
                        <span>ALUMNO: {student?.nombre.toUpperCase()}</span>
                        <span>DNI: {student?.dni}</span>
                        <span>ESTADO: REGULAR</span>
                    </div>

                    {/* SECCIÓN DE OBSERVACIONES */}
                    <div>
                        <div className="obs-container">
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
                            <div className="obs-block">
                                <span className="obs-badge">P. EXTENDIDO / FINAL</span>
                                {getObservacion('Período Extendido') || getObservacion('Informe Final')}
                            </div>
                        </div>
                    </div>

                    {/* FIRMAS / NOTIFICACIÓN DIGITAL (MOVIDO A HOJA 2) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: 'auto' }}>
                        {['1er Trimestre', '2do Trimestre', '3er Trimestre'].map(trim => {
                            const firstView = [...(student.vistasFamilia || [])]
                                .filter(v => getTrimestreFromDate(v.fecha) === trim)
                                .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];

                            return (
                                <div key={trim} style={{ border: '1px solid #94a3b8', padding: '8px', minHeight: '90px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.6rem', textAlign: 'center', borderBottom: '1px solid #94a3b8', paddingBottom: '3px', marginBottom: '5px' }}>
                                        {trim.toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {firstView ? (
                                            <div style={{ textAlign: 'center', fontSize: '0.55rem', padding: '0 2px' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--color-primary)', borderBottom: '1px solid #e2e8f0', marginBottom: '2px' }}>NOTIFICACIÓN DIGITAL</div>
                                                <div style={{ marginTop: '2px', fontWeight: 700 }}>{firstView.nombre || 'RESPONSABLE'}</div>
                                                <div style={{ fontSize: '0.45rem' }}>{firstView.usuario}</div>
                                                <div style={{ fontSize: '0.45rem', fontStyle: 'italic' }}>{formatDateTime(firstView.fecha)}</div>
                                            </div>
                                        ) : (
                                            <div style={{ borderBottom: '1px dotted #94a3b8', width: '80%', marginTop: '15px' }}></div>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.5rem', textAlign: 'center', fontWeight: 600, marginTop: '4px' }}>
                                        Firma Tutor/Padre/Madre
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* AUDITORIA Y VINCULACION (NO-PRINT) */}
            {!currentUser?.roles?.includes('familia') && (
                <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '3rem' }}>
                    {/* Tarjeta de Vinculación Familiar */}
                    <div className="card" style={{ border: '2px dashed var(--color-primary)' }}>
                        <h3 className="flex items-center gap-2 mb-4"><Users size={20} color="var(--color-primary)" /> Responsables Familiares</h3>
                        {familiares.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                {familiares.map((f, i) => (
                                    <div key={i} style={{ fontSize: '0.9rem', paddingBottom: i < familiares.length - 1 ? '1rem' : 0, borderBottom: i < familiares.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem' }}>
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>Nombre:</span>
                                            <span>{f.displayName || `${f.nombre || ''} ${f.apellido || ''}`.trim()}</span>

                                            <span style={{ fontWeight: 700, color: '#64748b' }}>Vínculo:</span>
                                            <span>{f.parentesco || 'Familiar'}</span>

                                            <span style={{ fontWeight: 700, color: '#64748b' }}>DNI:</span>
                                            <span>{f.dni}</span>

                                            <span style={{ fontWeight: 700, color: '#64748b' }}>Email:</span>
                                            <span style={{ color: 'var(--color-primary)' }}>{f.email}</span>

                                            <span style={{ fontWeight: 700, color: '#64748b' }}>Teléfono:</span>
                                            <span>{f.telefono || 'No registrado'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : student?.responsables?.length > 0 || student?.famFiliacion?.dni ? (
                            <div style={{ padding: '1rem', backgroundColor: '#fff7ed', borderRadius: '8px', border: '1px solid #ffedd5' }}>
                                <p style={{ margin: 0, color: '#c2410c', fontSize: '0.85rem' }}>
                                    <strong>Aviso:</strong> Hay responsables registrados pero sus cuentas aún no han sido activadas o los datos no coinciden.
                                </p>
                            </div>
                        ) : (
                            <p style={{ fontStyle: 'italic', color: '#64748b' }}>No hay información de vinculación familiar registrada.</p>
                        )}
                    </div>

                    {/* Historial de Lectura */}
                    <div className="card" style={{ border: '2px dashed #cbd5e1' }}>
                        <h3 className="flex items-center gap-2 mb-4"><Calendar size={20} /> Historial de Lectura Familiar</h3>
                        {student?.vistasFamilia?.length > 0 ? (
                            <table style={{ width: '100%', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>
                                        <th style={{ padding: '8px' }}>Informe</th>
                                        <th style={{ padding: '8px' }}>Fecha y Hora</th>
                                        <th style={{ padding: '8px' }}>Familiar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const firstViewsMap = {};
                                        [...(student.vistasFamilia || [])]
                                            .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
                                            .forEach(v => {
                                                const t = getTrimestreFromDate(v.fecha);
                                                if (!firstViewsMap[t]) firstViewsMap[t] = v;
                                            });
                                        const order = ['1er Trimestre', '2do Trimestre', '3er Trimestre', 'Fuera de Término / Verano'];
                                        return order.filter(t => firstViewsMap[t]).map(t => {
                                            const v = firstViewsMap[t];
                                            return (
                                                <tr key={t} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '8px', fontWeight: 600 }}>{t}</td>
                                                    <td style={{ padding: '8px' }}>{formatDateTime(v.fecha)}</td>
                                                    <td style={{ padding: '8px' }}>
                                                        <div style={{ fontWeight: 600 }}>{v.nombre || 'Visto por familiar'}</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                                            {v.parentesco || 'Responsable'} - ID: {v.usuario}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ fontStyle: 'italic', color: '#64748b' }}>Sin visualizaciones registradas aún.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
