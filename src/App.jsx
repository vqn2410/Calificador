import {
  BrowserRouter as Router, Routes, Route,
  Navigate, useNavigate, useLocation
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { lazy, Suspense, useEffect } from 'react';

// ── Always-loaded ──────────────────────────────────────────
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import RolePickerOverlay from './components/Layout/RolePickerOverlay';
import LockScreen from './components/Layout/LockScreen';

// ── Lazy-loaded pages ──────────────────────────────────────
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Courses = lazy(() => import('./pages/Courses'));
const CourseDetails = lazy(() => import('./pages/CourseDetails'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const FamiliasView = lazy(() => import('./pages/FamiliasView'));
const AuditViews = lazy(() => import('./pages/AuditViews'));
const StaffOverview = lazy(() => import('./pages/StaffOverview'));
const ForcePasswordChange = lazy(() => import('./pages/ForcePasswordChange'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const MyStudents = lazy(() => import('./pages/MyStudents'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const Mensajeria = lazy(() => import('./pages/Mensajeria'));
const InformesConduccion = lazy(() => import('./pages/InformesConduccion'));

// ── Page loading fallback ──────────────────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '60vh', flexDirection: 'column', gap: '1rem',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Cargando...</span>
    </div>
  );
}

// ── Route guards ───────────────────────────────────────────
function PrivateRoute({ children }) {
  const { currentUser, needsRolePicker, isLocked } = useAuth();

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.mustChangePassword) return <Navigate to="/force-password-change" replace />;
  if (isLocked) return <LockScreen />;
  if (needsRolePicker) return <RolePickerOverlay />;

  return children;
}

function RoleRoute({ children, allowedRoles }) {
  const { activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
      navigate('/', { replace: true });
    }
  }, [activeRole, location.pathname]);

  if (!activeRole || (allowedRoles && !allowedRoles.includes(activeRole))) return null;
  return children;
}

// ── App ────────────────────────────────────────────────────
const STAFF = ['administrador', 'equipo_conduccion', 'docente', 'docente_area'];
const ADMIN = ['administrador', 'equipo_conduccion'];

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/force-password-change" element={<ForcePasswordChange />} />

            <Route path="/" element={
              <PrivateRoute><Layout /></PrivateRoute>
            }>
              <Route index element={<Dashboard />} />

              <Route path="admin" element={
                <RoleRoute allowedRoles={ADMIN}><AdminPanel /></RoleRoute>
              } />

              <Route path="cursos" element={
                <RoleRoute allowedRoles={STAFF}><Courses /></RoleRoute>
              } />
              <Route path="cursos/:courseId" element={
                <RoleRoute allowedRoles={STAFF}><CourseDetails /></RoleRoute>
              } />
              <Route path="mis-estudiantes" element={
                <RoleRoute allowedRoles={STAFF}><MyStudents /></RoleRoute>
              } />

              {/* 🔑 Corregido: habilitado para STAFF y familia */}
              <Route path="estudiantes/:studentId" element={
                <RoleRoute allowedRoles={[...STAFF, 'familia']}><StudentProfile /></RoleRoute>
              } />

              <Route path="audit-views" element={
                <RoleRoute allowedRoles={STAFF}><AuditViews /></RoleRoute>
              } />
              <Route path="organizacion-institucional" element={
                <RoleRoute allowedRoles={STAFF}><StaffOverview /></RoleRoute>
              } />
              <Route path="informes" element={
                <RoleRoute allowedRoles={ADMIN}><InformesConduccion /></RoleRoute>
              } />

              {/* Global (all roles) */}
              <Route path="mensajeria" element={<Mensajeria />} />
              <Route path="configuracion" element={<Configuracion />} />

              {/* Familias only */}
              <Route path="mis-hijos" element={
                <RoleRoute allowedRoles={['familia']}><FamiliasView /></RoleRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
