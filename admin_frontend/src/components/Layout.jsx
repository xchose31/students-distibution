// admin_frontend/src/components/Layout.jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../App.css';


const getMenuItems = () => {
  if (!user) return [];

  if (user.is_admin) {
    return [
      { path: '/admin/settings', label: 'Настройки', icon: 'bi-gear-fill' },
      { path: '/admin/exam-results', label: 'Результаты экзаменов', icon: 'bi-file-earmark-spreadsheet' },
      { path: '/admin/data', label: 'Данные', icon: 'bi-table' }  // ← Уже должно быть
    ];
  } else {
    return [
      { path: '/student/profile', label: 'Выбор профиля', icon: 'bi-person-check-fill' },
      { path: '/student/results', label: 'Результаты', icon: 'bi-file-earmark-text' }
    ];
  }
};


function Layout({ children, user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const getMenuItems = () => {
    if (!user) return [];

    if (user.is_admin) {
      return [
        { path: '/admin/settings', label: 'Настройки', icon: 'bi-gear-fill' },
        { path: '/admin/exam-results', label: 'Результаты экзаменов', icon: 'bi-file-earmark-spreadsheet' },
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

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <i className="bi bi-mortarboard-fill"></i>
            <span>Распределение</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.path} className="nav-item">
              <span
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <i className={`bi ${item.icon}`}></i>
                <span>{item.label}</span>
              </span>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {getInitials(user?.username)}
            </div>
            <div className="user-details">
              <div className="user-name">{user?.username || 'Пользователь'}</div>
              <div className="user-role">
                {user?.is_admin ? 'Администратор' : 'Ученик'}
              </div>
            </div>
          </div>
          <button className="logout-btn" onClick={onLogout}>
            <i className="bi bi-box-arrow-right"></i>
            <span>Выйти</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}


export default Layout;