import { useState, useEffect } from 'react';
import {
    collection, addDoc, query, orderBy,
    serverTimestamp, updateDoc, doc, onSnapshot, getDocs, Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Send, Clock, Calendar, Trash2, CheckCircle2, Mail } from 'lucide-react';

const SENDER_ROLES = ['administrador', 'equipo_conduccion', 'docente', 'docente_area'];

const BROADCAST_OPTIONS = [
    { value: 'familias', label: 'Todas las familias', icon: '👨‍👩‍👧' },
    { value: 'docentes', label: 'Todos los docentes', icon: '📚' },
    { value: 'todos', label: 'Toda la institución', icon: '🏫' },
];

const ALL_COURSES = [];
[1, 2, 3, 4, 5, 6].forEach(g =>
    ['A', 'B', 'C', 'D'].forEach(s => {
        ALL_COURSES.push(`${g}${s}-TM`);
        ALL_COURSES.push(`${g}${s}-TT`);
    })
);

function AudienceBadge({ audiencia }) {
    if (!audiencia) return null;
    const map = {
        familias: ['#dbeafe', '#1e40af', '👨‍👩‍👧 Familias'],
        docentes: ['#dcfce7', '#166534', '📚 Docentes'],
        todos: ['#fef9c3', '#854d0e', '🏫 Todos'],
    };
    const entry = map[audiencia];
    if (entry) return <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, backgroundColor: entry[0], color: entry[1], fontWeight: 600 }}>{entry[2]}</span>;
    if (audiencia.startsWith('curso:')) return <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: 600 }}>🎓 {audiencia.replace('curso:', '')}</span>;
    if (audiencia.startsWith('usuario:')) return <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, backgroundColor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}>👤 Individual</span>;
    return null;
}

// Min datetime string for the input (now + 5 minutes)
function minDatetime() {
    const d = new Date(Date.now() + 5 * 60000);
    return d.toISOString().slice(0, 16);
}

export default function Mensajeria() {
    const { currentUser, activeRole } = useAuth();
    const canSend = SENDER_ROLES.includes(activeRole);

    const [tab, setTab] = useState('recibidos');
    const [mensajes, setMensajes] = useState([]);
    const [programados, setProgramados] = useState([]);
    const [loading, setLoading] = useState(true);

    // Compose state
    const [titulo, setTitulo] = useState('');
    const [cuerpo, setCuerpo] = useState('');
    const [audienciaTipo, setAudienciaTipo] = useState('broadcast');
    const [audienciaBroadcast, setAudienciaBroadcast] = useState('familias');
    const [audienciaCurso, setAudienciaCurso] = useState('');
    const [audienciaUsuario, setAudienciaUsuario] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [usuarios, setUsuarios] = useState([]);
    const [sendEmail, setSendEmail] = useState(false);
    const [programar, setProgramar] = useState(false);
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    const uid = currentUser?.uid;
    const nombre = currentUser?.displayName || currentUser?.email || 'Usuario';

    // Load users for individual picker
    useEffect(() => {
        if (!canSend) return;
        getDocs(collection(db, 'docentes')).then(snap => {
            setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    }, [canSend]);

    // Real-time messages
    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, 'mensajes'), orderBy('fechaEnvio', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sent = all.filter(m => m.estado !== 'programado' && (
                activeRole === 'familia'
                    ? m.audiencia === 'familias' || m.audiencia === 'todos' || m.audiencia === `usuario:${uid}`
                    : true
            ));
            const sched = canSend ? all.filter(m => m.estado === 'programado' && m.enviadoPorUid === uid) : [];
            setMensajes(sent);
            setProgramados(sched);
            setLoading(false);
        });
        return () => unsub();
    }, [uid, activeRole, canSend]);

    // Check due scheduled messages (client-side fallback when no Cloud Functions)
    useEffect(() => {
        if (!canSend) return;
        const interval = setInterval(async () => {
            const now = new Date();
            for (const m of programados) {
                if (!m.fechaProgramada) continue;
                const due = m.fechaProgramada.toDate ? m.fechaProgramada.toDate() : new Date(m.fechaProgramada);
                if (due <= now) {
                    await updateDoc(doc(db, 'mensajes', m.id), {
                        estado: 'enviado',
                        fechaEnvio: Timestamp.now(),
                    });
                }
            }
        }, 60000); // check every minute
        return () => clearInterval(interval);
    }, [programados, canSend]);

    function getAudiencia() {
        if (audienciaTipo === 'broadcast') return audienciaBroadcast;
        if (audienciaTipo === 'curso') return audienciaCurso ? `curso:${audienciaCurso}` : '';
        if (audienciaTipo === 'usuario') return audienciaUsuario ? `usuario:${audienciaUsuario}` : '';
        return '';
    }

    async function handleSend(e) {
        e.preventDefault();
        const audiencia = getAudiencia();
        if (!titulo.trim() || !cuerpo.trim() || !audiencia) return;
        setSending(true);
        try {
            const payload = {
                titulo: titulo.trim(),
                cuerpo: cuerpo.trim(),
                audiencia,
                enviadoPorUid: uid,
                enviadoPorNombre: nombre,
                enviadoPorRol: activeRole,
                leido: {},
                enviarEmail: sendEmail,
                estado: programar && fechaProgramada ? 'programado' : 'enviado',
            };

            if (programar && fechaProgramada) {
                payload.fechaProgramada = Timestamp.fromDate(new Date(fechaProgramada));
                payload.fechaEnvio = null;
            } else {
                payload.fechaProgramada = null;
                payload.fechaEnvio = serverTimestamp();
            }

            await addDoc(collection(db, 'mensajes'), payload);

            // Reset
            setTitulo(''); setCuerpo(''); setAudienciaUsuario('');
            setUserSearch(''); setProgramar(false); setFechaProgramada('');
            setSendEmail(false);
            setSent(true);
            setTimeout(() => setSent(false), 3500);
            setTab('recibidos');
        } catch (err) {
            alert('Error al enviar: ' + err.message);
        } finally { setSending(false); }
    }

    async function cancelarProgramado(id) {
        if (confirm('¿Cancelar este mensaje programado?')) {
            await updateDoc(doc(db, 'mensajes', id), { estado: 'cancelado' });
        }
    }

    const isUnread = m => !(m.leido?.[uid]);
    const unreadCount = mensajes.filter(isUnread).length;

    function formatDate(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Date.now() - d;
        if (diff < 60000) return 'Hace un momento';
        if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
        if (diff < 86400000) return `Hace ${Math.floor(diff / 3600000)}h`;
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    function formatScheduled(ts) {
        if (!ts) return '';
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }

    const tabStyle = t => ({
        padding: '0.55rem 1.1rem', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s',
        backgroundColor: tab === t ? 'var(--color-primary)' : 'transparent',
        color: tab === t ? 'white' : 'var(--color-text-muted)',
    });

    const tipoStyle = t => ({
        flex: 1, padding: '0.5rem 0.4rem', border: `2px solid ${audienciaTipo === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: '0.78rem',
        fontWeight: 600, backgroundColor: audienciaTipo === t ? 'rgba(59,130,246,0.08)' : 'transparent',
        color: audienciaTipo === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
    });

    const filteredUsers = usuarios.filter(u => {
        const s = userSearch.toLowerCase();
        return !s || (u.displayName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
    });

    return (
        <div className="container" style={{ paddingBottom: '3rem', maxWidth: 740 }}>

            {/* Header */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h1 className="flex items-center gap-2">
                        <MessageSquare color="var(--color-primary)" size={28} />
                        Mensajería
                    </h1>
                    <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Comunicados y notificaciones institucionales</p>
                </div>
                {unreadCount > 0 && (
                    <span style={{ backgroundColor: 'var(--color-error)', color: 'white', padding: '0.25rem 0.75rem', borderRadius: 20, fontWeight: 700, fontSize: '0.8rem' }}>
                        {unreadCount} sin leer
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', padding: '0.35rem', backgroundColor: 'var(--color-background)', borderRadius: 24, marginBottom: '1.25rem', width: 'fit-content', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                <button style={tabStyle('recibidos')} onClick={() => setTab('recibidos')}>
                    📥 Recibidos {unreadCount > 0 && `(${unreadCount})`}
                </button>
                {canSend && programados.length > 0 && (
                    <button style={tabStyle('programados')} onClick={() => setTab('programados')}>
                        🕐 Programados ({programados.length})
                    </button>
                )}
                {canSend && (
                    <button style={tabStyle('enviar')} onClick={() => setTab('enviar')}>
                        ✉️ Redactar
                    </button>
                )}
            </div>

            {/* ── RECIBIDOS ── */}
            {tab === 'recibidos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loading && <p style={{ color: 'var(--color-text-muted)' }}>Cargando mensajes...</p>}
                    {!loading && mensajes.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <MessageSquare size={48} color="var(--color-border)" style={{ marginBottom: '1rem' }} />
                            <p style={{ margin: 0 }}>No hay mensajes aún.</p>
                        </div>
                    )}
                    {mensajes.map(msg => (
                        <div key={msg.id} className="card"
                            onClick={() => updateDoc(doc(db, 'mensajes', msg.id), { [`leido.${uid}`]: true }).catch(() => { })}
                            style={{ cursor: 'default', borderLeft: `4px solid ${isUnread(msg) ? 'var(--color-primary)' : 'var(--color-border)'}`, padding: '1rem 1.25rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {isUnread(msg) && <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'inline-block', flexShrink: 0 }} />}
                                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{msg.titulo}</span>
                                    <AudienceBadge audiencia={msg.audiencia} />
                                    {msg.enviarEmail && <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 600 }}>📧 Email</span>}
                                </div>
                                <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatDate(msg.fechaEnvio)}</span>
                            </div>
                            <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{msg.cuerpo}</p>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>Enviado por <strong>{msg.enviadoPorNombre}</strong></div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── PROGRAMADOS ── */}
            {tab === 'programados' && canSend && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {programados.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <Clock size={40} color="var(--color-border)" style={{ marginBottom: '1rem' }} />
                            <p style={{ margin: 0 }}>No hay mensajes programados.</p>
                        </div>
                    )}
                    {programados.map(msg => (
                        <div key={msg.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)', padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                                        <Clock size={14} color="var(--color-warning)" />
                                        <span style={{ fontWeight: 700 }}>{msg.titulo}</span>
                                        <AudienceBadge audiencia={msg.audiencia} />
                                        {msg.enviarEmail && <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 8, backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 600 }}>📧 Email</span>}
                                    </div>
                                    <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{msg.cuerpo}</p>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                                        📅 Se enviará el {formatScheduled(msg.fechaProgramada)}
                                    </div>
                                </div>
                                <button
                                    onClick={() => cancelarProgramado(msg.id)}
                                    style={{ color: 'var(--color-error)', background: 'none', border: '1px solid var(--color-error)', borderRadius: 8, padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.78rem', flexShrink: 0 }}
                                >
                                    <Trash2 size={14} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── REDACTAR ── */}
            {tab === 'enviar' && canSend && (
                <div className="card">
                    <h3 style={{ marginBottom: '1.25rem' }}>✉️ Nueva notificación</h3>
                    {sent && (
                        <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 size={16} /> {programar ? 'Mensaje programado con éxito' : 'Mensaje enviado exitosamente'}
                        </div>
                    )}
                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

                        {/* Tipo destino */}
                        <div>
                            <label className="input-label">Tipo de destino</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button type="button" style={tipoStyle('broadcast')} onClick={() => setAudienciaTipo('broadcast')}>🌐 General</button>
                                <button type="button" style={tipoStyle('curso')} onClick={() => setAudienciaTipo('curso')}>🎓 Por Curso</button>
                                <button type="button" style={tipoStyle('usuario')} onClick={() => setAudienciaTipo('usuario')}>👤 Individual</button>
                            </div>
                        </div>

                        {/* Broadcast */}
                        {audienciaTipo === 'broadcast' && (
                            <div>
                                <label className="input-label">Dirigido a</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {BROADCAST_OPTIONS.map(opt => (
                                        <button key={opt.value} type="button"
                                            onClick={() => setAudienciaBroadcast(opt.value)}
                                            style={{
                                                padding: '0.5rem 0.9rem', borderRadius: 20, fontSize: '0.82rem',
                                                cursor: 'pointer', fontWeight: 600,
                                                backgroundColor: audienciaBroadcast === opt.value ? 'var(--color-primary)' : 'var(--color-background)',
                                                color: audienciaBroadcast === opt.value ? 'white' : 'var(--color-text-main)',
                                                border: `1.5px solid ${audienciaBroadcast === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                            }}>
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Por Curso */}
                        {audienciaTipo === 'curso' && (
                            <div>
                                <label className="input-label" htmlFor="curso-sel">Curso</label>
                                <select id="curso-sel" className="input-field" value={audienciaCurso} onChange={e => setAudienciaCurso(e.target.value)} required>
                                    <option value="">-- Elegí un curso --</option>
                                    {ALL_COURSES.map(c => <option key={c} value={c}>{c} – Familias</option>)}
                                </select>
                            </div>
                        )}

                        {/* Individual */}
                        {audienciaTipo === 'usuario' && (
                            <div>
                                <label className="input-label">Buscar usuario</label>
                                <input className="input-field" placeholder="Nombre o email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: '0.5rem' }} />
                                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                                    {filteredUsers.slice(0, 20).map(u => (
                                        <div key={u.id} onClick={() => { setAudienciaUsuario(u.id); setUserSearch(u.displayName || u.email || ''); }}
                                            style={{ padding: '0.6rem 0.9rem', cursor: 'pointer', fontSize: '0.85rem', backgroundColor: audienciaUsuario === u.id ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: audienciaUsuario === u.id ? '3px solid var(--color-primary)' : '3px solid transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--color-background)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0 }}>
                                                {(u.displayName || u.email || '?')[0].toUpperCase()}
                                            </span>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.displayName || 'Sin nombre'}</div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{u.email} · {(u.roles || []).join(', ')}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {filteredUsers.length === 0 && <p style={{ padding: '0.75rem', margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Sin resultados.</p>}
                                </div>
                            </div>
                        )}

                        {/* Título */}
                        <div>
                            <label className="input-label" htmlFor="msg-titulo">Asunto</label>
                            <input id="msg-titulo" className="input-field" placeholder="Ej: Reunión de padres – 15 de abril" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={100} required />
                        </div>

                        {/* Cuerpo */}
                        <div>
                            <label className="input-label" htmlFor="msg-cuerpo">Mensaje</label>
                            <textarea id="msg-cuerpo" className="input-field" placeholder="Escribí el contenido..." value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={5} maxLength={1000} required style={{ resize: 'vertical' }} />
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>{cuerpo.length}/1000</div>
                        </div>

                        {/* Programar envío */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.9rem', backgroundColor: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
                                <input type="checkbox" checked={programar} onChange={e => setProgramar(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                                <Calendar size={15} color="var(--color-primary)" />
                                Programar envío para una fecha específica
                            </label>
                            {programar && (
                                <input
                                    type="datetime-local"
                                    className="input-field"
                                    value={fechaProgramada}
                                    min={minDatetime()}
                                    onChange={e => setFechaProgramada(e.target.value)}
                                    required={programar}
                                    style={{ marginTop: '0.25rem' }}
                                />
                            )}
                        </div>

                        {/* Enviar también por email */}
                        <div style={{ padding: '0.75rem 0.9rem', backgroundColor: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-text-main)' }}>
                                <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                                <Mail size={15} color="var(--color-secondary)" />
                                Enviar también por correo electrónico
                            </label>
                            {sendEmail && (
                                <p style={{ margin: '0.4rem 0 0', fontSize: '0.72rem', color: 'var(--color-text-muted)', paddingLeft: '2rem' }}>
                                    Se enviará un email a los destinatarios que tengan dirección registrada (procesa automáticamente al desplegarse Cloud Functions).
                                </p>
                            )}
                        </div>

                        <button type="submit" disabled={sending || !titulo.trim() || !cuerpo.trim() || !getAudiencia() || (programar && !fechaProgramada)}
                            className="btn btn-primary"
                            style={{ alignSelf: 'flex-end', gap: '0.5rem', display: 'flex', alignItems: 'center' }}>
                            {programar ? <><Calendar size={16} />{sending ? 'Programando...' : 'Programar envío'}</> : <><Send size={16} />{sending ? 'Enviando...' : 'Enviar notificación'}</>}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
