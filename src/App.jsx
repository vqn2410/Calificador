import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

import ForcePasswordChange from './pages/ForcePasswordChange';
import MyStudents from './pages/MyStudents';

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/force-password-change" element={<ForcePasswordChange />} />

          {/* Rutas Protegidas */}
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route path="cursos" element={<Courses />} />
            <Route path="cursos/:courseId" element={<CourseDetails />} />
            <Route path="mis-estudiantes" element={<MyStudents />} />
            <Route path="estudiantes/:studentId" element={<StudentProfile />} />
            <Route path="mis-hijos" element={<FamiliasView />} />
            <Route path="audit-views" element={<AuditViews />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
