// admin_frontend/src/components/admin/Settings.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function Settings() {
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [newProfiles, setNewProfiles] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const statusRes = await api.get('/selection-status');
      setSelectionOpen(statusRes.data.is_open);

      const profilesRes = await api.get('/class-profiles');
      setProfiles(profilesRes.data.profiles);
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = async () => {
    try {
      await api.put('/selection-status', {
        selection_open: !selectionOpen
      });
      setSelectionOpen(!selectionOpen);
      setSuccess(`Приём заявлений ${!selectionOpen ? 'открыт' : 'закрыт'}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Ошибка изменения статуса');
      setTimeout(() => setError(''), 3000);
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
      await api.post('/class-profiles', {
        profiles: profileNames
      });
      setSuccess('Профили сохранены!');
      setNewProfiles('');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Ошибка сохранения профилей');
      setTimeout(() => setError(''), 3000);
    }
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
    <div>
      <div className="mb-4">
        <h2>Настройки</h2>
        <p className="text-muted">Управление профилями и приёмом заявлений</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Статус приёма */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Приём заявлений</h5>
        </div>
        <div className="card-body">
          <div className="d-flex align-items-center gap-3">
            <span className={`status-badge ${selectionOpen ? 'open' : 'closed'}`}>
              {selectionOpen ? '✅ Открыт' : '❌ Закрыт'}
            </span>
            <button
              className={`btn ${selectionOpen ? 'btn-danger' : 'btn-success'}`}
              onClick={toggleSelection}
            >
              {selectionOpen ? 'Закрыть' : 'Открыть'}
            </button>
          </div>
        </div>
      </div>

      {/* Текущие профили */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Текущие профили</h5>
        </div>
        <div className="card-body">
          {profiles.length > 0 ? (
            <ul className="list-group list-group-flush">
              {profiles.map((p) => (
                <li key={p.id} className="list-group-item">
                  {p.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted mb-0">Профили ещё не созданы</p>
          )}
        </div>
      </div>

      {/* Добавление профилей */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Добавить/обновить профили</h5>
        </div>
        <div className="card-body">
          <p className="text-muted small mb-3">
            Введите названия профилей, каждый с новой строки
          </p>
          <textarea
            className="form-control mb-3"
            value={newProfiles}
            onChange={(e) => setNewProfiles(e.target.value)}
            placeholder="Физико-математический&#10;Гуманитарный&#10;Инженерный"
            rows={5}
          />
          <button className="btn btn-primary" onClick={saveProfiles}>
            Сохранить профили
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;