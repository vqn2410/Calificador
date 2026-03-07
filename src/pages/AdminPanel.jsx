import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, setDoc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, UserPlus, Users, User, GraduationCap, ArrowRightCircle, RefreshCcw, CheckSquare, Trash2, Edit, FileText, UploadCloud, Activity, Settings, Lock, Unlock, PenTool } from 'lucide-react';
import InformesConduccion from './InformesConduccion';
import { VALID_COURSES } from '../config/constants';

const adminApp = initializeApp(firebaseConfig, 'AdminSecondaryApp');
const secondaryAuth = getAuth(adminApp);

export default function AdminPanel() {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('docentes');

    // All possible courses normalized from constants
    const ALL_COURSES = VALID_COURSES.map(c => c.id);

    // States Docentes
    const [docentes, setDocentes] = useState([]);
    const [loadingDocentes, setLoadingDocentes] = useState(false);
    const [editingDocente, setEditingDocente] = useState(null);
    const [newDocente, setNewDocente] = useState({ nombre: '', apellido: '', dni: '', email: '', password: '', roles: ['docente'], cursos: '', materiaEspecial: '', hijosDnis: '', cargo: '' });

    // States Estudiantes
    const [estudiantes, setEstudiantes] = useState([]);
    const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
    const [editingEstudiante, setEditingEstudiante] = useState(null);
    const [newEstudiante, setNewEstudiante] = useState({ nombre: '', apellido: '', dni: '', grado: '', seccion: '', turno: 'Mañana', famNombre: '', famApellido: '', famDni: '', famTelefono: '', famCorreo: '', famParentesco: 'Madre/Padre' });
    const [searchStudentTerm, setSearchStudentTerm] = useState('');
    const [searchStudentCourse, setSearchStudentCourse] = useState('');

    // States Migración Masiva
    const [migrationData, setMigrationData] = useState({ anioNuevo: new Date().getFullYear() + 1, gradoNuevo: '', seccionNueva: '', turnoNuevo: 'Mañana' });
    const [selectedEstudiantes, setSelectedEstudiantes] = useState([]);

    // States Logs
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // App Settings
    const [appSettings, setAppSettings] = useState({ allowFamilyAccess: true, allowTeacherDataEntry: true });
    const [savingSettings, setSavingSettings] = useState(false);

    // Generic states
    const [msg, setMsg] = useState({ type: '', text: '' });

    useEffect(() => {
        if ((activeTab === 'docentes' || activeTab === 'familias') && docentes.length === 0) fetchDocentes();
        if (activeTab === 'estudiantes' && estudiantes.length === 0) fetchEstudiantes();
        if (activeTab === 'actividad' && logs.length === 0) fetchLogs();
        if (activeTab === 'config') fetchAppSettings();
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

    const handleClearLogs = async () => {
        if (!window.confirm("¿Estás SEGURO que deseas borrar TODO el historial de movimientos? Esta acción es definitiva y no se puede deshacer.")) return;

        setSavingSettings(true);
        try {
            const snap = await getDocs(collection(db, 'logs'));
            const deletePromises = snap.docs.map(docSnap => deleteDoc(doc(db, 'logs', docSnap.id)));
            await Promise.all(deletePromises);

            await logActivity('Limpieza de Historial', 'Se borraron todos los logs de actividad por administración.');
            showMessage('success', 'Historial de movimientos vaciado correctamente.');
            setLogs([]);
        } catch (err) {
            console.error(err);
            showMessage('error', 'Error al intentar vaciar el historial.');
        } finally {
            setSavingSettings(false);
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

    const fetchAppSettings = async () => {
        try {
            const docRef = doc(db, 'config', 'appSettings');
            const snap = await getDoc(docRef); // I need to import getDoc
            if (snap.exists()) {
                setAppSettings(snap.data());
            } else {
                // If not exists, create default
                await setDoc(docRef, { allowFamilyAccess: true });
            }
        } catch (err) {
            console.error("Error fetching app settings:", err);
        }
    };

    const handleToggleFamilyAccess = async () => {
        setSavingSettings(true);
        try {
            const newValue = !appSettings.allowFamilyAccess;
            const docRef = doc(db, 'config', 'appSettings');
            await setDoc(docRef, { allowFamilyAccess: newValue }, { merge: true });
            setAppSettings({ ...appSettings, allowFamilyAccess: newValue });
            await logActivity('Configuración App', `Se ${newValue ? 'HABILITÓ' : 'DESHABILITÓ'} el acceso a Familias`);
            showMessage('success', `Acceso de Familias ${newValue ? 'Habilitado' : 'Deshabilitado'} correctamente.`);
        } catch (err) {
            showMessage('error', 'Error al actualizar configuración.');
        } finally {
            setSavingSettings(false);
        }
    };

    const handleToggleTeacherDataEntry = async () => {
        setSavingSettings(true);
        try {
            const newValue = !appSettings.allowTeacherDataEntry;
            const docRef = doc(db, 'config', 'appSettings');
            await setDoc(docRef, { allowTeacherDataEntry: newValue }, { merge: true });
            setAppSettings({ ...appSettings, allowTeacherDataEntry: newValue });
            await logActivity('Configuración App', `Se ${newValue ? 'HABILITÓ' : 'BLOQUEÓ'} la Carga de Notas para Docentes`);
            showMessage('success', `Carga de Notas ${newValue ? 'Habilitada' : 'Bloqueada (Solo Lectura)'} correctamente.`);
        } catch (err) {
            showMessage('error', 'Error al actualizar configuración.');
        } finally {
            setSavingSettings(false);
        }
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
            hijosDnis: d.hijosDnis ? d.hijosDnis.join(', ') : '',
            cargo: d.cargo || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteDocente = async (id, nombre) => {
        const safeNombre = nombre || 'este docente';
        const confirmed = window.confirm(`¿Estás seguro que deseas ELIMINAR el registro de ${safeNombre}? Esta acción es irreversible.`);
        if (!confirmed) return;

        try {
            await deleteDoc(doc(db, 'docentes', id));
            await logActivity('Eliminación Docente', `Se eliminó perfil de ${safeNombre}`);
            showMessage('success', 'Usuario eliminado correctamente de la base de datos.');
            fetchDocentes();
        } catch (e) {
            console.error("Delete docente error:", e);
            showMessage('error', 'Fallo técnico: No se pudo eliminar el docente.');
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
                const isOnlyFamilia = newDocente.roles.includes('familia') && newDocente.roles.length === 1;
                const mainDniHijo = newDocente.hijosDnis ? newDocente.hijosDnis.split(',')[0].trim() : '';

                let submitEmail = newDocente.email;
                if (isOnlyFamilia && mainDniHijo) {
                    submitEmail = `${mainDniHijo}@familia.com`;
                }

                const docenteData = {
                    nombre: newDocente.nombre,
                    apellido: newDocente.apellido,
                    displayName: `${newDocente.nombre} ${newDocente.apellido}`,
                    dni: newDocente.dni,
                    roles: newDocente.roles,
                    cursosAsignados: isOnlyFamilia ? [] : newDocente.cursos.split(',').map(c => c.trim()).filter(Boolean),
                    materiaEspecial: newDocente.roles.includes('docente_area') ? newDocente.materiaEspecial : null,
                    hijosDnis: newDocente.roles.includes('familia') ? newDocente.hijosDnis.split(',').map(h => h.trim()).filter(Boolean) : null,
                    cargo: newDocente.roles.includes('equipo_conduccion') ? newDocente.cargo : null
                };

                if (isOnlyFamilia) docenteData.email = submitEmail;

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
                const isOnlyFamilia = newDocente.roles.includes('familia') && newDocente.roles.length === 1;
                const mainDniHijo = newDocente.hijosDnis ? newDocente.hijosDnis.split(',')[0].trim() : '';

                let submitEmail = newDocente.email;
                let submitPassword = newDocente.password;

                if (isOnlyFamilia && mainDniHijo) {
                    submitEmail = `${mainDniHijo}@familia.com`;
                    submitPassword = mainDniHijo;
                }

                if (!submitEmail || !submitPassword) {
                    return showMessage('error', 'Faltan credenciales válidas o DNI de hijo para completar la cuenta.');
                }

                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, submitEmail, submitPassword);
                await signOut(secondaryAuth);

                const docenteData = {
                    nombre: newDocente.nombre,
                    apellido: newDocente.apellido,
                    displayName: `${newDocente.nombre} ${newDocente.apellido}`,
                    dni: newDocente.dni,
                    email: submitEmail,
                    roles: newDocente.roles,
                    cursosAsignados: isOnlyFamilia ? [] : newDocente.cursos.split(',').map(c => c.trim()).filter(Boolean),
                    materiaEspecial: newDocente.roles.includes('docente_area') ? newDocente.materiaEspecial : null,
                    hijosDnis: newDocente.roles.includes('familia') ? newDocente.hijosDnis.split(',').map(h => h.trim()).filter(Boolean) : null,
                    cargo: newDocente.roles.includes('equipo_conduccion') ? newDocente.cargo : null,
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
        setNewDocente({ nombre: '', apellido: '', dni: '', email: '', password: '', roles: ['docente'], cursos: '', materiaEspecial: '', hijosDnis: '', cargo: '' });
    };

    const downloadTeacherCSVModel = () => {
        const csvContent = "data:text/csv;charset=utf-8,NOMBRE,APELLIDO,DNI,EMAIL,PASSWORD,ROLES,CURSOS,MATERIA_ESPECIAL,HIJOS_DNIS\nJuan,Docente,12345678,juan@escuela.com,pass123,docente,1A-TM;2B-TT,, \nMaria,Especialista,87654321,maria@escuela.com,pass876,docente_area,1A-TM;1B-TM;1C-TM,Inglés, \nCarlos,Familiar,11223344,carlos@correo.com,pass112,familia,, ,44556677;88990011";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "modelo_importacion_docentes.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTeacherCSVUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setMsg({ type: 'info', text: 'Procesando archivo CSV de Docentes... Por favor espere.' });

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target.result;
                const rows = text.split('\n').filter(r => r.trim());
                let count = 0;

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].split(',').map(c => c.trim().replace(/"/g, ''));
                    if (cols.length >= 6) {
                        const [nombre, apellido, dni, email, password, rolesRaw, cursosRaw, materiaEspecial, hijosRaw] = cols;
                        if (!email || !password) continue;

                        const roles = rolesRaw.split(';').map(r => r.trim().toLowerCase()).filter(Boolean);
                        const cursosAsignados = cursosRaw ? cursosRaw.split(';').map(c => c.trim()).filter(Boolean) : [];
                        const hijosDnis = hijosRaw ? hijosRaw.split(';').map(h => h.trim()).filter(Boolean) : [];

                        try {
                            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                            await signOut(secondaryAuth);

                            const docenteData = {
                                nombre,
                                apellido,
                                displayName: `${nombre} ${apellido}`,
                                dni: dni || '',
                                email: email,
                                roles: roles.length > 0 ? roles : ['docente'],
                                cursosAsignados,
                                materiaEspecial: materiaEspecial || null,
                                hijosDnis,
                                createdAt: new Date(),
                                mustChangePassword: true
                            };

                            await setDoc(doc(db, 'docentes', userCredential.user.uid), docenteData);
                            count++;
                        } catch (err) {
                            console.error(`Error al crear docente ${email}:`, err);
                        }
                    }
                }

                await logActivity('Importación CSV Docentes', `Se crearon ${count} cuentas de docentes/usuarios por lote.`);
                showMessage('success', `Importación finalizada: ${count} cuentas creadas correctamente.`);
                fetchDocentes();
            } catch (err) {
                showMessage('error', 'Error al procesar el archivo CSV de docentes.');
                console.error(err);
            }
            e.target.value = null;
        };
        reader.readAsText(file);
    };

    const handleCreateEstudiante = async (e) => {
        e.preventDefault();
        setMsg({ type: 'info', text: editingEstudiante ? 'Actualizando datos del estudiante...' : 'Registrando estudiante y responsable...' });
        try {
            if (!newEstudiante.famDni || !newEstudiante.famCorreo || !newEstudiante.famApellido || !newEstudiante.famNombre || !newEstudiante.famTelefono) {
                return showMessage('error', 'Faltan datos obligatorios del familiar responsable.');
            }

            const q = query(collection(db, 'docentes'), where('dni', '==', newEstudiante.famDni));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const familiar = snap.docs[0];
                const famData = familiar.data();
                const updatedRoles = [...new Set([...(famData.roles || []), 'familia'])];
                const updatedHijos = [...new Set([...(famData.hijosDnis || []), newEstudiante.dni])];

                await updateDoc(doc(db, 'docentes', familiar.id), {
                    roles: updatedRoles,
                    hijosDnis: updatedHijos,
                    telefono: newEstudiante.famTelefono || famData.telefono || ''
                });
            } else {
                const submitEmail = newEstudiante.famCorreo.includes('@') ? newEstudiante.famCorreo : `${newEstudiante.famCorreo}@familia.com`;
                const submitPassword = newEstudiante.famDni;

                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, submitEmail, submitPassword);
                await signOut(secondaryAuth);

                const familiarData = {
                    nombre: newEstudiante.famNombre,
                    apellido: newEstudiante.famApellido,
                    displayName: `${newEstudiante.famNombre} ${newEstudiante.famApellido}`,
                    dni: newEstudiante.famDni,
                    email: submitEmail,
                    telefono: newEstudiante.famTelefono,
                    roles: ['familia'],
                    hijosDnis: [newEstudiante.dni],
                    createdAt: new Date(),
                    mustChangePassword: true
                };
                // Adding parentesco to famData directly helps keep it localized
                familiarData[`parentesco_${newEstudiante.dni}`] = newEstudiante.famParentesco;
                await setDoc(doc(db, 'docentes', userCredential.user.uid), familiarData);
            }

            const nuevoTurnoStr = newEstudiante.turno === 'Mañana' ? 'TM' : 'TT';
            const nuevoCursoId = `${newEstudiante.grado}${newEstudiante.seccion}-${nuevoTurnoStr}`;

            const estudianteData = {
                nombre: `${newEstudiante.apellido}, ${newEstudiante.nombre}`,
                dni: newEstudiante.dni,
                cursoId: nuevoCursoId,
                turno: newEstudiante.turno,
                famFiliacion: { dni: newEstudiante.famDni, parentesco: newEstudiante.famParentesco }
            };

            if (editingEstudiante) {
                await setDoc(doc(db, 'estudiantes', editingEstudiante), estudianteData, { merge: true });
                await logActivity('Actualizó Estudiante', `Se actualizó la ficha técnica del alumno ${estudianteData.nombre}.`);
                showMessage('success', 'Ficha del estudiante actualizada correctamente.');
            } else {
                estudianteData.asistencia = '0%';
                estudianteData.informes = [];
                estudianteData.historicoCursos = [];
                await addDoc(collection(db, 'estudiantes'), estudianteData);
                await logActivity('Matriculó Estudiante', `Se inscribió al alumno ${estudianteData.nombre} (Fam: ${newEstudiante.famApellido})`);
                showMessage('success', 'Estudiante y Familiar registrados correctamente.');
            }

            cancelEditEstudiante();
            fetchEstudiantes();
        } catch (err) {
            console.error(err);
            showMessage('error', 'Error en el guardado de estudiante: ' + err.message);
        }
    };

    const handleEditEstudiante = async (est) => {
        setEditingEstudiante(est.id);

        let nom = est.nombre.split(',')[1]?.trim() || '';
        let ape = est.nombre.split(',')[0]?.trim() || '';
        let gr = est.cursoId ? est.cursoId.charAt(0) : '';
        let sec = est.cursoId ? est.cursoId.charAt(1) : '';

        const initialForm = {
            nombre: nom,
            apellido: ape,
            dni: est.dni || '',
            grado: gr,
            seccion: sec,
            turno: est.turno || 'Mañana',
            famNombre: '',
            famApellido: '',
            famDni: est.famFiliacion?.dni || '',
            famTelefono: '',
            famCorreo: '',
            famParentesco: est.famFiliacion?.parentesco || 'Madre/Padre'
        };

        setNewEstudiante(initialForm);

        // Intento de cruce dinámico para traer datos del familiar responsable
        if (est.famFiliacion?.dni) {
            try {
                const q = query(collection(db, 'docentes'), where('dni', '==', est.famFiliacion.dni));
                const snap = await getDocs(q);
                if (!snap.empty) {
                    const famData = snap.docs[0].data();
                    setNewEstudiante(prev => ({
                        ...prev,
                        famNombre: famData.nombre || '',
                        famApellido: famData.apellido || '',
                        famTelefono: famData.telefono || '',
                        famCorreo: famData.email || ''
                    }));
                }
            } catch (err) {
                console.error("Error fetching familiar details for edit:", err);
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
        showMessage('info', 'Modificando ficha de alumno. Los datos del familiar se han precargado desde su cuenta de usuario.');
    };

    const cancelEditEstudiante = () => {
        setEditingEstudiante(null);
        setNewEstudiante({ nombre: '', apellido: '', dni: '', grado: '', seccion: '', turno: 'Mañana', famNombre: '', famApellido: '', famDni: '', famTelefono: '', famCorreo: '', famParentesco: 'Madre/Padre' });
    };

    const handleDeleteEstudiante = async (id, nombre) => {
        const safeNombre = nombre || 'este estudiante';
        const confirmed = window.confirm(`¿Seguro deseas ELIMINAR del sistema a ${safeNombre}?`);
        if (!confirmed) return;

        try {
            await deleteDoc(doc(db, 'estudiantes', id));
            await logActivity('Baja de Estudiante', `Baja física del alumno ${safeNombre}`);
            showMessage('success', 'Estudiante eliminado del padrón.');
            fetchEstudiantes();
        } catch (e) {
            console.error("Delete estudiante error:", e);
            showMessage('error', 'Error eliminando estudiante: ' + e.message);
        }
    };

    // CSV LOGIC
    const downloadCSVModel = () => {
        const csvContent = "data:text/csv;charset=utf-8,NOMBRE,APELLIDO,DNI,GRADO,SECCION,TURNO,FAM_NOMBRE,FAM_APELLIDO,FAM_DNI,FAM_TEL,FAM_CORREO\nJuan,Perez,12345678,1,A,Mañana,Carlos,Perez,11222333,1155556666,carlos@correo.com\nMaria,Gomez,87654321,3,B,Tarde,Ana,Gomez,33444555,1144445555,ana@correo.com";
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
                        const [nombre, apellido, dni, grado, seccion, turno, famN, famA, famD, famT, famC] = cols;
                        if (!dni) continue;

                        if (famD && famC && famA && famN) {
                            const q = query(collection(db, 'docentes'), where('dni', '==', famD));
                            const snap = await getDocs(q);
                            if (!snap.empty) {
                                const familiar = snap.docs[0];
                                const famData = familiar.data();
                                const updatedRoles = [...new Set([...(famData.roles || []), 'familia'])];
                                const updatedHijos = [...new Set([...(famData.hijosDnis || []), dni])];
                                await updateDoc(doc(db, 'docentes', familiar.id), { roles: updatedRoles, hijosDnis: updatedHijos });
                            } else {
                                const submitEmail = famC.includes('@') ? famC : `${famC}@familia.com`;
                                const userCredential = await createUserWithEmailAndPassword(secondaryAuth, submitEmail, famD);
                                await signOut(secondaryAuth);
                                const familiarData = {
                                    nombre: famN, apellido: famA, displayName: `${famN} ${famA}`, dni: famD, email: submitEmail, telefono: famT || '', roles: ['familia'], hijosDnis: [dni], createdAt: new Date(), mustChangePassword: true
                                };
                                await setDoc(doc(db, 'docentes', userCredential.user.uid), familiarData);
                            }
                        }

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

    const filteredEstudiantes = estudiantes.filter(e => {
        const matchName = e.nombre.toLowerCase().includes(searchStudentTerm.toLowerCase()) || String(e.dni || '').includes(searchStudentTerm);
        const matchCourse = searchStudentCourse === '' || e.cursoId === searchStudentCourse;
        return matchName && matchCourse;
    });

    const toggleSelectAll = () => {
        if (selectedEstudiantes.length === filteredEstudiantes.length && filteredEstudiantes.length > 0) {
            setSelectedEstudiantes([]);
        } else {
            setSelectedEstudiantes(filteredEstudiantes.map(e => e.id));
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

    const formatLastLogin = (iso) => {
        if (!iso) return <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nunca</span>;
        try {
            const diff = Date.now() - new Date(iso).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Hace un momento';
            if (mins < 60) return `Hace ${mins} min`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `Hace ${hrs}h`;
            const days = Math.floor(hrs / 24);
            if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
            return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch { return '—'; }
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
                    <Users size={18} /> Base Plantilla Docentes / Adm
                </button>
                <button
                    className={`btn ${activeTab === 'familias' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('familias')}
                >
                    <User size={18} /> Gestión de Familias
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
                <button
                    className={`btn ${activeTab === 'informes_c' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('informes_c')}
                >
                    <FileText size={18} /> Informes de Calificación
                </button>
                <button
                    className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => setActiveTab('config')}
                >
                    <Settings size={18} /> Configuración / Acceso
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
                            {!(newDocente.roles.includes('familia') && newDocente.roles.length === 1) && (
                                <>
                                    <div className="input-group">
                                        <input className="input-field" type="email" placeholder="Usuario (Email)" required disabled={editingDocente} value={newDocente.email} onChange={e => setNewDocente({ ...newDocente, email: e.target.value })} style={{ opacity: editingDocente ? 0.6 : 1 }} />
                                    </div>
                                    {!editingDocente && (
                                        <div className="input-group">
                                            <input className="input-field" type="password" placeholder="Contraseña de Acceso" required minLength={6} value={newDocente.password} onChange={e => setNewDocente({ ...newDocente, password: e.target.value })} />
                                        </div>
                                    )}
                                </>
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
                                        <input type="checkbox" checked={newDocente.roles.includes('equipo_conduccion')} onChange={() => handleRoleToggle('equipo_conduccion')} /> Equipo de Conducción
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

                            {newDocente.roles.includes('equipo_conduccion') && (
                                <div className="input-group">
                                    <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Cargo en Conducción</label>
                                    <select className="input-field" value={newDocente.cargo} onChange={e => setNewDocente({ ...newDocente, cargo: e.target.value })} required>
                                        <option value="" disabled>Seleccione el cargo...</option>
                                        <option value="Director/a">Director/a</option>
                                        <option value="Vicedirector/a">Vicedirector/a</option>
                                        <option value="Secretario/a">Secretario/a</option>
                                        <option value="Prosecretario/a">Prosecretario/a</option>
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
                                    <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Cursos Asignados (Múltiple Selección)</label>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Mantenga pulsado Ctrl (o Cmd en Mac) para seleccionar más de uno.</p>
                                    <select
                                        className="input-field"
                                        multiple
                                        style={{ minHeight: '120px' }}
                                        value={newDocente.cursos.split(', ').filter(Boolean)}
                                        onChange={e => {
                                            const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                                            setNewDocente({ ...newDocente, cursos: selectedOptions.join(', ') });
                                        }}
                                    >
                                        {ALL_COURSES.map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary w-full mt-4">
                                {editingDocente ? 'Actualizar Modificaciones' : 'Registrar Perfil Completo'}
                            </button>
                            {editingDocente && (
                                <button type="button" onClick={cancelEditDocente} className="btn w-full mt-2" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}>Cancelar Edición</button>
                            )}
                        </form>

                        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                            <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Importación Masiva de Docentes</h4>
                            <div className="flex flex-col gap-3">
                                <button onClick={downloadTeacherCSVModel} className="btn btn-outline w-full flex items-center justify-center gap-2">
                                    <FileText size={18} /> Descargar Modelo CSV
                                </button>
                                <label className="btn btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
                                    <UploadCloud size={18} /> Subir CSV de Docentes
                                    <input type="file" accept=".csv" onChange={handleTeacherCSVUpload} style={{ display: 'none' }} />
                                </label>
                            </div>
                        </div>
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
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Últ. Conexión</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Admin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docentes.filter(d => (d.roles || []).some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r))).map(d => (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 600 }}>{d.displayName}</div>
                                                <div className="flex gap-1 flex-wrap mt-1">
                                                    {(d.roles || (d.role ? [d.role] : ['docente'])).map((rolName, i) => (
                                                        <span key={i} className={`badge ${['administrador', 'equipo_conduccion'].includes(rolName) ? 'badge-error' : rolName === 'familia' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                                                            {rolName === 'docente' ? 'Titular'
                                                                : rolName === 'docente_area' ? `Área`
                                                                    : rolName === 'equipo_conduccion' ? (d.cargo || 'Conducción')
                                                                        : rolName.toUpperCase()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{d.dni}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div>{d.email}</div>
                                                <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.75rem' }}>{d.cursosAsignados?.join(', ')}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {formatLastLogin(d.lastLogin)}
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleEditDocente(d)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }} title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={(evt) => { evt.stopPropagation(); handleDeleteDocente(d.id, d.displayName); }}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.25rem 0.5rem', borderColor: '#fca5a5', color: '#ef4444' }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {docentes.filter(d => (d.roles || []).some(r => ['docente', 'docente_area', 'administrador', 'equipo_conduccion'].includes(r))).length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No hay usuarios registrados.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'familias' && (
                <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                    <div className="card">
                        <h3 className="mb-4 flex items-center gap-2">
                            <User size={20} />
                            {editingDocente ? 'Modificar Usuario' : 'Alta Directa de Familiar'}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>Nota: Los familiares se crean habitualmente al matricular un alumno, pero aquí puede gestionarlos manualmente.</p>
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
                                <label className="input-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Perfil</label>
                                <div className="badge badge-success">SÓLO ACCESO FAMILIA</div>
                                <input type="hidden" value="familia" />
                            </div>

                            <div className="input-group">
                                <input className="input-field" placeholder="DNI de los Hijos (separados por coma)" required value={newDocente.hijosDnis} onChange={e => setNewDocente({ ...newDocente, hijosDnis: e.target.value, roles: ['familia'] })} />
                            </div>

                            <button type="submit" className="btn btn-primary w-full mt-4">
                                {editingDocente ? 'Actualizar Familiar' : 'Registrar Familiar'}
                            </button>
                            {editingDocente && (
                                <button type="button" onClick={cancelEditDocente} className="btn w-full mt-2" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}>Cancelar Edición</button>
                            )}
                        </form>
                    </div>

                    <div className="card" style={{ overflowX: 'auto' }}>
                        <h3 className="mb-4 flex items-center justify-between">
                            Nómina de Familiares Registrados
                            <button onClick={fetchDocentes} className="btn"><RefreshCcw size={16} /></button>
                        </h3>
                        {loadingDocentes ? <p>Cargando datos...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre y Apellido</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>DNI</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Email / Hijos vinculados</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Admin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {docentes.filter(d => (d.roles || []).length === 1 && d.roles.includes('familia')).map(d => (
                                        <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div style={{ fontWeight: 600 }}>{d.displayName}</div>
                                                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>FAMILIA</span>
                                            </td>
                                            <td style={{ padding: '0.5rem' }}>{d.dni}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <div>{d.email}</div>
                                                <div style={{ color: 'var(--color-primary)', fontSize: '0.75rem' }}>Hijos: {d.hijosDnis?.join(', ')}</div>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleEditDocente(d)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}>
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={(evt) => { evt.stopPropagation(); handleDeleteDocente(d.id, d.displayName); }}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.25rem 0.5rem', borderColor: '#fca5a5', color: '#ef4444' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {docentes.filter(d => (d.roles || []).length === 1 && d.roles.includes('familia')).length === 0 && <tr><td colSpan="4" style={{ padding: '1rem', textAlign: 'center' }}>No existen familiares registrados exclusivamente bajo este rol.</td></tr>}
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
                            <h3 className="mb-4 flex items-center gap-2">
                                <UserPlus size={20} />
                                {editingEstudiante ? 'Editar Ficha Alumno' : 'Matricular por Menor (1 u.)'}
                            </h3>
                            <form onSubmit={handleCreateEstudiante}>
                                <div className="input-group">
                                    <input className="input-field" placeholder="Nombre" required value={newEstudiante.nombre} onChange={e => setNewEstudiante({ ...newEstudiante, nombre: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input className="input-field" placeholder="Apellido" required value={newEstudiante.apellido} onChange={e => setNewEstudiante({ ...newEstudiante, apellido: e.target.value })} />
                                </div>
                                <div className="input-group">
                                    <input className="input-field" placeholder="DNI Estudiante" required value={newEstudiante.dni} onChange={e => setNewEstudiante({ ...newEstudiante, dni: e.target.value })} />
                                </div>
                                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Responsable Familiar (Obligatorio)</h4>
                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                    <div className="input-group">
                                        <input className="input-field" placeholder="Nombre Familiar" required value={newEstudiante.famNombre} onChange={e => setNewEstudiante({ ...newEstudiante, famNombre: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <input className="input-field" placeholder="Apellido Familiar" required value={newEstudiante.famApellido} onChange={e => setNewEstudiante({ ...newEstudiante, famApellido: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                    <div className="input-group">
                                        <input className="input-field" placeholder="DNI Fam (Clave Prov.)" required value={newEstudiante.famDni} onChange={e => setNewEstudiante({ ...newEstudiante, famDni: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <input className="input-field" placeholder="Teléfono" required={!editingEstudiante} value={newEstudiante.famTelefono} onChange={e => setNewEstudiante({ ...newEstudiante, famTelefono: e.target.value })} />
                                    </div>
                                    <div className="input-group">
                                        <select className="input-field" value={newEstudiante.famParentesco} onChange={e => setNewEstudiante({ ...newEstudiante, famParentesco: e.target.value })}>
                                            <option value="Madre/Padre">Madre / Padre</option>
                                            <option value="Tutor">Tutor / Tutor Legal</option>
                                            <option value="Abuelo/a">Abuelo /a</option>
                                            <option value="Hermano/a mayor">Hermano /a mayor</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <input className="input-field" type="email" placeholder="Correo Electrónico Familiar" required={!editingEstudiante} value={newEstudiante.famCorreo} onChange={e => setNewEstudiante({ ...newEstudiante, famCorreo: e.target.value })} />
                                </div>

                                <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '0.9rem', color: 'var(--color-primary)' }}>Ciclo Lectivo</h4>
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
                                <button type="submit" className="btn btn-secondary w-full mt-4">
                                    {editingEstudiante ? 'Actualizar Ficha Técnica' : 'Guardar Alta Ficha Única'}
                                </button>
                                {editingEstudiante && (
                                    <button type="button" onClick={cancelEditEstudiante} className="btn w-full mt-2" style={{ backgroundColor: 'transparent', color: 'var(--color-text-muted)' }}>Cancelar Modificación</button>
                                )}
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
                                <span className="badge badge-success ml-2">{filteredEstudiantes.length} Filtro / {estudiantes.length} Total</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={toggleSelectAll} className="btn btn-outline" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                    <CheckSquare size={16} /> Select Todo
                                </button>
                                <button onClick={fetchEstudiantes} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}><RefreshCcw size={16} /></button>
                            </div>
                        </h3>

                        <div className="grid mb-4" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <input className="input-field" placeholder="Buscar por Nombre, Apellido o DNI..." value={searchStudentTerm} onChange={e => setSearchStudentTerm(e.target.value)} />
                            </div>
                            <div className="input-group" style={{ marginBottom: 0 }}>
                                <select className="input-field" value={searchStudentCourse} onChange={e => setSearchStudentCourse(e.target.value)}>
                                    <option value="">Todos los Cursos</option>
                                    {ALL_COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        {loadingEstudiantes ? <p>Cargando padrón...</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        <th style={{ padding: '0.5rem', width: '40px', textAlign: 'center' }}>
                                            <input type="checkbox" checked={selectedEstudiantes.length === filteredEstudiantes.length && filteredEstudiantes.length > 0} onChange={toggleSelectAll} />
                                        </th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Nombre Estudiante</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>DNI</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'left' }}>Curso</th>
                                        <th style={{ padding: '0.5rem', textAlign: 'right' }}>Admin</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEstudiantes.map(e => (
                                        <tr key={e.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: selectedEstudiantes.includes(e.id) ? 'rgba(4,75,127,0.05)' : 'transparent' }}>
                                            <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                                <input type="checkbox" checked={selectedEstudiantes.includes(e.id)} onChange={() => toggleStudentSelection(e.id)} />
                                            </td>
                                            <td style={{ padding: '0.5rem', fontWeight: 600 }}>{e.nombre}</td>
                                            <td style={{ padding: '0.5rem' }}>{e.dni}</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <span className="badge badge-success">{getCourseLabel(e.cursoId)}</span>
                                            </td>
                                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                <button onClick={() => handleEditEstudiante(e)} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }} title="Editar">
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={(evt) => { evt.stopPropagation(); handleDeleteEstudiante(e.id, e.nombre); }}
                                                    className="btn btn-outline"
                                                    style={{ padding: '0.25rem 0.5rem', borderColor: '#fca5a5', color: '#ef4444' }}
                                                    title="Eliminar"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredEstudiantes.length === 0 && <tr><td colSpan="5" style={{ padding: '1rem', textAlign: 'center' }}>No hay estudiantes que coincidan con la búsqueda.</td></tr>}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
            {activeTab === 'actividad' && (
                <div className="card w-full">
                    <h3 className="mb-4 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <Activity color="var(--color-primary)" />
                            Registro Histórico de Movimientos
                        </div>
                        {logs.length > 0 && (
                            <button
                                onClick={handleClearLogs}
                                className="btn btn-outline"
                                style={{ borderColor: '#fca5a5', color: '#ef4444', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                                disabled={savingSettings}
                            >
                                <Trash2 size={14} /> Vaciar Historial
                            </button>
                        )}
                    </h3>
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {loadingLogs ? (
                            <p>Cargando registros...</p>
                        ) : logs.length === 0 ? (
                            <p>No se encontraron movimientos registrados.</p>
                        ) : (
                            <table className="app-table">
                                <thead>
                                    <tr>
                                        <th>Fecha y Hora</th>
                                        <th>Operador (Usuario)</th>
                                        <th>Tipo de Acción</th>
                                        <th>Detalles Técnicos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                                {new Date(log.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{log.usuario}</td>
                                            <td><span className="badge badge-warning">{log.accion}</span></td>
                                            <td style={{ fontSize: '0.85rem' }}>{log.detalles}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'informes_c' && (
                <InformesConduccion />
            )}

            {activeTab === 'config' && (
                <div className="card w-full">
                    <h3 className="mb-4 flex items-center gap-2">
                        <Settings color="var(--color-primary)" />
                        Configuración de Acceso y Visibilidad
                    </h3>
                    <p className="mb-8 color-text-muted">Utilice esta sección para controlar el acceso global de los usuarios externos a la plataforma.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="card" style={{ border: appSettings.allowFamilyAccess ? '1px solid var(--color-success)' : '1px solid var(--color-error)', backgroundColor: appSettings.allowFamilyAccess ? 'rgba(16,185,129,0.02)' : 'rgba(239,68,68,0.02)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: appSettings.allowFamilyAccess ? 'var(--color-success)' : 'var(--color-error)' }} className="flex items-center gap-2">
                                        {appSettings.allowFamilyAccess ? <Unlock size={20} /> : <Lock size={20} />}
                                        Acceso de Usuarios "Familias"
                                    </h4>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                                        {appSettings.allowFamilyAccess
                                            ? 'Actualmente, los familiares pueden ingresar para ver los boletines.'
                                            : 'El acceso para familiares está BLOQUEADO temporalmente.'}
                                    </p>
                                </div>
                                <button
                                    className={`btn ${appSettings.allowFamilyAccess ? 'btn-secondary' : 'btn-primary'}`}
                                    onClick={handleToggleFamilyAccess}
                                    disabled={savingSettings}
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    {savingSettings ? 'Procesando...' : appSettings.allowFamilyAccess ? 'Deshabilitar Acceso' : 'Habilitar Acceso'}
                                </button>
                            </div>
                            <div className="badge" style={{ backgroundColor: appSettings.allowFamilyAccess ? '#d1fae5' : '#fee2e2', color: appSettings.allowFamilyAccess ? '#065f46' : '#991b1b' }}>
                                Estado: {appSettings.allowFamilyAccess ? 'PERSONAL HABILITADO' : 'SISTEMA CERRADO'}
                            </div>
                        </div>

                        <div className="card" style={{ border: appSettings.allowTeacherDataEntry ? '1px solid var(--color-primary)' : '1px solid var(--color-warning)', backgroundColor: appSettings.allowTeacherDataEntry ? 'rgba(4,75,127,0.02)' : 'rgba(245,158,11,0.02)' }}>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-primary)' }} className="flex items-center gap-2">
                                        <PenTool size={20} />
                                        Carga de Datos (Docentes)
                                    </h4>
                                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
                                        {appSettings.allowTeacherDataEntry
                                            ? 'Los docentes pueden cargar y modificar calificaciones.'
                                            : 'SISTEMA EN SOLO LECTURA: Docentes no pueden modificar datos.'}
                                    </p>
                                </div>
                                <button
                                    className={`btn ${appSettings.allowTeacherDataEntry ? 'btn-outline' : 'btn-primary'}`}
                                    onClick={handleToggleTeacherDataEntry}
                                    disabled={savingSettings}
                                    style={{ padding: '0.5rem 1rem' }}
                                >
                                    {appSettings.allowTeacherDataEntry ? 'Bloquear Edición' : 'Habilitar Edición'}
                                </button>
                            </div>
                            <div className="badge" style={{ backgroundColor: appSettings.allowTeacherDataEntry ? '#d1fae5' : '#fef3c7', color: appSettings.allowTeacherDataEntry ? '#065f46' : '#92400e' }}>
                                Estado: {appSettings.allowTeacherDataEntry ? 'EDICIÓN HABILITADA' : 'MODO SOLO LECTURA'}
                            </div>
                        </div>

                        <div className="card" style={{ border: '1px solid var(--color-border)' }}>
                            <h4 className="flex items-center gap-2 mb-2"><RefreshCcw size={18} /> Mantenimiento de Ciclo</h4>
                            <p style={{ fontSize: '0.85rem' }} className="mb-4">Limpieza de registros de auditoría y preparación para el cierre de ciclo.</p>
                            <button
                                onClick={handleClearLogs}
                                className="btn btn-outline w-full"
                                style={{ borderColor: '#fca5a5', color: '#ef4444' }}
                                disabled={savingSettings}
                            >
                                <Trash2 size={16} /> Vaciar Todo el Historial de Historial de Movimientos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
