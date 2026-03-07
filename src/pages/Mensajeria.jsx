/**
 * Mensajeria.jsx
 * 
 * Two separate tabs:
 * 1. "Anuncios" — institutional broadcasts (admin/teacher → families/everyone)
 * 2. "Mensajes" — individual real-time chats (1:1 conversations)
 */
import { useState, useEffect, useRef } from 'react';
import {
    collection, addDoc, query, orderBy, onSnapshot,
    serverTimestamp, updateDoc, doc, getDoc, getDocs,
    Timestamp, setDoc, where, limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare, Send, Bell, Users, ArrowLeft,
    Search, CheckCheck, Clock, Calendar, Trash2, CheckCircle2
} from 'lucide-react';

/* ══════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
function AudienceBadge({ audiencia }) {
    if (!audiencia) return null;
    const map = {
        familias: ['#dbeafe', '#1e40af', '👨‍👩‍👧 Familias'],
        docentes: ['#dcfce7', '#166534', '📚 Docentes'],
        todos: ['#fef9c3', '#854d0e', '🏫 Todos'],
    };
    const entry = map[audiencia];
    const style = { fontSize: '0.68rem', padding: '2px 7px', borderRadius: 10, fontWeight: 600 };
    if (entry) return <span style={{ ...style, backgroundColor: entry[0], color: entry[1] }}>{entry[2]}</span>;
    if (audiencia.startsWith('curso:')) return <span style={{ ...style, backgroundColor: '#f3e8ff', color: '#6b21a8' }}>🎓 {audiencia.replace('curso:', '')}</span>;
    if (audiencia.startsWith('usuario:')) return <span style={{ ...style, backgroundColor: '#fee2e2', color: '#991b1b' }}>👤 Directo</span>;
    return null;
}

function minDatetime() {
    const d = new Date(Date.now() + 5 * 60000);
    return d.toISOString().slice(0, 16);
}

function formatTs(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d;
    if (diff < 60000) return 'Ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
}

function chatId(uid1, uid2) {
    return [uid1, uid2].sort().join('_');
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function Mensajeria() {
    const { currentUser, activeRole } = useAuth();
    const canSend = SENDER_ROLES.includes(activeRole);
    const [mainTab, setMainTab] = useState('anuncios'); // 'anuncios' | 'chats'

    return (
        <div className="container" style={{ paddingBottom: '3rem', maxWidth: 780 }}>
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
                <h1 className="flex items-center gap-2">
                    <MessageSquare color="var(--color-primary)" size={26} />
                    Mensajería
                </h1>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Comunicados institucionales y conversaciones</p>
            </div>

            {/* Main tab switcher */}
            <div style={{ display: 'flex', marginBottom: '1.25rem', borderBottom: '2px solid var(--color-border)', gap: '0' }}>
                {[
                    { key: 'anuncios', icon: <Bell size={16} />, label: 'Anuncios' },
                    { key: 'chats', icon: <MessageSquare size={16} />, label: 'Mensajes directos' },
                ].map(t => (
                    <button key={t.key} onClick={() => setMainTab(t.key)} style={{
                        display: 'flex', alignItems: 'center', gap: '0.4rem',
                        padding: '0.65rem 1.25rem', fontSize: '0.88rem', fontWeight: 600,
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: mainTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        borderBottom: `2px solid ${mainTab === t.key ? 'var(--color-primary)' : 'transparent'}`,
                        marginBottom: -2, transition: 'all 0.2s',
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {mainTab === 'anuncios' && <AnunciosTab canSend={canSend} currentUser={currentUser} activeRole={activeRole} />}
            {mainTab === 'chats' && <ChatsTab currentUser={currentUser} activeRole={activeRole} />}
        </div>
    );
}

/* ══════════════════════════════════════════════════
   ANUNCIOS TAB (broadcasts)
══════════════════════════════════════════════════ */
function AnunciosTab({ canSend, currentUser, activeRole }) {
    const uid = currentUser?.uid;
    const nombre = currentUser?.displayName || currentUser?.email || 'Usuario';

    const [subTab, setSubTab] = useState('recibidos');
    const [mensajes, setMensajes] = useState([]);
    const [programados, setProgramados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usuarios, setUsuarios] = useState([]);

    // Compose
    const [titulo, setTitulo] = useState('');
    const [cuerpo, setCuerpo] = useState('');
    const [audienciaTipo, setAudienciaTipo] = useState('broadcast');
    const [audienciaBroadcast, setAudienciaBroadcast] = useState('familias');
    const [audienciaCurso, setAudienciaCurso] = useState('');
    const [audienciaUsuario, setAudienciaUsuario] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [sendEmail, setSendEmail] = useState(false);
    const [programar, setProgramar] = useState(false);
    const [fechaProgramada, setFechaProgramada] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        if (!canSend) return;
        getDocs(collection(db, 'docentes')).then(snap => setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    }, [canSend]);

    useEffect(() => {
        if (!uid) return;
        const q = query(collection(db, 'mensajes'), orderBy('fechaEnvio', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            const sent = all.filter(m => m.estado !== 'programado' && m.estado !== 'cancelado' && (
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

    // Client-side scheduler check
    useEffect(() => {
        if (!canSend || !programados.length) return;
        const iv = setInterval(async () => {
            const now = new Date();
            for (const m of programados) {
                if (!m.fechaProgramada) continue;
                const due = m.fechaProgramada.toDate ? m.fechaProgramada.toDate() : new Date(m.fechaProgramada);
                if (due <= now) await updateDoc(doc(db, 'mensajes', m.id), { estado: 'enviado', fechaEnvio: Timestamp.now() });
            }
        }, 60000);
        return () => clearInterval(iv);
    }, [programados, canSend]);

    function getAudiencia() {
        if (audienciaTipo === 'broadcast') return audienciaBroadcast;
        if (audienciaTipo === 'curso') return audienciaCurso ? `curso:${audienciaCurso}` : '';
        if (audienciaTipo === 'usuario') return audienciaUsuario ? `usuario:${audienciaUsuario}` : '';
        return '';
    }

    async function handleSend(e) {
        e.preventDefault();
        const aud = getAudiencia();
        if (!titulo.trim() || !cuerpo.trim() || !aud) return;
        setSending(true);
        try {
            await addDoc(collection(db, 'mensajes'), {
                titulo: titulo.trim(), cuerpo: cuerpo.trim(), audiencia: aud,
                enviadoPorUid: uid, enviadoPorNombre: nombre, enviadoPorRol: activeRole,
                leido: {}, enviarEmail: sendEmail,
                estado: programar && fechaProgramada ? 'programado' : 'enviado',
                fechaProgramada: programar && fechaProgramada ? Timestamp.fromDate(new Date(fechaProgramada)) : null,
                fechaEnvio: programar && fechaProgramada ? null : serverTimestamp(),
            });
            setTitulo(''); setCuerpo(''); setAudienciaUsuario(''); setUserSearch('');
            setProgramar(false); setFechaProgramada(''); setSendEmail(false);
            setSent(true); setTimeout(() => setSent(false), 3000);
            setSubTab('recibidos');
        } catch (err) { alert('Error: ' + err.message); }
        finally { setSending(false); }
    }

    const isUnread = m => !(m.leido?.[uid]);
    const unreadCount = mensajes.filter(isUnread).length;
    const filteredUsers = usuarios.filter(u => {
        const s = userSearch.toLowerCase();
        return !s || (u.displayName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
    });

    const subTabStyle = t => ({
        padding: '0.4rem 0.9rem', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontWeight: 600, fontSize: '0.78rem',
        backgroundColor: subTab === t ? 'var(--color-primary)' : 'transparent',
        color: subTab === t ? 'white' : 'var(--color-text-muted)',
    });
    const tipoStyle = t => ({
        flex: 1, padding: '0.45rem 0.25rem', border: `2px solid ${audienciaTipo === t ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 8, cursor: 'pointer', textAlign: 'center', fontSize: '0.76rem', fontWeight: 600,
        backgroundColor: audienciaTipo === t ? 'rgba(59,130,246,0.08)' : 'transparent',
        color: audienciaTipo === t ? 'var(--color-primary)' : 'var(--color-text-muted)',
    });

    return (
        <>
            {/* Sub-tab bar */}
            <div style={{ display: 'flex', gap: '0.35rem', padding: '0.3rem', backgroundColor: 'var(--color-background)', borderRadius: 24, marginBottom: '1rem', width: 'fit-content', border: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
                <button style={subTabStyle('recibidos')} onClick={() => setSubTab('recibidos')}>
                    📥 Recibidos {unreadCount > 0 && `(${unreadCount})`}
                </button>
                {canSend && programados.length > 0 && (
                    <button style={subTabStyle('programados')} onClick={() => setSubTab('programados')}>
                        🕐 Programados ({programados.length})
                    </button>
                )}
                {canSend && <button style={subTabStyle('redactar')} onClick={() => setSubTab('redactar')}>✉️ Redactar</button>}
            </div>

            {/* RECIBIDOS */}
            {subTab === 'recibidos' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {loading && <p style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>}
                    {!loading && mensajes.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                            <Bell size={40} color="var(--color-border)" style={{ marginBottom: '0.75rem' }} />
                            <p style={{ margin: 0 }}>No hay anuncios aún.</p>
                        </div>
                    )}
                    {mensajes.map(msg => (
                        <div key={msg.id} className="card"
                            onClick={() => updateDoc(doc(db, 'mensajes', msg.id), { [`leido.${uid}`]: true }).catch(() => { })}
                            style={{ borderLeft: `4px solid ${isUnread(msg) ? 'var(--color-primary)' : 'var(--color-border)'}`, padding: '0.9rem 1.1rem', cursor: 'default' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    {isUnread(msg) && <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'inline-block', flexShrink: 0 }} />}
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{msg.titulo}</span>
                                    <AudienceBadge audiencia={msg.audiencia} />
                                    {msg.enviarEmail && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 8, backgroundColor: '#ecfdf5', color: '#065f46', fontWeight: 600 }}>📧</span>}
                                </div>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatTs(msg.fechaEnvio)}</span>
                            </div>
                            <p style={{ margin: '0 0 0.35rem', fontSize: '0.83rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{msg.cuerpo}</p>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Por <strong>{msg.enviadoPorNombre}</strong></div>
                        </div>
                    ))}
                </div>
            )}

            {/* PROGRAMADOS */}
            {subTab === 'programados' && canSend && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {programados.map(msg => (
                        <div key={msg.id} className="card" style={{ borderLeft: '4px solid var(--color-warning)', padding: '0.9rem 1.1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.2rem' }}>
                                        <Clock size={13} color="var(--color-warning)" />
                                        <span style={{ fontWeight: 700 }}>{msg.titulo}</span>
                                        <AudienceBadge audiencia={msg.audiencia} />
                                    </div>
                                    <p style={{ margin: '0 0 0.3rem', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>{msg.cuerpo}</p>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-warning)', fontWeight: 600 }}>
                                        📅 {msg.fechaProgramada?.toDate?.()?.toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                <button onClick={() => updateDoc(doc(db, 'mensajes', msg.id), { estado: 'cancelado' })}
                                    style={{ color: 'var(--color-error)', background: 'none', border: '1px solid var(--color-error)', borderRadius: 8, padding: '0.35rem 0.7rem', cursor: 'pointer', fontSize: '0.75rem' }}>
                                    <Trash2 size={13} /> Cancelar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* REDACTAR */}
            {subTab === 'redactar' && canSend && (
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>✉️ Nuevo anuncio</h3>
                    {sent && <div style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.65rem 0.9rem', borderRadius: 8, marginBottom: '0.9rem', fontWeight: 600, fontSize: '0.87rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={15} /> {programar ? 'Programado con éxito' : 'Enviado exitosamente'}</div>}
                    <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                        {/* Tipo */}
                        <div>
                            <label className="input-label">Destino</label>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button type="button" style={tipoStyle('broadcast')} onClick={() => setAudienciaTipo('broadcast')}>🌐 General</button>
                                <button type="button" style={tipoStyle('curso')} onClick={() => setAudienciaTipo('curso')}>🎓 Curso</button>
                                <button type="button" style={tipoStyle('usuario')} onClick={() => setAudienciaTipo('usuario')}>👤 Individual</button>
                            </div>
                        </div>
                        {audienciaTipo === 'broadcast' && (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                {BROADCAST_OPTIONS.map(o => (
                                    <button key={o.value} type="button" onClick={() => setAudienciaBroadcast(o.value)}
                                        style={{ padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, backgroundColor: audienciaBroadcast === o.value ? 'var(--color-primary)' : 'var(--color-background)', color: audienciaBroadcast === o.value ? 'white' : 'var(--color-text-main)', border: `1.5px solid ${audienciaBroadcast === o.value ? 'var(--color-primary)' : 'var(--color-border)'}` }}>
                                        {o.icon} {o.label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {audienciaTipo === 'curso' && (
                            <select className="input-field" value={audienciaCurso} onChange={e => setAudienciaCurso(e.target.value)} required>
                                <option value="">-- Elegí un curso --</option>
                                {ALL_COURSES.map(c => <option key={c} value={c}>{c} – Familias</option>)}
                            </select>
                        )}
                        {audienciaTipo === 'usuario' && (
                            <div>
                                <input className="input-field" placeholder="Buscar por nombre o email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ marginBottom: '0.4rem' }} />
                                <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 8 }}>
                                    {filteredUsers.slice(0, 15).map(u => (
                                        <div key={u.id} onClick={() => { setAudienciaUsuario(u.id); setUserSearch(u.displayName || u.email || ''); }}
                                            style={{ padding: '0.5rem 0.8rem', cursor: 'pointer', fontSize: '0.82rem', backgroundColor: audienciaUsuario === u.id ? 'rgba(59,130,246,0.08)' : 'transparent', borderLeft: audienciaUsuario === u.id ? '3px solid var(--color-primary)' : '3px solid transparent' }}>
                                            <div style={{ fontWeight: 600 }}>{u.displayName || 'Sin nombre'}</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="input-label" htmlFor="anuncio-titulo">Asunto</label>
                            <input id="anuncio-titulo" className="input-field" placeholder="Título del anuncio" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={100} required />
                        </div>
                        <div>
                            <label className="input-label" htmlFor="anuncio-cuerpo">Mensaje</label>
                            <textarea id="anuncio-cuerpo" className="input-field" placeholder="Contenido del anuncio..." value={cuerpo} onChange={e => setCuerpo(e.target.value)} rows={4} maxLength={1000} required style={{ resize: 'vertical' }} />
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: 2 }}>{cuerpo.length}/1000</div>
                        </div>
                        {/* Programar */}
                        <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                                <input type="checkbox" checked={programar} onChange={e => setProgramar(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--color-primary)' }} />
                                <Calendar size={14} color="var(--color-primary)" /> Programar envío
                            </label>
                            {programar && <input type="datetime-local" className="input-field" value={fechaProgramada} min={minDatetime()} onChange={e => setFechaProgramada(e.target.value)} required={programar} style={{ marginTop: '0.5rem' }} />}
                        </div>
                        {/* Email */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', padding: '0.75rem', backgroundColor: 'var(--color-background)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                            <input type="checkbox" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} style={{ width: 15, height: 15, accentColor: 'var(--color-primary)' }} />
                            📧 Enviar también por email (requiere Cloud Functions activo)
                        </label>
                        <button type="submit" disabled={sending || !titulo.trim() || !cuerpo.trim() || !getAudiencia() || (programar && !fechaProgramada)}
                            className="btn btn-primary" style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {programar ? <><Calendar size={15} />{sending ? 'Programando...' : 'Programar'}</> : <><Send size={15} />{sending ? 'Enviando...' : 'Publicar anuncio'}</>}
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}

/* ══════════════════════════════════════════════════
   CHATS TAB (individual messages)
══════════════════════════════════════════════════ */
function ChatsTab({ currentUser, activeRole }) {
    const uid = currentUser?.uid;
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // { chatId, otherUser }
    const [loading, setLoading] = useState(true);
    const [allUsers, setAllUsers] = useState([]);
    const [showNewChat, setShowNewChat] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // Load conversations for this user
    useEffect(() => {
        if (!uid) return;
        const q = query(
            collection(db, 'chats'),
            where('participantes', 'array-contains', uid),
            orderBy('ultimoTimestamp', 'desc')
        );
        const unsub = onSnapshot(q, snap => {
            setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsub();
    }, [uid]);

    // Load all users for new chat
    useEffect(() => {
        getDocs(collection(db, 'docentes')).then(snap => {
            setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== uid));
        });
    }, [uid]);

    async function startChat(otherUser) {
        const cId = chatId(uid, otherUser.id);
        const chatRef = doc(db, 'chats', cId);
        const snap = await getDoc(chatRef);
        if (!snap.exists()) {
            await setDoc(chatRef, {
                participantes: [uid, otherUser.id],
                participantesInfo: {
                    [uid]: { nombre: currentUser.displayName || currentUser.email, rol: activeRole },
                    [otherUser.id]: { nombre: otherUser.displayName || otherUser.email, rol: (otherUser.roles || [])[0] || '' },
                },
                ultimoMensaje: '',
                ultimoTimestamp: serverTimestamp(),
                noLeido: { [uid]: 0, [otherUser.id]: 0 },
            });
        }
        setActiveChat({ chatId: cId, otherUser });
        setShowNewChat(false);
        setUserSearch('');
    }

    const filtered = allUsers.filter(u => {
        const s = userSearch.toLowerCase();
        return !s || (u.displayName || '').toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s);
    });

    if (activeChat) {
        return <ChatWindow chatId={activeChat.chatId} otherUser={activeChat.otherUser} currentUser={currentUser} onBack={() => setActiveChat(null)} />;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}</span>
                <button onClick={() => setShowNewChat(v => !v)} className="btn btn-primary" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Send size={14} /> Nueva conversación
                </button>
            </div>

            {/* New chat user picker */}
            {showNewChat && (
                <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Search size={16} color="var(--color-text-muted)" />
                        <input className="input-field" placeholder="Buscar usuario por nombre o email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ flex: 1 }} autoFocus />
                    </div>
                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        {filtered.slice(0, 20).map(u => (
                            <div key={u.id} onClick={() => startChat(u)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.5rem', cursor: 'pointer', borderRadius: 8, transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-background)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                                    {(u.displayName || u.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.displayName || 'Sin nombre'}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && <p style={{ padding: '0.5rem', margin: 0, color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Sin resultados</p>}
                    </div>
                </div>
            )}

            {loading && <p style={{ color: 'var(--color-text-muted)' }}>Cargando conversaciones...</p>}
            {!loading && conversations.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                    <MessageSquare size={40} color="var(--color-border)" style={{ marginBottom: '0.75rem' }} />
                    <p style={{ margin: 0 }}>No tenés conversaciones todavía.</p>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>Iniciá una nueva conversación arriba.</p>
                </div>
            )}

            {conversations.map(conv => {
                const otherId = conv.participantes?.find(p => p !== uid);
                const otherInfo = conv.participantesInfo?.[otherId] || {};
                const unread = conv.noLeido?.[uid] || 0;
                return (
                    <div key={conv.id} onClick={() => setActiveChat({ chatId: conv.id, otherUser: { id: otherId, ...otherInfo } })}
                        className="card"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.85rem 1rem', cursor: 'pointer', marginBottom: '0.5rem', transition: 'all 0.15s' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: unread > 0 ? 'var(--color-primary)' : 'var(--color-border)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0, transition: 'all 0.2s' }}>
                            {(otherInfo.nombre || '?')[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: unread > 0 ? 700 : 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {otherInfo.nombre || 'Usuario'}
                                </span>
                                <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>{formatTs(conv.ultimoTimestamp)}</span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                {conv.ultimoMensaje || 'Sin mensajes aún'}
                            </div>
                        </div>
                        {unread > 0 && (
                            <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                                {unread > 9 ? '9+' : unread}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* ══════════════════════════════════════════════════
   CHAT WINDOW (individual conversation)
══════════════════════════════════════════════════ */
function ChatWindow({ chatId: cId, otherUser, currentUser, onBack }) {
    const uid = currentUser?.uid;
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const bottomRef = useRef(null);

    // Load messages
    useEffect(() => {
        if (!cId) return;
        const q = query(collection(db, 'chats', cId, 'mensajes'), orderBy('timestamp', 'asc'), limit(100));
        const unsub = onSnapshot(q, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            // Mark as read
            updateDoc(doc(db, 'chats', cId), { [`noLeido.${uid}`]: 0 }).catch(() => { });
        });
        return () => unsub();
    }, [cId, uid]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    async function sendMessage(e) {
        e.preventDefault();
        if (!text.trim() || sending) return;
        setSending(true);
        const msgText = text.trim();
        setText('');
        try {
            const ts = serverTimestamp();
            await addDoc(collection(db, 'chats', cId, 'mensajes'), {
                texto: msgText, enviadoPor: uid, timestamp: ts, leido: false,
            });
            await updateDoc(doc(db, 'chats', cId), {
                ultimoMensaje: msgText, ultimoTimestamp: ts,
                [`noLeido.${otherUser.id}`]: (messages.filter(m => !m.leido && m.enviadoPor !== uid).length) + 1,
                [`noLeido.${uid}`]: 0,
            });
        } catch (err) { setText(msgText); console.error(err); }
        finally { setSending(false); }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)', minHeight: 400 }}>
            {/* Chat header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)', marginBottom: '0.75rem' }}>
                <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    <ArrowLeft size={18} /> Volver
                </button>
                <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                    {(otherUser.nombre || '?')[0].toUpperCase()}
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{otherUser.nombre || 'Usuario'}</div>
                    {otherUser.rol && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{otherUser.rol}</div>}
                </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.82rem', padding: '2rem' }}>
                        Iniciá la conversación 👋
                    </div>
                )}
                {messages.map(msg => {
                    const isMine = msg.enviadoPor === uid;
                    return (
                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                                maxWidth: '80%', padding: '0.55rem 0.85rem', borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                backgroundColor: isMine ? 'var(--color-primary)' : 'var(--color-surface)',
                                color: isMine ? 'white' : 'var(--color-text-main)',
                                border: isMine ? 'none' : '1px solid var(--color-border)',
                                fontSize: '0.875rem', lineHeight: 1.4,
                            }}>
                                <p style={{ margin: 0 }}>{msg.texto}</p>
                                <div style={{ fontSize: '0.62rem', opacity: 0.7, marginTop: 3, textAlign: isMine ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 3 }}>
                                    {formatTs(msg.timestamp)}
                                    {isMine && <CheckCheck size={12} />}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} style={{ display: 'flex', gap: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                <input
                    className="input-field"
                    placeholder="Escribí un mensaje..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    style={{ flex: 1 }}
                    autoFocus
                />
                <button type="submit" disabled={!text.trim() || sending}
                    className="btn btn-primary"
                    style={{ padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Send size={16} />
                </button>
            </form>
        </div>
    );
}
