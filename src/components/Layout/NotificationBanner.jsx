import { MessageSquare, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function NotificationBanner({ banner, onDismiss }) {
    const navigate = useNavigate();
    if (!banner) return null;

    return (
        <div
            onClick={() => { navigate('/mensajeria'); onDismiss(); }}
            style={{
                position: 'fixed',
                top: 72,        // below mobile header
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 2rem)',
                maxWidth: 440,
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                borderRadius: 14,
                padding: '0.8rem 1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                zIndex: 9500,
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                animation: 'slideDown 0.3s ease-out',
            }}
        >
            <style>{`
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                backgroundColor: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <MessageSquare size={18} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 2 }}>
                    {banner.titulo}
                </div>
                <div style={{
                    fontSize: '0.78rem', opacity: 0.85,
                    overflow: 'hidden', textOverflow: 'ellipsis',
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                    {banner.cuerpo}
                </div>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', opacity: 0.7, padding: '0.1rem', flexShrink: 0 }}
            >
                <X size={18} />
            </button>
        </div>
    );
}
