import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserPlus, Users, GraduationCap, ArrowRightCircle, RefreshCcw, CheckSquare, Trash2, Edit, FileText, UploadCloud, Activity } from 'lucide-react';

const adminApp = initializeApp(firebaseConfig, 'AdminSecondaryApp');
const secondaryAuth = getAuth(adminApp);

export default function AdminPanel() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('docentes');

    // States Docentes
    const [docentes, setDocentes] = useState([]);
    const [loadingDocentes, setLoadingDocentes] = useState(false);
    const [editingDocente, setEditingDocente] = useState(null);
    const [newDocente, setNewDocente] = useState({ nombre: '', apellido: '', dni: '', email: '', password: '', roles: ['docente'], cursos: '', materiaEspecial: '', hijosDnis: '' });

    // States Estudiantes
    const [estudiantes, setEstudiantes] = useState([]);
    const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
    const [newEstudiante, setNewEstudiante] = useState({ nombre: '', apellido: '', dni: '', grado: '', seccion: '', turno: 'Mañana' });

    // States Migración Masiva
    const [migrationData, setMigrationData] = useState({ anioNuevo: new Date().getFullYear() + 1, gradoNuevo: '', seccionNueva: '', turnoNuevo: 'Mañana' });
    const [selectedEstudiantes, setSelectedEstudiantes] = useState([]);

    // States Logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Generic states
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if (activeTab === 'docentes' && docentes.length === 0) fetchDocentes();
        if (activeTab === 'estudiantes' && estudiantes.length === 0) fetchEstudiantes();
        if (activeTab === 'actividad' && logs.length === 0) fetchLogs();
    }, [activeTab]);

    const logActivity = async (action, details) => {
        try {
            await addDoc(collection(db, 'logs'), {
                usuario: currentUser?.email || 'Sistema',
                accion: action,
                detalles: details,
                fecha: new Date().toISOString()
            });
        } catch (e) {
            console.error("No se pudo registrar log de actividad", e);
        }
    };

    const fetchLogs = async () => {
        setLoadingLogs(true);
        try {
            const snap = await getDocs(collection(db, 'logs'));
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            data.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
            setLogs(data);
        } catch (err) { }
        setLoadingLogs(false);
    };

    const fetchDocentes = async () => {
        setLoadingDocentes(true);
        try {
            const snap = await getDocs(collection(db, 'docentes'));
            setDocentes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al obtener docentes' });
        }
        setLoadingDocentes(false);
    };

    const fetchEstudiantes = async () => {
        setLoadingEstudiantes(true);
        try {
            const snap = await getDocs(collection(db, 'estudiantes'));
            setEstudiantes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (err) {
            setMsg({ type: 'error', text: 'Error al obtener estudiantes' });
        }
        setLoadingEstudiantes(false);
    };

    const showMessage = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg({ type: '', text: '' }), 6000);
    };

    const handleRoleToggle = (rolName) => {
        if (newDocente.roles.includes(rolName)) {
            setNewDocente({ ...newDocente, roles: newDocente.roles.filter(r => r !== rolName) });
        } else {
            setNewDocente({ ...newDocente, roles: [...newDocente.roles, rolName] });
        }
    };

    const handleEditDocente = (d) => {
        setEditingDocente(d.id);
        setNewDocente({
            nombre: d.nombre || '',
            apellido: d.apellido || '',
            dni: d.dni || '',
            email: d.email || '',
            password: '',
            roles: d.roles || (d.role ? [d.role] : ['docente']),
            cursos: d.cursosAsignados ? d.cursosAsignados.join(', ') : '',
            materiaEspecial: d.materiaEspecial || '',
            hijosDnis: d.hijosDnis ? d.hijosDnis.join(', ') : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteDocente = async (id, nombre) => {
        if (window.confirm(`¿Estás seguro que deseas ELIMINAR el registro del usuario ${nombre}? Esta acción es irreversible.`)) {
            try {
                await deleteDoc(doc(db, 'docentes', id));
                await logActivity('Eliminación Docente', `Se eliminó perfil de ${nombre}`);
                showMessage('success', 'Docente eliminado correctamente de la base de datos institucinal.');
                fetchDocentes();
            } catch (e) {
                showMessage('error', 'Error al eliminar docente.');
            }
        }
    };

    const handleSubmitDocente = async (e) => {
        e.preventDefault();
        if (newDocente.roles.length === 0) {
            return showMessage('error', 'Debe seleccionar al menos un Perfil de Cuenta.');
        }

        if (editingDocente) {
            setMsg({ type: 'info', text: 'Actualizando datos del docente...' });
            try {
                const docenteData = {
                    nombre: newDocente.nombre,
                    apellido: newDocente.apellido,
                    displayName: `${newDocente.nombre} ${newDocente.apellido}`,
                    dni: newDocente.dni,
                    roles: newDocente.roles,
                    cursosAsignados: newDocente.cursos.split(',').map(c => c.trim()).filter(Boolean),
                    materiaEspecial: newDocente.roles.includes('docente_area') ? newDocente.materiaEspecial : null,
                    hijosDnis: newDocente.roles.includes('familia') ? newDocente.hijosDnis.split(',').map(h => h.trim()).filter(Boolean) : null
                };

                await updateDoc(doc(db, 'docentes', editingDocente), docenteData);
                await logActivity('Actualización de Docente', `Se modificó el perfil de ${docenteData.displayName}`);

                showMessage('success', 'Docente actualizado con éxito.');
                cancelEditDocente();
                fetchDocentes();
            } catch (err) {
                showMessage('error', 'Error actualizando docente: ' + err.message);
            }
        } else {
            setMsg({ type: 'info', text: 'Creando docente y registro...' });
            try {
                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newDocente.email, newDocente.password);
                await signOut(secondaryAuth);

                const docenteData = {
                    nombre: newDocente.nombre,
                    apellido: newDocente.apellido,
                    displayName: `${newDocente.nombre} ${newDocente.apellido}`,
                    dni: newDocente.dni,
                    email: newDocente.email,
                    roles: newDocente.roles,
                    cursosAsignados: newDocente.cursos.split(',').map(c => c.trim()).filter(Boolean),
                    materiaEspecial: newDocente.roles.includes('docente_area') ? newDocente.materiaEspecial : null,
                    hijosDnis: newDocente.roles.includes('familia') ? newDocente.hijosDnis.split(',').map(h => h.trim()).filter(Boolean) : null,
                    createdAt: new Date(),
                    mustChangePassword: true
                };

                await setDoc(doc(db, 'docentes', userCredential.user.uid), docenteData);
                await logActivity('Creación Docente', `Se creó acceso para ${newDocente.nombre} ${newDocente.apellido}`);

                showMessage('success', 'Cuenta creada con éxito.');
                cancelEditDocente();
                fetchDocentes();
            } catch (err) {
                showMessage('error', 'Error al crear docente: ' + err.message);
            }
        }
    };

    const cancelEditDocente = () => {
        setEditingDocente(null);
        setNewDocente({ nombre: '', apellido: '', dni: '', email: '', password: '', roles: ['docente'], cursos: '', materiaEspecial: '', hijosDnis: '' });
    };

    const handleCreateEstudiante = async (e) => {
        e.preventDefault();
        setMsg({ type: 'info', text: 'Registrando estudiante...' });
        try {
            const nuevoTurnoStr = newEstudiante.turno === 'Mañana' ? 'TM' : 'TT';
            const nuevoCursoId = `${newEstudiante.grado}${newEstudiante.seccion}-${nuevoTurnoStr}`;

            const estudianteData = {
                nombre: `${newEstudiante.apellido}, ${newEstudiante.nombre}`,
                dni: newEstudiante.dni,
                cursoId: nuevoCursoId,
                turno: newEstudiante.turno,
                asistencia: '0%',
                informes: [],
                historicoCursos: []
            };

            await addDoc(collection(db, 'estudiantes'), estudianteData);
            await logActivity('Matriculó Estudiante', `Se inscribió al alumno ${estudianteData.nombre} en ${nuevoCursoId}`);

            showMessage('success', 'Estudiante registrado correctamente.');
            setNewEstudiante({ nombre: '', apellido: '', dni: '', grado: '', seccion: '', turno: 'Mañana' });
            fetchEstudiantes();
        } catch (err) {
            showMessage('error', 'Error al registrar estudiante: ' + err.message);
        }
    };

    const handleDeleteEstudiante = async (id, nombre) => {
        if (window.confirm(`¿Seguro deseas ELIMINAR del sistema a ${nombre}?`)) {
            try {
                await deleteDoc(doc(db, 'estudiantes', id));
                await logActivity('Baja de Estudiante', `Baja física del alumno ${nombre}`);
                showMessage('success', 'Estudiante eliminado del padrón.');
                fetchEstudiantes();
            } catch (e) {
                showMessage('error', 'Error eliminando estudiante.');
            }
        }
    };

    // CSV LOGIC
    const downloadCSVModel = () => {
        const csvContent = "data:text/csv;charset=utf-8,NOMBRE,APELLIDO,DNI,GRADO,SECCION,TURNO\nJuan,Perez,12345678,1,A,Mañana\nMaria,Gomez,87654321,3,B,Tarde";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_importacion_estudiantes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMsg({ type: 'info', text: 'Procesando archivo CSV... Por favor no cierre la ventana.' });

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').filter(r => r.trim());
                let count = 0;

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].split(',').map(c => c.trim().replace(/"/g, ''));
                    if (cols.length >= 6) {
                        const [nombre, apellido, dni, grado, seccion, turno] = cols;
                        if (!dni) continue;

                        const nuevoTurnoStr = turno.toLowerCase().includes('ma') ? 'TM' : 'TT';
                        const nuevoCursoId = `${grado}${seccion.toUpperCase()}-${nuevoTurnoStr}`;

                        const estudianteData = {
                            nombre: `${apellido}, ${nombre}`,
                            dni: dni,
                            cursoId: nuevoCursoId,
                            turno: turno.toLowerCase().includes('ma') ? 'Mañana' : 'Tarde',
                            asistencia: '0%',
                            informes: [],
                            historicoCursos: []
                        };

                        await addDoc(collection(db, 'estudiantes'), estudianteData);
                        count++;
                    }
                }

                await logActivity('Importación CSV', `Se subió un lote masivo de ${count} estudiantes.`);
                showMessage('success', `Importación finalizada: ${count} estudiantes agregados en lote.`);
                fetchEstudiantes();
            } catch (err) {
                showMessage('error', 'Hubo un error al procesar el archivo CSV.');
                console.error(err);
            }
            // Clear file input
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const toggleSelectAll = () => {
        if (selectedEstudiantes.length === estudiantes.length && estudiantes.length > 0) {
            setSelectedEstudiantes([]);
        } else {
            setSelectedEstudiantes(estudiantes.map(e => e.id));
        }
    };

    const toggleStudentSelection = (studentId) => {
        if (selectedEstudiantes.includes(studentId)) {
            setSelectedEstudiantes(selectedEstudiantes.filter(id => id !== studentId));
        } else {
            setSelectedEstudiantes([...selectedEstudiantes, studentId]);
        }
    };

    const handleBulkPromoteStudents = async () => {
        if (!migrationData.anioNuevo || !migrationData.gradoNuevo || !migrationData.seccionNueva) {
            return showMessage('error', 'Indique el año lectivo, grado y sección del nuevo curso de destino.');
        }

        if (selectedEstudiantes.length === 0) {
            return showMessage('error', 'Seleccione al menos un estudiante de la tabla principal para migrar.');
        }

        const confirmacion = window.confirm(`ATENCIÓN: Se van a promover masivamente a ${selectedEstudiantes.length} estudiantes al Año ${migrationData.anioNuevo}.\n\n¿Desea continuar?`);
        if (!confirmacion) return;

        setMsg({ type: 'info', text: 'Ejecutando proceso de migración...' });

        try {
            const batchPromises = selectedEstudiantes.map(async (studentId) => {
                const targetStudent = estudiantes.find(e => e.id === studentId);
                const studentRef = doc(db, 'estudiantes', studentId);

                const cursoHistorico = {
                    anio: parseInt(migrationData.anioNuevo) - 1,
                    cursoId: targetStudent.cursoId
                };

                const updatedHistorico = [...(targetStudent.historicoCursos || []), cursoHistorico];
                const nuevoTurnoStr = migrationData.turnoNuevo === 'Mañana' ? 'TM' : 'TT';
                const nuevoCursoId = `${migrationData.gradoNuevo}${migrationData.seccionNueva.toUpperCase()}-${nuevoTurnoStr}`;

                await updateDoc(studentRef, {
                    cursoId: nuevoCursoId,
                    turno: migrationData.turnoNuevo,
                    historicoCursos: updatedHistorico
                });
            });

            await Promise.all(batchPromises);
            await logActivity('Promoción Masiva', `Promovió a ${selectedEstudiantes.length} estudiantes al curso ${migrationData.gradoNuevo} ${migrationData.seccionNueva} ${migrationData.turnoNuevo}`);

            showMessage('success', `Operación exitosa: ${selectedEstudiantes.length} estudiantes promovidos.`);
            setSelectedEstudiantes([]);
            fetchEstudiantes();
        } catch (err) {
            showMessage('error', 'Fallo técnico durante la migración.');
        }
    };

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <h1 className="mb-4 flex items-center gap-2">
                <ShieldCheck color="var(--color-primary)" />
                Panel de Administración General
            </h1>
            <p className="mb-4">Gestión de Cuentas, Migración y Auditoría Institucional.</p>

            {msg.text && (
                <div className={`badge ${msg.type === 'error' ? 'badge-error' : msg.type === 'success' ? 'badge-success' : 'badge-warning'} mb-4`} style={{ display: 'block', padding: '1rem', fontSize: '1rem' }}>
                    {msg.text}
                </div>
            )}

            {/* TABS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '1rem' }}>
                <button
                    className={`btn ${activeTab === 'docentes' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('docentes')}
                >
                    <Users size={18} /> Base Plantilla Docentes
                </button>
                <button
                    className={`btn ${activeTab === 'estudiantes' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('estudiantes')}
                >
                    <GraduationCap size={18} /> Gestión de Estudiantes / Ciclos
                </button>
                <button
                    className={`btn ${activeTab === 'actividad' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => { setActiveTab('actividad'); fetchLogs(); }}
                >
                    <Activity size={18} /> Registro de Movimientos
                </button>
            </div>

            {activeTab === 'docentes' && (
                <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    <div className="card">
                        <h3 className="mb-4 flex items-center gap-2">
                            <UserPlus size={20} />
                            {editingDocente ? 'Modificar Docente' : 'Nuevo Alta Docente'}
                        </h3>
                        <form onSubmit={handleSubmitDocente}>
                            <div className="input-group">
                                <input className="input-field" placeholder="Nombre" required value={newDocente.nombre} onChange={e => setNewDocente({ ...newDocente, nombre: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <input className="input-field" placeholder="Apellido" required value={newDocente.apellido} onChange={e => setNewDocente({ ...newDocente, apellido: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <input className="input-field" placeholder="DNI" required value={newDocente.dni} onChange={e => setNewDocente({ ...newDocente, dni: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <input className="input-field" type="email" placeholder="Usuario (Email)" required disabled={editingDocente} value={newDocente.email} onChange={e => setNewDocente({ ...newDocente, email: e.target.value })} style={{ opacity: editingDocente ? 0.6 : 1 }} />
                            </div>
                            {!editingDocente && (
                                <div className="input-group">
                                    <input className="input-field" type="password" placeholder="Contraseña de Acceso" required minLength={6} value={newDocente.password} onChange={e => setNewDocente({ ...newDocente, password: e.target.value })} />
                                </div>
                            )}

                            <div className="input-group" style={{ padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: 'var(--radius-md)' }}>
                                <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Perfil o Múltiples Roles</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.9rem' }}>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" checked={newDocente.roles.includes('docente')} onChange={() => handleRoleToggle('docente')} /> Docente
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" checked={newDocente.roles.includes('docente_area')} onChange={() => handleRoleToggle('docente_area')} /> Docente de Área Especial
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" checked={newDocente.roles.includes('administrador')} onChange={() => handleRoleToggle('administrador')} /> Administrador Institucional
                                    </label>
                                    <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input type="checkbox" checked={newDocente.roles.includes('familia')} onChange={() => handleRoleToggle('familia')} /> Familiar
                                    </label>
                                </div>
                            </div>

                            {newDocente.roles.includes('docente_area') && (
                                <div className="input-group">
                                    <select className="input-field" value={newDocente.materiaEspecial} onChange={e => setNewDocente({ ...newDocente, materiaEspecial: e.target.value })}>
                                        <option value="" disabled>Seleccione Materia Especial de Área...</option>
                                        <option value="Inglés">Inglés</option>
                                        <option value="Educación Física">Educación Física</option>
                                        <option value="Artística">Artística</option>
                                    </select>
                                </div>
                            )}

                            {newDocente.roles.includes('familia') && (
                                <div className="input-group">
                                    <input className="input-field" placeholder="DNI de los Hijos (separados por coma)" required value={newDocente.hijosDnis} onChange={e => setNewDocente({ ...newDocente, hijosDnis: e.target.value })} />
                                </div>
                            )}

                            {(newDocente.roles.includes('docente') || newDocente.roles.includes('docente_area')) && (
                                <div className="input-group">
                                    <input className="input-field" placeholder="Cursos Asignados (ej: 1A-TM, 2B-TT)" value={newDocente.cursos} onChange={e => setNewDocente({ ...newDocente, cursos: e.target.value })} />
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary w-full mt-4">
                                {editingDocente ? 'Actualizar Modificaciones' : 'Registrar Perfil Completo'}
                            </button>
                            {editingDocente && (
                                <button type="button" onClick={cancelEditDocente} className="btn w-full mt-2" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}>Cancelar Edición</button>
                            )}
                        </form>
                    </div>

                    <div className="card" style={{ overflowX: 'auto' }}>
                        <h3 className="mb-4 flex items-center justify-between">
                            Nómina de Docentes / Autoridades
                            <button onClick={fetchDocentes} className="btn"><RefreshCcw size={16} /></button>
                        </h3>
                        {loadingDocentes ? <p>Cargando datos...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre/Roles Activos</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>DNI</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email / Cursos</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Administrar</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docentes.map(d => (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 600 }}>{d.displayName}</div>
                                                <div className="flex gap-1 flex-wrap mt-1">
                                                    {(d.roles || (d.role ? [d.role] : ['docente'])).map((rolName, i) => (
                                                        <span key={i} className={`badge ${rolName === 'administrador' ? 'badge-error' : rolName === 'familia' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                                            {rolName === 'docente' ? 'Titular' : rolName === 'docente_area' ? `Área` : rolName.toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{d.dni}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div>{d.email}</div>
                                                <div style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{d.cursosAsignados?.join(', ')}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleEditDocente(d)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }} title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteDocente(d.id, d.displayName)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', borderColor: '#fca5a5', color: '#ef4444' }} title="Eliminar">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {docentes.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No hay usuarios registrados.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'estudiantes' && (
                <div className="grid" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '2rem' }}>
                    <div>
                        <div className="card mb-4" style={{ border: '2px dashed var(--color-primary)' }}>
                            <h3 className="mb-4 flex items-center gap-2"><UploadCloud size={20} color="var(--color-primary)" /> Alta Masiva por Lote / CSV</h3>
                            <p style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Sube el archivo Excel convertido a CSV siguiendo exactamente el modelo para matricular salones enteros.</p>

                            <label className="btn btn-primary w-full flex justify-center items-center gap-2" style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>
                                <UploadCloud size={18} />
                                Buscar Archivo .CSV y Subir
                                <input type="file" accept=".csv" onChange={handleCSVUpload} style={{ display: 'none' }} />
                            </label>

                            <button onClick={downloadCSVModel} className="btn btn-outline w-full flex justify-center items-center gap-2" style={{ fontSize: '0.875rem' }}>
                                <FileText size={16} />
                                Descargar Modelo Plantilla Vacía
                            </button>
                        </div>

                        <div className="card mb-4">
                            <h3 className="mb-4 flex items-center gap-2"><UserPlus size={20} /> Matricular por Menor (1 u.)</h3>
                            <form onSubmit={handleCreateEstudiante}>
                                <div className="input-group">
                                    <input className="input-field" placeholder="Nombre" required value={newEstudiante.nombre} onChange={e => setNewEstudiante({ ...newEstudiante, nombre: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input className="input-field" placeholder="Apellido" required value={newEstudiante.apellido} onChange={e => setNewEstudiante({ ...newEstudiante, apellido: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input className="input-field" placeholder="DNI" required value={newEstudiante.dni} onChange={e => setNewEstudiante({ ...newEstudiante, dni: e.target.value })} />
                                </div>
                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                    <div className="input-group">
                                        <select className="input-field" required value={newEstudiante.grado} onChange={e => setNewEstudiante({ ...newEstudiante, grado: e.target.value })}>
                                            <option value="" disabled>Grado</option>
                                            <option value="1">1°</option><option value="2">2°</option><option value="3">3°</option>
                                            <option value="4">4°</option><option value="5">5°</option><option value="6">6°</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <select className="input-field" required value={newEstudiante.seccion} onChange={e => setNewEstudiante({ ...newEstudiante, seccion: e.target.value })}>
                                            <option value="" disabled>Sección</option>
                                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                        </select>
                                    </div>
                                    <div className="input-group">
                                        <select className="input-field" value={newEstudiante.turno} onChange={e => setNewEstudiante({ ...newEstudiante, turno: e.target.value })}>
                                            <option value="Mañana">Mañana</option>
                                            <option value="Tarde">Tarde</option>
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-secondary w-full mt-4">Guardar Alta Ficha Única</button>
                            </form>
                        </div>

                        <div className="card" style={{ borderColor: 'var(--color-primary)' }}>
                            <h4 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--color-primary)' }}>Promoción Masiva de Ciclo Lectivo</h4>
                            <div className="input-group">
                                <label className="input-label">Año de Inicio Múltiple:</label>
                                <input className="input-field" type="number" placeholder="Año nuevo (ej: 2027)" value={migrationData.anioNuevo} onChange={e => setMigrationData({ ...migrationData, anioNuevo: e.target.value })} />
                            </div>

                            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div className="input-group">
                                    <label className="input-label">Grado Nuevo:</label>
                                    <select className="input-field" value={migrationData.gradoNuevo} onChange={e => setMigrationData({ ...migrationData, gradoNuevo: e.target.value })}>
                                        <option value="" disabled>Grado</option>
                                        <option value="1">1°</option><option value="2">2°</option><option value="3">3°</option>
                                        <option value="4">4°</option><option value="5">5°</option><option value="6">6°</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Sección Nueva:</label>
                                    <select className="input-field" value={migrationData.seccionNueva} onChange={e => setMigrationData({ ...migrationData, seccionNueva: e.target.value })}>
                                        <option value="" disabled>-</option>
                                        <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                    </select>
                                </div>
                            </div>
                            <div className="input-group">
                                <label className="input-label">Turno Cursada:</label>
                                <select className="input-field" value={migrationData.turnoNuevo} onChange={e => setMigrationData({ ...migrationData, turnoNuevo: e.target.value })}>
                                    <option value="Mañana">Turno Mañana</option>
                                    <option value="Tarde">Turno Tarde</option>
                                </select>
                            </div>

                            <button
                                onClick={handleBulkPromoteStudents}
                                disabled={selectedEstudiantes.length === 0}
                                className={`btn w-full mt-4 ${selectedEstudiantes.length > 0 ? 'btn-primary' : 'btn-outline'}`}
                                style={{ opacity: selectedEstudiantes.length === 0 ? 0.5 : 1, transition: 'all 0.3s' }}
                            >
                                <ArrowRightCircle size={18} />
                                Migrar seleccionados ({selectedEstudiantes.length})
                            </button>
                        </div>
                    </div>

                    <div className="card" style={{ overflowX: 'auto', alignSelf: 'start' }}>
                        <h3 className="mb-4 flex items-center justify-between">
                            <div>
                                Base Central de Estudiantes
                                <span className="badge badge-success ml-2">{estudiantes.length} Total</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={toggleSelectAll} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                    <CheckSquare size={16} /> Select Todo
                                </button>
                                <button onClick={fetchEstudiantes} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><RefreshCcw size={16} /></button>
                            </div>
                        </h3>

                        {loadingEstudiantes ? <p>Cargando padrón...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>
                                            <input type="checkbox" checked={selectedEstudiantes.length === estudiantes.length && estudiantes.length > 0} onChange={toggleSelectAll} />
                                        </th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre Estudiante</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>DNI</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Curso</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Admin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estudiantes.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: selectedEstudiantes.includes(e.id) ? 'rgba(4,75,127,0.05)' : 'transparent' }}>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <input type="checkbox" checked={selectedEstudiantes.includes(e.id)} onChange={() => toggleStudentSelection(e.id)} />
                                            </td>
                                            <td style={{ padding: '0.5rem', fontWeight: 600 }}>{e.nombre}</td>
                                            <td style={{ padding: '0.5rem' }}>{e.dni}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <span className="badge badge-success">{e.cursoId} ({e.turno})</span>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleDeleteEstudiante(e.id, e.nombre)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', borderColor: '#fca5a5', color: '#ef4444' }} title="Dar de baja">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {estudiantes.length === 0 && <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>Base vacía.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'actividad' && (
                <div className="card">
                    <h3 className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Activity size={20} color="var(--color-primary)" />
                            Auditoría de Actividad e Ingresos
                        </div>
                        <button onClick={fetchLogs} className="btn"><RefreshCcw size={16} /></button>
                    </h3>
                    <p className="mb-4">Este espacio almacena todas las acciones relevantes y de seguridad ejecutadas en la plataforma.</p>

                    {loadingLogs ? <p>Generando sábana de informes...</p> : (
                        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', position: 'sticky', top: 0, backgroundColor: 'white' }}>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fecha y Hora</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Autor (Usuario)</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tipo de Acción</th>
                                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>Detalles de Respaldo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                {new Date(log.fecha).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{log.usuario}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span className="badge badge-warning">{log.accion}</span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{log.detalles}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No existen registros recienetes.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
