// admin_frontend/src/components/Layout.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authService } from '../services/auth';

function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getMenuItems = () => {
    if (!user) return [];

    if (user.is_admin) {
      return [
        { path: '/admin/settings', label: 'Настройки', icon: 'bi-gear-fill' },
        { path: '/admin/exam-results', label: 'Результаты', icon: 'bi-file-earmark-spreadsheet' },
        { path: '/admin/data', label: 'Данные', icon: 'bi-table' }
      ];
    } else {
      return [
        { path: '/student/profile', label: 'Выбор профиля', icon: 'bi-person-check-fill' },
        { path: '/student/results', label: 'Результаты', icon: 'bi-file-earmark-text' }
      ];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="d-flex min-vh-100">
      {/* Сайдбар */}
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        <div className="sidebar-header">
          <Link to="/" className="sidebar-brand">
            <i className="bi bi-mortarboard-fill"></i>
            <span className="brand-text">Школа</span>
          </Link>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            type="button"
            title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            <i className={`bi ${sidebarCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              to={item.path}
            >
              <i className={`bi ${item.icon}`}></i>
              <span className="nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <i className="bi bi-person-circle"></i>
            {/* 🔧 Отображаем ФИО вместо username */}
            <span className="user-name">{user?.fio || user?.username}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} type="button">
            <i className="bi bi-box-arrow-right"></i>
            <span className="btn-text">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <div className={`main-content ${sidebarCollapsed ? 'content-expanded' : 'content-normal'}`}>
        <main className="content-wrapper">
          {children}
        </main>

        <footer className="content-footer">
          <p className="mb-0 text-muted small">© 2025 Система распределения учащихся</p>
        </footer>
      </div>
    </div>
  );
}

export default Layout;