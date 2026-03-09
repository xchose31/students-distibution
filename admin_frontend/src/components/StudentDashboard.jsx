// admin_frontend/src/components/StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authService } from '../services/auth';

function StudentDashboard() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [firstChoice, setFirstChoice] = useState('');
  const [secondChoice, setSecondChoice] = useState('');
  const [savedChoices, setSavedChoices] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Загружаем доступные профили
      const profilesRes = await api.get('/student/profiles');
      setProfiles(profilesRes.data.profiles);
      setSelectionOpen(profilesRes.data.selection_open);

      // Загружаем текущий выбор ученика
      const choiceRes = await api.get('/student/profile-choice');
      if (choiceRes.data.profiles.length > 0) {
        const choice = choiceRes.data.profiles[0];
        setSavedChoices(choice);
        setFirstChoice(choice.first_choice?.id || '');
        setSecondChoice(choice.second_choice?.id || '');
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectionOpen) {
      setError('Выбор профилей закрыт');
      return;
    }

    if (firstChoice === secondChoice) {
      setError('Профили не могут совпадать');
      return;
    }

    try {
      await api.put('/student/profile-choice', {
        first_choice_id: firstChoice,
        second_choice_id: secondChoice
      });
      setSuccess('Выбор сохранён!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <div className="header">
        <h1>Личный кабинет ученика</h1>
        <button onClick={handleLogout}>Выйти</button>
      </div>

      <div className="status-banner">
        {selectionOpen ? (
          <span className="open">✅ Приём заявлений ОТКРЫТ</span>
        ) : (
          <span className="closed">❌ Приём заявлений ЗАКРЫТ</span>
        )}
      </div>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      <div className="card">
        <h2>Выбор профиля</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Первый приоритет:</label>
            <select
              value={firstChoice}
              onChange={(e) => setFirstChoice(e.target.value)}
              disabled={!selectionOpen}
            >
              <option value="">Выберите профиль</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Второй приоритет:</label>
            <select
              value={secondChoice}
              onChange={(e) => setSecondChoice(e.target.value)}
              disabled={!selectionOpen}
            >
              <option value="">Выберите профиль</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" disabled={!selectionOpen}>
            Сохранить выбор
          </button>
        </form>
      </div>

      {savedChoices && (
        <div className="card">
          <h2>Ваш текущий выбор</h2>
          <p>
            <strong>Первый приоритет:</strong>{' '}
            {savedChoices.first_choice?.name || 'Не выбран'}
          </p>
          <p>
            <strong>Второй приоритет:</strong>{' '}
            {savedChoices.second_choice?.name || 'Не выбран'}
          </p>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;