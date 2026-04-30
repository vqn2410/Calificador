import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, BookOpen, Users, MapPin, Phone, Mail, Award, ArrowRight } from 'lucide-react';

export default function Landing() {
    const { currentUser } = useAuth();

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-background)' }}>
            {/* Header / Navbar */}
            <header style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)',
                position: 'sticky', 
                top: 0, 
                zIndex: 50,
                borderBottom: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img 
                            src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" 
                            alt="Logo Escuela" 
                            style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div>
                            <h1 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--color-primary)', lineHeight: 1.2 }}>EP N° 6</h1>
                            <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--color-text-muted)', fontWeight: 600 }}>Rafael Obligado</p>
                        </div>
                    </div>
                    <div>
                        {currentUser ? (
                            <Link to="/panel" className="btn btn-primary" style={{ borderRadius: '99px', padding: '0.6rem 1.5rem' }}>
                                <span>Ir al Panel</span>
                                <ArrowRight size={18} />
                            </Link>
                        ) : (
                            <Link to="/login" className="btn btn-primary" style={{ borderRadius: '99px', padding: '0.6rem 1.5rem' }}>
                                <LogIn size={18} />
                                <span>Iniciar Sesión</span>
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section style={{
                position: 'relative',
                minHeight: '80vh',
                display: 'flex',
                alignItems: 'center',
                backgroundImage: 'url("https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
            }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to right, rgba(4, 75, 127, 0.95), rgba(4, 75, 127, 0.7))' }}></div>
                <div className="container" style={{ position: 'relative', zIndex: 1, color: 'white', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                    <span className="badge badge-warning" style={{ marginBottom: '1.5rem', padding: '0.5rem 1rem', fontSize: '0.9rem', backgroundColor: 'var(--color-accent)' }}>
                        Educación Pública de Calidad
                    </span>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.1, color: 'white' }}>
                        Escuela Primaria N° 6<br/>
                        <span style={{ color: 'var(--color-accent)' }}>Rafael Obligado</span>
                    </h2>
                    <p style={{ fontSize: 'clamp(1rem, 2vw, 1.25rem)', marginBottom: '2.5rem', opacity: 0.9, lineHeight: 1.6, maxWidth: '600px', margin: '0 auto 2.5rem' }}>
                        Formamos estudiantes comprometidos con su futuro, en un ambiente de respeto, inclusión y excelencia académica.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {!currentUser && (
                            <Link to="/login" className="btn" style={{ backgroundColor: 'white', color: 'var(--color-primary)', fontSize: '1.1rem', padding: '0.8rem 2rem', borderRadius: '99px' }}>
                                Portal Calificador Digital
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section style={{ padding: '5rem 0', backgroundColor: 'white' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h3 style={{ fontSize: '2rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Nuestros Pilares</h3>
                        <p style={{ color: 'var(--color-text-muted)', maxWidth: '600px', margin: '0 auto' }}>Trabajamos día a día para brindar la mejor experiencia educativa a nuestra comunidad.</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {[
                            { icon: <BookOpen size={32} />, title: "Excelencia Académica", desc: "Programa educativo actualizado con enfoque en el desarrollo integral." },
                            { icon: <Users size={32} />, title: "Comunidad Inclusiva", desc: "Un espacio donde cada estudiante es valorado y acompañado en su trayectoria." },
                            { icon: <Award size={32} />, title: "Formación en Valores", desc: "Educamos en el respeto, la solidaridad y la responsabilidad ciudadana." }
                        ].map((feature, i) => (
                            <div key={i} className="card" style={{ textAlign: 'center', padding: '3rem 2rem', border: 'none', backgroundColor: 'var(--color-background)' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--color-primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                                    {feature.icon}
                                </div>
                                <h4 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-text-main)' }}>{feature.title}</h4>
                                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Info Section */}
            <section style={{ padding: '5rem 0', backgroundColor: 'var(--color-primary)', color: 'white' }}>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '4rem', alignItems: 'center' }}>
                        <div>
                            <h3 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'white' }}>El Calificador Digital</h3>
                            <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2rem', lineHeight: 1.6 }}>
                                Implementamos nuevas tecnologías para acercar la escuela a las familias. A través de nuestro portal, padres y estudiantes pueden acceder a las calificaciones y reportes de manera ágil y segura.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {['Acceso 24/7 a calificaciones', 'Comunicación directa', 'Reportes descargables en PDF'].map((item, i) => (
                                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.05rem' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div style={{ borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}>
                            <img src="https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=2070&auto=format&fit=crop" alt="Estudiantes usando tecnología" style={{ width: '100%', display: 'block' }} />
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ backgroundColor: '#1d2b36', color: '#94a3b8', padding: '4rem 0 2rem' }}>
                <div className="container">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <img 
                                    src="https://i.postimg.cc/vBGtNsKg/Whats-App-Image-2026-03-06-at-15-14-14.jpg" 
                                    alt="Logo Escuela" 
                                    style={{ width: '40px', height: '40px', borderRadius: '50%', filter: 'grayscale(100%) brightness(200%)' }}
                                />
                                <h4 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>EP N° 6</h4>
                            </div>
                            <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>Formando ciudadanos responsables y comprometidos desde hace más de 50 años.</p>
                        </div>
                        
                        <div>
                            <h4 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Contacto</h4>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <MapPin size={18} style={{ flexShrink: 0, marginTop: '0.2rem' }} />
                                    <span style={{ fontSize: '0.9rem' }}>Calle Falsa 123, Ciudad, Provincia de Buenos Aires</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Phone size={18} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.9rem' }}>+54 11 1234-5678</span>
                                </li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <Mail size={18} style={{ flexShrink: 0 }} />
                                    <span style={{ fontSize: '0.9rem' }}>contacto@escuela6.edu.ar</span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h4 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Enlaces Rápidos</h4>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <li><Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Ingreso al Calificador</Link></li>
                                <li><a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Novedades</a></li>
                                <li><a href="#" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem' }}>Inscripciones</a></li>
                            </ul>
                        </div>
                    </div>
                    
                    <div style={{ borderTop: '1px solid #334155', paddingTop: '2rem', textAlign: 'center', fontSize: '0.85rem' }}>
                        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} Escuela Primaria N° 6 Rafael Obligado. Todos los derechos reservados.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
