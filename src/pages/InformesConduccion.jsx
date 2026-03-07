import { useState, useEffect, Fragment } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Download, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/* ─── Materias ──────────────────────────────────────────── */
const AREAS_1 = [
    { key: 'Prácticas del Lenguaje', short: 'Lengua' },
    { key: 'Matemática', short: 'Matemática' },
    { key: 'Ciencias Sociales', short: 'Cs. Sociales' },
    { key: 'Ciencias Naturales', short: 'Cs. Naturales' },
    { key: 'Educación Artística', short: 'Ed. Artística' },
    { key: 'Educación Física', short: 'Ed. Física' },
];
const AREAS_2 = [...AREAS_1, { key: 'Inglés', short: 'Inglés' }];

const CONCEPTUAL = [
    { key: 'S', label: 'S', pass: true, match: v => v === 'Sobresaliente', color: '#22c55e' },
    { key: 'MB', label: 'MB', pass: true, match: v => v === 'Muy bueno', color: '#86efac' },
    { key: 'B', label: 'B', pass: true, match: v => v === 'Bueno', color: '#93c5fd' },
    { key: 'R', label: 'R', pass: false, match: v => v === 'Regular', color: '#fdba74' },
    { key: 'D', label: 'D', pass: false, match: v => v === 'Desaprobado', color: '#f87171' },
];
const NUMERIC = [
    { key: '10', label: '10', pass: true, match: v => parseInt(v) === 10, color: '#22c55e' },
    { key: '8a9', label: '8a9', pass: true, match: v => { const n = parseInt(v); return n >= 8 && n <= 9; }, color: '#86efac' },
    { key: '7', label: '7', pass: true, match: v => parseInt(v) === 7, color: '#93c5fd' },
    { key: '4a6', label: '4a6', pass: false, match: v => { const n = parseInt(v); return n >= 4 && n <= 6; }, color: '#fdba74' },
    { key: '1a3', label: '1a3', pass: false, match: v => { const n = parseInt(v); return n >= 1 && n <= 3; }, color: '#f87171' },
];

const SECTIONS = ['A', 'B', 'C', 'D'];
const TRIMS = { PIC: '1er Trimestre', SIC: '2do Trimestre', TIC: '3er Trimestre' };

/* ─── Helpers ───────────────────────────────────────────── */
function gradeVal(student, areaKey, trimestre) {
    const inf = (student.informes || []).find(i => i?.trimestre === trimestre);
    return inf?.materias?.[areaKey] || null;
}

function countRange(students, areaKey, rangeFn, trimestre) {
    return students.filter(st => {
        const v = gradeVal(st, areaKey, trimestre);
        return v && rangeFn(v);
    }).length;
}

function failedAreasCount(student, areas, ranges, trimestre) {
    return areas.filter(a => {
        const v = gradeVal(student, a.key, trimestre);
        if (!v) return false;
        const r = ranges.find(r => r.match(v));
        return r && !r.pass;
    }).length;
}

/* ─── Styles ────────────────────────────────────────────── */
const CELL_W = 28;
const thBase = {
    border: '1px solid #555',
    padding: '3px 2px',
    textAlign: 'center',
    fontSize: '0.6rem',
    whiteSpace: 'nowrap',
    width: CELL_W,
    minWidth: CELL_W,
};
const tdBase = {
    border: '1px solid #555',
    padding: '3px 2px',
    textAlign: 'center',
    fontSize: '0.68rem',
    width: CELL_W,
    minWidth: CELL_W,
};
const SUB_BG = '#fef08a';
const TOT_BG = '#f97316';
const HDR_BG = '#1e3a5f';
const HDR_AREA_BG = '#2563eb';

export default function InformesConduccion() {
    const [estudiantes, setEstudiantes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [informeTipo, setInformeTipo] = useState('PIC');
    const [ciclo, setCiclo] = useState('segundo');
    const [showCharts, setShowCharts] = useState(false);

    // Editable institutional fields
    const [region, setRegion] = useState('2');
    const [areaSupervision, setAreaSupervision] = useState('');
    const [inspector, setInspector] = useState('');
    const [telefono, setTelefono] = useState('');

    const trimestre = TRIMS[informeTipo];
    const areas = ciclo === 'primer' ? AREAS_1 : AREAS_2;
    const ranges = ciclo === 'primer' ? CONCEPTUAL : NUMERIC;
    const years = ciclo === 'primer' ? [1, 2, 3] : [4, 5, 6];
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const snap = await getDocs(collection(db, 'estudiantes'));
                setEstudiantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) { console.error(err); }
            setLoading(false);
        })();
    }, []);

    const studentsInCourse = (grado, seccion) =>
        estudiantes.filter(e =>
            e.cursoId === `${grado}${seccion}-TM` ||
            e.cursoId === `${grado}${seccion}-TT`
        );

    const studentsInGrade = (grado) =>
        SECTIONS.flatMap(s => studentsInCourse(grado, s));

    const studentsAll = () =>
        years.flatMap(y => studentsInGrade(y));

    /* Approval summary for a section */
    const sectionSummary = (grado, seccion) => {
        const sts = studentsInCourse(grado, seccion);
        const matricula = sts.length;
        const aprobados = sts.filter(st => failedAreasCount(st, areas, ranges, trimestre) === 0).length;
        const fail1 = sts.filter(st => failedAreasCount(st, areas, ranges, trimestre) === 1).length;
        const fail2o3 = sts.filter(st => { const n = failedAreasCount(st, areas, ranges, trimestre); return n === 2 || n === 3; }).length;
        const fail4plus = sts.filter(st => failedAreasCount(st, areas, ranges, trimestre) >= 4).length;
        return { matricula, aprobados, fail1, fail2o3, fail4plus };
    };

    const gradeSummary = (grado) => {
        const agg = { matricula: 0, aprobados: 0, fail1: 0, fail2o3: 0, fail4plus: 0 };
        SECTIONS.forEach(s => {
            const r = sectionSummary(grado, s);
            agg.matricula += r.matricula;
            agg.aprobados += r.aprobados;
            agg.fail1 += r.fail1;
            agg.fail2o3 += r.fail2o3;
            agg.fail4plus += r.fail4plus;
        });
        return agg;
    };

    /* Pie data for charts */
    const pieDataForArea = (areaKey) => {
        const all = studentsAll();
        return ranges.map(r => ({
            name: r.label,
            value: countRange(all, areaKey, r.match, trimestre),
            color: r.color,
        })).filter(d => d.value > 0);
    };

    const difficultyIndex = (areaKey) => {
        const all = studentsAll();
        if (!all.length) return 0;
        const low = ranges.filter(r => !r.pass).reduce((acc, r) => acc + countRange(all, areaKey, r.match, trimestre), 0);
        return Math.round((low / all.length) * 100);
    };

    if (loading) return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Recopilando sábana de calificaciones…
        </div>
    );

    /* ── Render ─────────────────────────────────────────── */
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '0.5rem' }}>

            {/* ═══ NO-PRINT CONTROLS ══════════════════════════ */}
            <div className="no-print" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'var(--color-surface)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <div className="flex gap-2">
                    <button className={`btn ${ciclo === 'primer' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCiclo('primer')} style={{ fontSize: '0.78rem' }}>1° Ciclo</button>
                    <button className={`btn ${ciclo === 'segundo' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCiclo('segundo')} style={{ fontSize: '0.78rem' }}>2° Ciclo</button>
                </div>
                <select className="input-field" value={informeTipo} onChange={e => setInformeTipo(e.target.value)} style={{ width: 'auto', fontSize: '0.82rem' }}>
                    <option value="PIC">PIC — 1er Trimestre</option>
                    <option value="SIC">SIC — 2do Trimestre</option>
                    <option value="TIC">TIC — 3er Trimestre</option>
                </select>
                <input className="input-field" placeholder="Región N°" value={region} onChange={e => setRegion(e.target.value)} style={{ width: 80, fontSize: '0.82rem' }} />
                <input className="input-field" placeholder="Área de Supervisión" value={areaSupervision} onChange={e => setAreaSupervision(e.target.value)} style={{ width: 180, fontSize: '0.82rem' }} />
                <input className="input-field" placeholder="Inspector/a" value={inspector} onChange={e => setInspector(e.target.value)} style={{ width: 160, fontSize: '0.82rem' }} />
                <input className="input-field" placeholder="Teléfono Sede" value={telefono} onChange={e => setTelefono(e.target.value)} style={{ width: 130, fontSize: '0.82rem' }} />
                <button className="btn btn-outline" onClick={() => setShowCharts(v => !v)} style={{ fontSize: '0.78rem' }}>
                    <BarChart2 size={14} /> Gráficos
                </button>
                <button className="btn btn-primary" onClick={() => window.print()} style={{ marginLeft: 'auto', fontSize: '0.82rem' }}>
                    <Download size={14} /> Imprimir / PDF
                </button>
            </div>

            {/* ═══ PRINTABLE DOCUMENT ═════════════════════════ */}
            <div style={{ backgroundColor: 'white', padding: '1rem 1.5rem' }}>

                {/* ── Header institucional ─────────────────── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div />
                    <div style={{ textAlign: 'right' }}>
                        <img src="https://abc.gob.ar/core/themes/abc/logo-pba.svg" alt="Buenos Aires Provincia" style={{ height: 48, marginBottom: 4 }} />
                        <div style={{ fontSize: '0.65rem', color: '#444' }}>Subsecretaría de Educación</div>
                        <div style={{ fontSize: '0.65rem', color: '#444' }}>Dirección Provincial de Educación Primaria</div>
                    </div>
                </div>

                {/* ── Título ────────────────────────────────── */}
                <h3 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '0.85rem', fontWeight: 'bold', margin: '0.5rem 0', letterSpacing: 0.5 }}>
                    PRIMER/SEGUNDO/TERCER INFORME DE CALIFICACIONES DE {ciclo === 'primer' ? '1°' : '2°'} CICLO — {currentYear}
                </h3>

                {/* ── Datos institucionales ─────────────────── */}
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                    <span><b>REGIÓN:</b> {region} &nbsp; <b>{informeTipo}</b></span>
                    <span><b>ÁREA DE SUPERVISIÓN:</b> {areaSupervision || '……………………………………'}</span>
                    <span><b>INSPECTOR/A:</b> {inspector || '……………………'} {telefono ? `— Tel. Sede: ${telefono}` : ''}</span>
                </div>

                {/* ════════════════════════════════════════════
                    TABLA PRINCIPAL
                ════════════════════════════════════════════ */}
                <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                    <table style={{ borderCollapse: 'collapse', tableLayout: 'fixed', width: '100%', fontSize: '0.65rem' }}>
                        <colgroup>
                            <col style={{ width: 54 }} />
                            <col style={{ width: 38 }} />
                            {areas.flatMap(a => ranges.map(r => (
                                <col key={`col-${a.key}-${r.key}`} style={{ width: CELL_W }} />
                            )))}
                        </colgroup>
                        <thead>
                            {/* Row 0 – "Alumnos calificados por área" title */}
                            <tr>
                                <td colSpan={2} style={{ border: '1px solid #555', backgroundColor: HDR_BG, color: 'white', fontWeight: 'bold', fontSize: '0.62rem', textAlign: 'center', padding: '3px' }} />
                                <td colSpan={areas.length * ranges.length} style={{ border: '1px solid #555', backgroundColor: HDR_BG, color: 'white', fontWeight: 'bold', fontSize: '0.62rem', textAlign: 'center', padding: '3px' }}>
                                    ALUMNOS CALIFICADOS POR ÁREAS Y POR CALIFICACIÓN OBTENIDA
                                </td>
                            </tr>
                            {/* Row 1 – Area headers */}
                            <tr>
                                <th rowSpan={2} style={{ ...thBase, width: 54, backgroundColor: HDR_BG, color: 'white', textAlign: 'center' }}>AÑO-SECC.</th>
                                <th rowSpan={2} style={{ ...thBase, width: 38, backgroundColor: HDR_BG, color: 'white' }}>Total alumnos</th>
                                {areas.map(a => (
                                    <th key={a.key} colSpan={ranges.length} style={{ ...thBase, width: CELL_W * ranges.length, backgroundColor: HDR_AREA_BG, color: 'white', fontWeight: 'bold', fontSize: '0.62rem' }}>
                                        {a.short}
                                    </th>
                                ))}
                            </tr>
                            {/* Row 2 – Range sub-headers */}
                            <tr>
                                {areas.flatMap(a => ranges.map(r => (
                                    <th key={`h2-${a.key}-${r.key}`} style={{
                                        ...thBase,
                                        backgroundColor: !r.pass
                                            ? (ranges.indexOf(r) === ranges.length - 1 ? '#fca5a5' : '#fdba74')
                                            : '#bfdbfe'
                                    }}>
                                        {r.label}
                                    </th>
                                )))}
                            </tr>
                        </thead>

                        <tbody>
                            {years.map(y => {
                                const gradeStudents = studentsInGrade(y);
                                return (
                                    <Fragment key={y}>
                                        {SECTIONS.map(s => {
                                            const sts = studentsInCourse(y, s);
                                            if (sts.length === 0) return null;
                                            return (
                                                <tr key={`${y}${s}`}>
                                                    <td style={{ ...tdBase, textAlign: 'left', width: 54, fontWeight: 600 }}>{y}° {s}</td>
                                                    <td style={{ ...tdBase, width: 38, fontWeight: 'bold' }}>{sts.length}</td>
                                                    {areas.flatMap(a => ranges.map(r => {
                                                        const n = countRange(sts, a.key, r.match, trimestre);
                                                        return <td key={`${y}${s}-${a.key}-${r.key}`} style={tdBase}>{n || ''}</td>;
                                                    }))}
                                                </tr>
                                            );
                                        })}

                                        {/* SUB row */}
                                        <tr style={{ backgroundColor: SUB_BG }}>
                                            <td style={{ ...tdBase, textAlign: 'left', width: 54, fontWeight: 'bold', backgroundColor: SUB_BG }}>SUB {y}°</td>
                                            <td style={{ ...tdBase, width: 38, fontWeight: 'bold', backgroundColor: SUB_BG }}>{gradeStudents.length}</td>
                                            {areas.flatMap(a => ranges.map(r => {
                                                const n = countRange(gradeStudents, a.key, r.match, trimestre);
                                                return <td key={`sub-${y}-${a.key}-${r.key}`} style={{ ...tdBase, backgroundColor: SUB_BG, fontWeight: 'bold' }}>{n || ''}</td>;
                                            }))}
                                        </tr>
                                    </Fragment>
                                );
                            })}

                            {/* TOT row */}
                            <tr>
                                <td style={{ ...tdBase, textAlign: 'left', width: 54, backgroundColor: TOT_BG, color: 'white', fontWeight: 'bold' }}>TOT</td>
                                <td style={{ ...tdBase, width: 38, backgroundColor: TOT_BG, color: 'white', fontWeight: 'bold' }}>{studentsAll().length}</td>
                                {areas.flatMap(a => ranges.map(r => {
                                    const n = countRange(studentsAll(), a.key, r.match, trimestre);
                                    return <td key={`tot-${a.key}-${r.key}`} style={{ ...tdBase, backgroundColor: TOT_BG, color: 'white', fontWeight: 'bold' }}>{n || ''}</td>;
                                }))}
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* ════════════════════════════════════════════
                    TABLA RESUMEN DE APROBADOS / DESAPROBADOS
                ════════════════════════════════════════════ */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                    {years.map(y => {
                        const totSumm = gradeSummary(y);
                        return (
                            <div key={y} style={{ flex: 1, minWidth: 220 }}>
                                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.62rem' }}>
                                    <thead>
                                        <tr>
                                            <td colSpan={7} style={{ padding: '4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: HDR_AREA_BG, color: 'white', border: '1px solid #555', fontSize: '0.7rem' }}>
                                                {y}° AÑO
                                            </td>
                                        </tr>
                                        <tr style={{ backgroundColor: '#e2e8f0' }}>
                                            <th style={{ ...thBase, width: 28 }}>Secc.</th>
                                            <th style={{ ...thBase, width: 38 }}>Matrí-cula</th>
                                            <th style={{ ...thBase, width: 38 }}>Apro-bados*</th>
                                            <th colSpan={3} style={{ ...thBase, width: 90, backgroundColor: '#fecaca' }}>Desaprobados</th>
                                            <th style={{ ...thBase, width: 38 }}>Deser-tores</th>
                                        </tr>
                                        <tr style={{ backgroundColor: '#e2e8f0' }}>
                                            <th style={thBase} />
                                            <th style={thBase} />
                                            <th style={thBase} />
                                            <th style={{ ...thBase, backgroundColor: '#fecaca', fontSize: '0.57rem' }}>1 área</th>
                                            <th style={{ ...thBase, backgroundColor: '#fecaca', fontSize: '0.57rem' }}>2o3 áreas</th>
                                            <th style={{ ...thBase, backgroundColor: '#fecaca', fontSize: '0.57rem' }}>4+ áreas</th>
                                            <th style={thBase} />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SECTIONS.map(s => {
                                            const r = sectionSummary(y, s);
                                            if (r.matricula === 0) return null;
                                            return (
                                                <tr key={`${y}${s}-summ`}>
                                                    <td style={tdBase}>{s}</td>
                                                    <td style={tdBase}>{r.matricula}</td>
                                                    <td style={tdBase}>{r.aprobados}</td>
                                                    <td style={{ ...tdBase, backgroundColor: r.fail1 > 0 ? '#fee2e2' : 'white' }}>{r.fail1 || ''}</td>
                                                    <td style={{ ...tdBase, backgroundColor: r.fail2o3 > 0 ? '#fee2e2' : 'white' }}>{r.fail2o3 || ''}</td>
                                                    <td style={{ ...tdBase, backgroundColor: r.fail4plus > 0 ? '#fecaca' : 'white' }}>{r.fail4plus || ''}</td>
                                                    <td style={tdBase}>0</td>
                                                </tr>
                                            );
                                        })}
                                        {/* TOT row */}
                                        <tr style={{ backgroundColor: TOT_BG }}>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>TOT</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>{totSumm.matricula}</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>{totSumm.aprobados}</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>{totSumm.fail1}</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>{totSumm.fail2o3}</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>{totSumm.fail4plus}</td>
                                            <td style={{ ...tdBase, color: 'white', fontWeight: 'bold', backgroundColor: TOT_BG }}>0</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.65rem', color: '#444' }}>
                    <div>
                        <p style={{ margin: 0 }}>Utilizar un renglón para cada sección, consignando los subtotales por año, en la fila siguiente a cada grupo.</p>
                        <p style={{ margin: 0 }}>(*) Según Resolución N° 197/16 del Consejo General de Educación</p>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #444', paddingTop: '0.5rem', minWidth: 220 }}>
                        FIRMA Y SELLO DEL DIRECTOR/VICEDIRECTOR
                    </div>
                </div>
            </div>

            {/* ═══ GRÁFICOS (no-print) ════════════════════════════ */}
            {showCharts && (
                <div className="no-print" style={{ marginTop: '1.5rem' }}>
                    <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>Materias con Mayor Dificultad</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                        Ordenadas de mayor a menor porcentaje de calificaciones bajas
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                        {[...areas].sort((a, b) => difficultyIndex(b.key) - difficultyIndex(a.key)).map(area => {
                            const data = pieDataForArea(area.key);
                            const diff = difficultyIndex(area.key);
                            return (
                                <div key={area.key} style={{ border: `2px solid ${diff > 30 ? '#f87171' : diff > 15 ? '#fdba74' : '#86efac'}`, borderRadius: 10, padding: '0.75rem', backgroundColor: 'var(--color-background)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <strong style={{ fontSize: '0.82rem' }}>{area.short}</strong>
                                        <span style={{ fontSize: '0.72rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: 20, backgroundColor: diff > 30 ? '#fecaca' : diff > 15 ? '#fed7aa' : '#d1fae5', color: diff > 30 ? '#b91c1c' : diff > 15 ? '#92400e' : '#166534' }}>
                                            {diff}%
                                        </span>
                                    </div>
                                    {data.length === 0 ? (
                                        <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: 12 }}>Sin datos aún</p>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={180}>
                                            <PieChart>
                                                <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={2} dataKey="value"
                                                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                                                    {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Pie>
                                                <Tooltip formatter={(v, name) => [`${v} alumnos`, name]} />
                                                <Legend iconSize={9} wrapperStyle={{ fontSize: '0.68rem' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
