// admin_frontend/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/auth';

function AdminDashboard() {
  const navigate = useNavigate();
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [newProfiles, setNewProfiles] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statusRes = await api.get('/admin/selection-status');
      setSelectionOpen(statusRes.data.is_open);

      const profilesRes = await api.get('/admin/class-profiles');
      setProfiles(profilesRes.data.profiles);
    } catch (err) {
      setError('Ошибка загрузки данных');
    }
  };

  const toggleSelection = async () => {
    try {
      await api.put('/admin/selection-status', {
        selection_open: !selectionOpen
      });
      setSelectionOpen(!selectionOpen);
      setSuccess(`Приём заявлений ${!selectionOpen ? 'открыт' : 'закрыт'}`);
    } catch (err) {
      setError('Ошибка изменения статуса');
    }
  };

  const saveProfiles = async () => {
    setError('');
    setSuccess('');

    const profileNames = newProfiles
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p);

    if (profileNames.length === 0) {
      setError('Введите хотя бы один профиль');
      return;
    }

    try {
      await api.post('/admin/class-profiles', {
        profiles: profileNames
      });
      setSuccess('Профили сохранены!');
      setNewProfiles('');
      loadData();
    } catch (err) {
      setError('Ошибка сохранения профилей');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Панель администратора</h1>
        <button onClick={handleLogout}>Выйти</button>
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Статус приёма заявлений</h2>
        <div className="status-control">
          <span className={selectionOpen ? 'open' : 'closed'}>
            {selectionOpen ? 'ОТКРЫТ' : 'ЗАКРЫТ'}
          </span>
          <button onClick={toggleSelection} className="toggle-btn">
            {selectionOpen ? 'Закрыть' : 'Открыть'}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Текущие профили</h2>
        <ul className="profile-list">
          {profiles.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      </div>

      <div className="card">
        <h2>Добавить/обновить профили</h2>
        <p className="hint">Введите названия профилей, каждый с новой строки</p>
        <textarea
          value={newProfiles}
          onChange={(e) => setNewProfiles(e.target.value)}
          placeholder="Физико-математический&#10;Гуманитарный&#10;Инженерный"
          rows={5}
        />
        <button onClick={saveProfiles}>Сохранить профили</button>
      </div>
    </div>
  );
}

export default AdminDashboard;