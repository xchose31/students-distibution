// admin_frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Settings from './components/admin/Settings';
import ExamResults from './components/admin/ExamResults';
import Data from './components/admin/Data';
import ProfileChoice from './components/student/ProfileChoice';
import Results from './components/student/Results';
import { authService } from './services/auth';

function PrivateRoute({ children }) {
  const isAuthenticated = authService.isAuthenticated();
  const user = authService.getCurrentUser();

  return isAuthenticated ? (
    <Layout user={user} onLogout={() => {
      authService.logout();
      window.location.href = '/login';
    }}>
      {children}
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* 🔧 onLogin → совпадает с Login.jsx */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />

        {/* 🔧 Убрано дублирование Layout */}
        <Route path="/admin/settings" element={
          <PrivateRoute>
            <Settings />
          </PrivateRoute>
        } />

        <Route path="/admin/exam-results" element={
          <PrivateRoute>
            <ExamResults />
          </PrivateRoute>
        } />

        <Route path="/admin/data" element={
          <PrivateRoute>
            <Data />
          </PrivateRoute>
        } />

        <Route path="/student/profile" element={
          <PrivateRoute>
            <ProfileChoice />
          </PrivateRoute>
        } />

        <Route path="/student/results" element={
          <PrivateRoute>
            <Results />
          </PrivateRoute>
        } />

        <Route path="/" element={
          <PrivateRoute>
            <Navigate to={user?.is_admin ? "/admin/data" : "/student/profile"} replace />
          </PrivateRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;