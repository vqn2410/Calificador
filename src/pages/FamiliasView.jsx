import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { User, FileText, GraduationCap } from 'lucide-react';

export default function FamiliasView() {
    const { currentUser } = useAuth();
    const [hijos, setHijos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchHijos() {
            if (!currentUser?.hijosDnis || currentUser.hijosDnis.length === 0) {
                setLoading(false);
                return;
            }

            try {
                // Fetch students matching the DNIS
                // Firestore 'in' query has a limit of 10 items, which is more than enough for children DNIs
                const dnisBatch = currentUser.hijosDnis.slice(0, 10);
                const q = query(collection(db, 'estudiantes'), where('dni', 'in', dnisBatch));
                const snap = await getDocs(q);

                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setHijos(data);
            } catch (error) {
                console.error("Error fetching hijos:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchHijos();
    }, [currentUser]);

    if (loading) return <div className="container"><h2>Cargando información familiar...</h2></div>;

    return (
        <div className="container" style={{ paddingBottom: '3rem' }}>
            <h1 className="mb-2">Portal de Familias</h1>
            <p className="mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Acceso exclusivo a la información y trayectoria educativa de sus estudiantes correspondientes.
            </p>

            {hijos.length === 0 ? (
                <div className="card text-center" style={{ padding: '3rem 1rem' }}>
                    <h3 style={{ color: 'var(--color-primary)' }}>Sin estudiantes asignados</h3>
                    <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        No se ha encontrado a ningún estudiante vinculado al DNI provisto por la institución.
                        Si cree que esto es un error, contáctese con la preceptoría.
                    </p>
                </div>
            ) : (
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {hijos.map(hijo => (
                        <div key={hijo.id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div className="flex items-center gap-4 mb-4" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
                                <div style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '1rem', borderRadius: '50%' }}>
                                    <User size={32} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, color: 'var(--color-primary)', fontSize: '1.2rem' }}>{hijo.nombre}</h3>
                                    <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>DNI: {hijo.dni}</p>
                                </div>
                            </div>

                            <div className="mb-4 flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <GraduationCap size={18} color="var(--color-text-muted)" />
                                    <span>
                                        <strong>Curso Actual:</strong> {hijo.cursoId} ({hijo.turno})
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={18} color="var(--color-text-muted)" />
                                    <span>
                                        <strong>Boletines Disponibles:</strong> {hijo.informes?.length || 0} Trimestre(s)
                                    </span>
                                </div>
                            </div>

                            <Link
                                to={`/estudiantes/${hijo.id}`}
                                className="btn btn-primary w-full"
                                style={{ textAlign: 'center', justifyContent: 'center' }}
                            >
                                Ingresar al Boletín Digital
                            </Link>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
