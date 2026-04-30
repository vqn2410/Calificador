import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { User, FileText, GraduationCap } from 'lucide-react';
import { getCourseLabel } from '../config/constants';

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
                // Ensure hijosDnis is an array (handle legacy string data if exists)
                let rawDnis = currentUser.hijosDnis;
                if (typeof rawDnis === 'string') {
                    rawDnis = rawDnis.split(',').map(s => s.trim()).filter(Boolean);
                }
                
                if (!Array.isArray(rawDnis)) {
                    setLoading(false);
                    return;
                }

                let searchTerms = [];
                rawDnis.forEach(d => {
                    if (!d) return;
                    const clean = String(d).replace(/[\.\s-]/g, '');
                    const dotted = clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
                    
                    searchTerms.push(clean);
                    searchTerms.push(dotted);
                    
                    // Also try original just in case it has weird characters we didn't account for
                    searchTerms.push(String(d).trim());
                    
                    if (!isNaN(clean) && clean !== '') {
                        searchTerms.push(Number(clean));
                    }
                });

                // Unique search terms, max 30 for modern Firestore 'in' limitation
                const dnisBatch = [...new Set(searchTerms)].slice(0, 30);
                if (dnisBatch.length === 0) {
                    setLoading(false);
                    return;
                }

                const q = query(collection(db, 'estudiantes'), where('dni', 'in', dnisBatch));
                const snap = await getDocs(q);

                const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Final safety: if we matched multiple formats of the same student, unique by id
                const uniqueHijos = [];
                const seen = new Set();
                data.forEach(h => {
                    if (!seen.has(h.id)) {
                        uniqueHijos.push(h);
                        seen.add(h.id);
                    }
                });

                setHijos(uniqueHijos);
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
            <p className="mb-4 flex flex-wrap gap-2 justify-between items-center" style={{ color: 'var(--color-text-muted)' }}>
                <span>Acceso exclusivo a la información y trayectoria educativa de sus estudiantes correspondientes.</span>
                {hijos.length > 0 && <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem' }}>{hijos.length} Estudiante(s) vinculado(s)</span>}
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
                <>
                    {(() => {
                        const raw = currentUser.hijosDnis;
                        const expected = Array.isArray(raw) ? raw.length : (typeof raw === 'string' ? raw.split(',').filter(Boolean).length : 0);
                        
                        if (hijos.length < expected) {
                            return (
                                <div className="badge badge-warning" style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem', textAlign: 'center', justifyContent: 'center' }}>
                                    Atención: Posee {expected} estudiantes vinculados en su perfil, pero solo se han encontrado datos de {hijos.length}.
                                    Esto puede deberse a que algunos estudiantes aún no han sido registrados en el sistema.
                                </div>
                            );
                        }
                        return null;
                    })()}
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
                                        <strong>Curso Actual:</strong> {getCourseLabel(hijo.cursoId)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText size={18} color="var(--color-text-muted)" />
                                    <span>
                                        <strong>Boletines Disponibles:</strong> {hijo.informes?.length || 0} Trimestre(s)
                                    </span>
                                </div>
                            </div>

                            <Link to={`/estudiantes/${hijo.id}`} className="btn btn-primary w-full">
                                Ingresar al Boletín Digital
                            </Link>
                        </div>
                    ))}
                </div>
                </>
            )}
        </div>
    );
}
