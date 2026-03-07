import { useState, useEffect, Fragment } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FileText, Download } from 'lucide-react';

export default function InformesConduccion() {
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [informeTipo, setInformeTipo] = useState('PIC'); // PIC, SIC, TIC
    const trimestreMap = {
        'PIC': '1er Trimestre',
        'SIC': '2do Trimestre',
        'TIC': '3er Trimestre'
    };

    useEffect(() => {
        const fetchAllEstudiantes = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, 'estudiantes'));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setEstudiantes(data);
            } catch (err) {
                console.error('Error fetching estudiantes', err);
            }
            setLoading(false);
        };
        fetchAllEstudiantes();
    }, []);

    const countGrades = (cursoId, area, range) => {
        // Find all students in this course
        const inCourse = estudiantes.filter(e => e.cursoId === cursoId);
        let count = 0;
        inCourse.forEach(st => {
            const inf = st.informes?.find(i => i.trimestre === trimestreMap[informeTipo]);
            const grade = inf?.materias?.[area];
            if (!grade) return;

            // Numeric grades for 2nd cycle (4th, 5th, 6th)
            const num = parseInt(grade);
            if (!isNaN(num)) {
                if (range === '10' && num === 10) count++;
                else if (range === '8a9' && (num === 8 || num === 9)) count++;
                else if (range === '7' && num === 7) count++;
                else if (range === '4a6' && (num >= 4 && num <= 6)) count++;
                else if (range === '1a3' && (num >= 1 && num <= 3)) count++;
            } else {
                // Conceptual grades (1st, 2nd, 3rd) -> Map to ranges for statistical equivalence if needed,
                // but usually the PIC report in the image specifies 2nd Cycle numeric format. 
                // We'll map "Sobresaliente"=10, "Muy bueno"=8a9, "Bueno"=7, "Regular"=4a6, "Desaprobado"=1a3
                if (range === '10' && grade === 'Sobresaliente') count++;
                else if (range === '8a9' && grade === 'Muy bueno') count++;
                else if (range === '7' && grade === 'Bueno') count++;
                else if (range === '4a6' && grade === 'Regular') count++;
                else if (range === '1a3' && grade === 'Desaprobado') count++;
            }
        });
        return count;
    };

    const getCourseTotal = (cursoId) => estudiantes.filter(e => e.cursoId === cursoId).length;

    const currentYear = new Date().getFullYear();
    const areas = ['Prácticas del Lenguaje', 'Matemática', 'Ciencias Sociales', 'Ciencias Naturales', 'Artística', 'Educación Física', 'Inglés'];
    const sections = ['A', 'B', 'C', 'D'];
    const years = [4, 5, 6]; // Mostramos 2do ciclo como en el ejemplo

    if (loading) return <div>Recopilando sábana de calificaciones de toda la escuela...</div>;

    return (
        <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
            <div className="flex justify-between items-center mb-4 no-print">
                <h2 className="flex items-center gap-2">
                    <FileText color="var(--color-primary)" />
                    Informes de Valoración
                </h2>
                <div className="flex gap-4">
                    <select className="input-field" value={informeTipo} onChange={e => setInformeTipo(e.target.value)} style={{ width: 'auto' }}>
                        <option value="PIC">PIC - Primer Informe</option>
                        <option value="SIC">SIC - Segundo Informe</option>
                        <option value="TIC">TIC - Tercer Informe</option>
                    </select>
                    <button className="btn btn-outline" onClick={() => window.print()}>
                        <Download size={18} /> Imprimir / PDF
                    </button>
                </div>
            </div>

            <div className="print-only">
                <h3 style={{ textAlign: 'center', textTransform: 'uppercase' }}>PRIMER / SEGUNDO / TERCER INFORME DE CALIFICACIONES DE 2° CICLO - {currentYear}</h3>
                <h4 style={{ textAlign: 'center' }}>{informeTipo} ({trimestreMap[informeTipo]})</h4>
            </div>

            <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'center' }}>
                <thead>
                    <tr style={{ backgroundColor: '#f0f0f0' }}>
                        <th rowSpan={2} style={{ border: '1px solid black', padding: '4px' }}>AÑO-SECC.</th>
                        <th rowSpan={2} style={{ border: '1px solid black', padding: '4px' }}>Total Alumnos</th>
                        {areas.map(a => (
                            <th colSpan={5} key={a} style={{ border: '1px solid black', padding: '4px' }}>{a}</th>
                        ))}
                    </tr>
                    <tr style={{ backgroundColor: '#e2e8f0' }}>
                        {areas.map(a => (
                            <Fragment key={`${a}-cols`}>
                                <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#e0f2fe' }}>10</th>
                                <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#e0f2fe' }}>8 a 9</th>
                                <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#e0f2fe' }}>7</th>
                                <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fed7aa' }}>4 a 6</th>
                                <th style={{ border: '1px solid black', padding: '2px', backgroundColor: '#fecaca' }}>1 a 3</th>
                            </Fragment>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {years.map(y => (
                        <Fragment key={y}>
                            {sections.map(s => {
                                const courseIdTM = `${y}${s}-TM`;
                                const courseIdTT = `${y}${s}-TT`;
                                return (
                                    <tr key={`${y}${s}`}>
                                        <td style={{ border: '1px solid black' }}>{y}° {s}</td>
                                        <td style={{ border: '1px solid black', fontWeight: 'bold' }}>
                                            {getCourseTotal(courseIdTM) + getCourseTotal(courseIdTT)}
                                        </td>
                                        {areas.map(a => (
                                            <Fragment key={`${y}${s}-${a}`}>
                                                <td style={{ border: '1px solid black' }}>{countGrades(courseIdTM, a, '10') + countGrades(courseIdTT, a, '10')}</td>
                                                <td style={{ border: '1px solid black' }}>{countGrades(courseIdTM, a, '8a9') + countGrades(courseIdTT, a, '8a9')}</td>
                                                <td style={{ border: '1px solid black' }}>{countGrades(courseIdTM, a, '7') + countGrades(courseIdTT, a, '7')}</td>
                                                <td style={{ border: '1px solid black' }}>{countGrades(courseIdTM, a, '4a6') + countGrades(courseIdTT, a, '4a6')}</td>
                                                <td style={{ border: '1px solid black' }}>{countGrades(courseIdTM, a, '1a3') + countGrades(courseIdTT, a, '1a3')}</td>
                                            </Fragment>
                                        ))}
                                    </tr>
                                )
                            })}
                            <tr style={{ backgroundColor: '#fef08a', fontWeight: 'bold' }}>
                                <td style={{ border: '1px solid black' }}>SUB {y}°</td>
                                <td style={{ border: '1px solid black' }}>-</td>
                                {areas.map(a => (
                                    <td colSpan={5} key={`sub-${a}`} style={{ border: '1px solid black' }}>...</td>
                                ))}
                            </tr>
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
