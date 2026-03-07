import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Download, GraduationCap, ChevronLeft, Calendar } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function StudentProfile() {
    const { studentId } = useParams();
    const navigate = useNavigate();
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

    if (loading) return <div className="container"><h2>Cargando trayectoria...</h2></div>;

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <button onClick={() => navigate(-1)} className="btn btn-outline mb-4" style={{ padding: '0.5rem 1rem' }}>
                <ChevronLeft size={16} /> Volver al Curso
            </button>

            <div className="card mb-4" style={{ backgroundColor: 'var(--color-primary)', color: 'white', border: 'none' }}>
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                        <div style={{ backgroundColor: 'white', color: 'var(--color-primary)', padding: '1.5rem', borderRadius: 'var(--radius-full)' }}>
                            <User size={48} />
                        </div>
                        <div>
                            <h1 style={{ color: 'white', margin: 0 }}>{student.nombre}</h1>
                            <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)' }}>DNI: {student.dni}</p>
                            <div className="flex gap-2 mt-2">
                                <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}>
                                    <GraduationCap size={12} style={{ marginRight: '4px' }} /> {student.curso}
                                </span>
                                <span className="badge" style={{ backgroundColor: 'var(--color-success)', color: 'white' }}>
                                    Asistencia: {student.asistencia}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button className="btn" style={{ backgroundColor: 'white', color: 'var(--color-primary)' }} onClick={() => window.print()}>
                        <Download size={18} />
                        Boletín Digital Completo
                    </button>
                </div>
            </div>

            <h2 className="mb-4">Trayectoria Educativa - Ciclo Lectivo</h2>

            <div className="grid" style={{ gap: '2rem' }}>
                {student.informes?.map((inf, idx) => (
                    <div className="card" key={idx}>
                        <h3 className="flex items-center gap-2 mb-4" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                            <Calendar size={18} color="var(--color-primary)" />
                            {inf.trimestre}
                        </h3>

                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                            {Object.entries(inf.materias).map(([mat, calc]) => (
                                <div key={mat} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                                    <span style={{ fontWeight: 500 }}>{mat}</span>
                                    <span style={{ fontWeight: 700, color: ['Sobresaliente', 'Muy bueno', 'Bueno', '8', '9', '10'].includes(calc) ? 'var(--color-success)' : ['Desaprobado', 'Regular', '1', '2', '3'].includes(calc) ? 'var(--color-error)' : 'var(--color-text-main)' }}>{calc}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ padding: '1rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                            <div className="flex justify-between items-center mb-2">
                                <h4 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>Informe Apreciativo Docente</h4>
                                {inf.inasistencias && (
                                    <span className="badge badge-warning" style={{ fontSize: '0.75rem' }}>Inasistencias: {inf.inasistencias}</span>
                                )}
                            </div>
                            <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--color-text-main)' }}>"{inf.general}"</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
