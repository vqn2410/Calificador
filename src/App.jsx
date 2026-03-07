import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetails from './pages/CourseDetails';
import StudentProfile from './pages/StudentProfile';
import AdminPanel from './pages/AdminPanel';
import FamiliasView from './pages/FamiliasView';
import AuditViews from './pages/AuditViews';
import StaffOverview from './pages/StaffOverview';
import ForcePasswordChange from './pages/ForcePasswordChange';
import ForgotPassword from './pages/ForgotPassword';
import MyStudents from './pages/MyStudents';
import { useEffect } from 'react';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser.mustChangePassword) {
    return <Navigate to="/force-password-change" replace />;
  }

  return children;
}

// Checks activeRole against allowedRoles for the current route.
// If the role doesn't have access, redirects to home.
function RoleRoute({ children, allowedRoles }) {
  const { activeRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (activeRole && allowedRoles && !allowedRoles.includes(activeRole)) {
      navigate('/', { replace: true });
    }
  }, [activeRole, location.pathname]);

  if (!activeRole || (allowedRoles && !allowedRoles.includes(activeRole))) {
    return null; // Render nothing while redirecting
  }

  return children;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/force-password-change" element={<ForcePasswordChange />} />

          {/* Rutas Protegidas */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />

            {/* Solo Admin y Conducción */}
            <Route path="admin" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion']}>
                <AdminPanel />
              </RoleRoute>
            } />

            {/* Solo personal docente / no familias */}
            <Route path="cursos" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <Courses />
              </RoleRoute>
            } />
            <Route path="cursos/:courseId" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <CourseDetails />
              </RoleRoute>
            } />
            <Route path="mis-estudiantes" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <MyStudents />
              </RoleRoute>
            } />
            <Route path="estudiantes/:studentId" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <StudentProfile />
              </RoleRoute>
            } />
            <Route path="audit-views" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <AuditViews />
              </RoleRoute>
            } />
            <Route path="organizacion-institucional" element={
              <RoleRoute allowedRoles={['administrador', 'equipo_conduccion', 'docente', 'docente_area']}>
                <StaffOverview />
              </RoleRoute>
            } />

            {/* Solo familias */}
            <Route path="mis-hijos" element={
              <RoleRoute allowedRoles={['familia']}>
                <FamiliasView />
              </RoleRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
