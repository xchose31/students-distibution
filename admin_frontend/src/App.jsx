// admin_frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Layout from './components/Layout';
import Settings from './components/admin/Settings';
import DataStub from './components/admin/DataStub';
import ProfileChoice from './components/student/ProfileChoice';
import ResultsStub from './components/student/ResultsStub';
import { authService } from './services/auth';

function PrivateRoute({ children, user }) {
  return authService.isAuthenticated() ? (
    <Layout user={user} onLogout={() => {
      authService.logout();
      window.location.href = '/login';
    }}>
      {children}
    </Layout>
  ) : (
    <Navigate to="/login" />
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<Login onLoginSuccess={handleLoginSuccess} />}
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute user={user}>
              <Settings />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/data"
          element={
            <PrivateRoute user={user}>
              <DataStub />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <PrivateRoute user={user}>
              <ProfileChoice />
            </PrivateRoute>
          }
        />
        <Route
          path="/student/results"
          element={
            <PrivateRoute user={user}>
              <ResultsStub />
            </PrivateRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={user?.is_admin ? '/admin/settings' : '/student/profile'} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;