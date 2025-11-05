// Компонент: Главное приложение с роутингом и авторизацией
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import MainLayout from './layout/MainLayout';
import StudentDashboard from './pages/StudentDashboard';
import OperatorSchedule from './pages/OperatorSchedule';
import AdminSettings from './pages/AdminSettings';
import TeacherDashboard from './pages/TeacherDashboard';

// Защищённый роут - требует авторизации
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        color: '#FFFFFF',
        fontSize: '18px'
      }}>
        Загрузка...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Компонент для автоматического перенаправления на нужный dashboard
function DashboardRouter() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Перенаправляем на dashboard в зависимости от роли
  switch (currentUser.role) {
    case 'student':
      return <Navigate to="/dashboard/student" replace />;
    case 'teacher':
      return <Navigate to="/dashboard/teacher" replace />;
    case 'operator':
      return <Navigate to="/dashboard/operator" replace />;
    case 'admin':
      return <Navigate to="/dashboard/admin" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Редирект с корня */}
      <Route 
        path="/" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } 
      />

      {/* Страница входа */}
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } 
      />

      {/* Защищённые роуты с layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardRouter />} />
        <Route path="student" element={<StudentDashboard />} />
        <Route path="teacher" element={<TeacherDashboard />} />
        <Route path="operator" element={<OperatorSchedule />} />
        <Route path="admin" element={<AdminSettings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
