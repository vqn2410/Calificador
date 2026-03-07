import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Eye, Download, Search, Filter } from 'lucide-react';

export default function AuditViews() {
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCourse, setFilterCourse] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        const fetchEstudiantes = async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, 'estudiantes'));
                const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                // Sort by name
                data.sort((a, b) => a.nombre.localeCompare(b.nombre));
                setEstudiantes(data);
            } catch (err) {
                console.error("Error fetching audit data:", err);
            }
            setLoading(false);
        };
        fetchEstudiantes();
    }, []);

    const getFirstViewForTrim = (vistas = [], trimNum) => {
        if (!vistas || vistas.length === 0) return null;

        const filtered = vistas.filter(v => {
            const date = new Date(v.fecha);
            if (date.getFullYear() !== currentYear) return false;
            const month = date.getMonth() + 1;
            if (trimNum === 1) return month >= 3 && month <= 5;
            if (trimNum === 2) return month >= 6 && month <= 8;
            if (trimNum === 3) return month >= 9 && month <= 12;
            return false;
        });

        if (filtered.length === 0) return null;
        return filtered.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))[0];
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

    const filteredStudents = estudiantes.filter(st => {
        const matchesName = st.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || st.dni?.includes(searchTerm);
        const matchesCourse = !filterCourse || st.cursoId === filterCourse;
        return matchesName && matchesCourse;
    });

    const ALL_COURSES = [];
    [1, 2, 3, 4, 5, 6].forEach(g => ['A', 'B', 'C', 'D'].forEach(s => {
        ALL_COURSES.push(`${g}${s}-TM`);
        ALL_COURSES.push(`${g}${s}-TT`);
    }));

    if (loading) return <div className="container" style={{ paddingTop: '50px' }}><h2>Cargando registro de visualizaciones...</h2></div>;

    const exportToCSV = () => {
        let csv = "ESTUDIANTE;DNI;CURSO;1ER INFORME - VISTO POR;1ER INFORME - PARENTESCO;1ER INFORME - FECHA;2DO INFORME - VISTO POR;2DO INFORME - PARENTESCO;2DO INFORME - FECHA;3ER INFORME - VISTO POR;3ER INFORME - PARENTESCO;3ER INFORME - FECHA\n";

        filteredStudents.forEach(st => {
            const v1 = getFirstViewForTrim(st.vistasFamilia, 1);
            const v2 = getFirstViewForTrim(st.vistasFamilia, 2);
            const v3 = getFirstViewForTrim(st.vistasFamilia, 3);

            csv += `${st.nombre};${st.dni || ''};${st.cursoId || ''};` +
                `${v1?.nombre || v1?.usuario || ''};${v1?.parentesco || ''};${formatDateTime(v1?.fecha)};` +
                `${v2?.nombre || v2?.usuario || ''};${v2?.parentesco || ''};${formatDateTime(v2?.fecha)};` +
                `${v3?.nombre || v3?.usuario || ''};${v3?.parentesco || ''};${formatDateTime(v3?.fecha)}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `auditoria_vistas_${currentYear}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="container" style={{ maxWidth: '1400px' }}>
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="flex items-center gap-2">
                    <Eye color="var(--color-primary)" />
                    Registro de Visualizaciones {currentYear}
                </h1>
                <div className="flex gap-4">
                    <button className="btn btn-outline" onClick={exportToCSV}>
                        <Download size={18} /> Exportar CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        Imprimir Reporte
                    </button>
                </div>
            </div>

            <div className="card mb-6 no-print flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1 text-sm font-bold">
                        <Search size={14} /> Buscar Estudiante
                    </div>
                    <input
                        className="input-field"
                        placeholder="Nombre o DNI..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="min-w-[150px]">
                    <div className="flex items-center gap-2 mb-1 text-sm font-bold">
                        <Filter size={14} /> Filtrar por Curso
                    </div>
                    <select className="input-field" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                        <option value="">Todos los cursos</option>
                        {ALL_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="print-only mb-6" style={{ textAlign: 'center' }}>
                <h2 style={{ textTransform: 'uppercase' }}>Registro de Visualizaciones de Boletines Digitales</h2>
                <p>E.P N° 6 "Rafael Obligado" - Ciclo Lectivo {currentYear}</p>
                {filterCourse && <p style={{ fontWeight: 'bold' }}>CURSO: {filterCourse}</p>}
            </div>

            <div className="table-responsive">
                <table className="print-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: 700 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#044b7f', color: 'white' }}>
                            <th rowSpan={2} style={{ border: '1px solid #ddd', padding: '10px' }}>ESTUDIANTE</th>
                            <th rowSpan={2} style={{ border: '1px solid #ddd', padding: '10px' }}>DNI</th>
                            <th rowSpan={2} style={{ border: '1px solid #ddd', padding: '10px' }}>CURSO</th>
                            <th colSpan={3} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#033b66' }}>PRIMER INFORME</th>
                            <th colSpan={3} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#033b66' }}>SEGUNDO INFORME</th>
                            <th colSpan={3} style={{ border: '1px solid #ddd', padding: '10px', backgroundColor: '#033b66' }}>TERCER INFORME</th>
                        </tr>
                        <tr style={{ backgroundColor: '#f8fafc', color: '#1e293b' }}>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Visto por</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>PARENTESCO</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fecha</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Visto por</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>PARENTESCO</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fecha</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Visto por</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>PARENTESCO</th>
                            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Fecha</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStudents.map(st => {
                            const v1 = getFirstViewForTrim(st.vistasFamilia, 1);
                            const v2 = getFirstViewForTrim(st.vistasFamilia, 2);
                            const v3 = getFirstViewForTrim(st.vistasFamilia, 3);

                            return (
                                <tr key={st.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{st.nombre.toUpperCase()}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{st.dni}</td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>{st.cursoId}</td>

                                    {/* 1st Info */}
                                    <td style={{ border: '1px solid #ddd', padding: '8px', color: v1 ? '#1e293b' : '#94a3b8' }}>
                                        {v1?.nombre || v1?.usuario || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v1 ? '#1e293b' : '#94a3b8' }}>
                                        {v1?.parentesco || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v1 ? '#1e293b' : '#94a3b8' }}>
                                        {formatDateTime(v1?.fecha)}
                                    </td>

                                    {/* 2nd Info */}
                                    <td style={{ border: '1px solid #ddd', padding: '8px', color: v2 ? '#1e293b' : '#94a3b8' }}>
                                        {v2?.nombre || v2?.usuario || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v2 ? '#1e293b' : '#94a3b8' }}>
                                        {v2?.parentesco || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v2 ? '#1e293b' : '#94a3b8' }}>
                                        {formatDateTime(v2?.fecha)}
                                    </td>

                                    {/* 3rd Info */}
                                    <td style={{ border: '1px solid #ddd', padding: '8px', color: v3 ? '#1e293b' : '#94a3b8' }}>
                                        {v3?.nombre || v3?.usuario || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v3 ? '#1e293b' : '#94a3b8' }}>
                                        {v3?.parentesco || '-'}
                                    </td>
                                    <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center', color: v3 ? '#1e293b' : '#94a3b8' }}>
                                        {formatDateTime(v3?.fecha)}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredStudents.length === 0 && (
                            <tr>
                                <td colSpan={12} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                    No se encontraron estudiantes para los filtros seleccionados.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <p className="no-print mt-4" style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                * El sistema registra la primera vez que un familiar accede al boletín en cada período de tiempo (Trimestres).
            </p>
        </div>
    );
}
