// admin_frontend/src/components/student/ProfileChoice.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function ProfileChoice() {
  const [profiles, setProfiles] = useState([]);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [firstChoice, setFirstChoice] = useState('');
  const [secondChoice, setSecondChoice] = useState('');
  const [thirdChoice, setThirdChoice] = useState('');
  const [savedChoices, setSavedChoices] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const profilesRes = await api.get('/profiles');
      setProfiles(profilesRes.data.profiles);
      setSelectionOpen(profilesRes.data.selection_open);

      const choiceRes = await api.get('/profile-choice');
      if (choiceRes.data.profiles.length > 0) {
        const choice = choiceRes.data.profiles[0];
        setSavedChoices(choice);
        setFirstChoice(choice.first_choice?.id || '');
        setSecondChoice(choice.second_choice?.id || '');
        setThirdChoice(choice.third_choice?.id || '');
      }
    } catch (err) {
      setError('Ошибка загрузки данных');
    } finally {
      setLoading(false);
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

    // 🔧 ПРОВЕРКА: Все 3 приоритета обязательны
    if (!firstChoice) {
      setError('Выберите первый приоритет');
      return;
    }

    if (!secondChoice) {
      setError('Выберите второй приоритет');
      return;
    }

    if (!thirdChoice) {
      setError('Выберите третий приоритет');
      return;
    }

    // Проверка на дубликаты
    const choices = [firstChoice, secondChoice, thirdChoice];
    if (new Set(choices).size !== choices.length) {
      setError('Профили не могут совпадать');
      return;
    }

    try {
      await api.put('/profile-choice', {
        first_choice_id: parseInt(firstChoice),
        second_choice_id: parseInt(secondChoice),
        third_choice_id: parseInt(thirdChoice)
      });
      setSuccess('Выбор сохранён!');
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка сохранения');
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
        <h2>Выбор профиля</h2>
        <p className="text-muted">Выберите 3 профиля для поступления в 10 класс</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Статус приёма</h5>
        </div>
        <div className="card-body">
          <span className={`status-badge ${selectionOpen ? 'open' : 'closed'}`}>
            {selectionOpen ? '✅ Приём открыт' : '❌ Приём закрыт'}
          </span>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Ваш выбор</h5>
        </div>
        <div className="card-body">
          <div className="alert alert-info mb-3">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Внимание:</strong> Необходимо выбрать ровно 3 профиля. Все приоритеты обязательны для заполнения.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">
                <span className="badge bg-primary me-2">1</span>
                Первый приоритет *
              </label>
              <select
                className="form-select"
                value={firstChoice}
                onChange={(e) => setFirstChoice(e.target.value)}
                disabled={!selectionOpen}
                required
              >
                <option value="">Выберите профиль</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                <span className="badge bg-secondary me-2">2</span>
                Второй приоритет *
              </label>
              <select
                className="form-select"
                value={secondChoice}
                onChange={(e) => setSecondChoice(e.target.value)}
                disabled={!selectionOpen}
                required
              >
                <option value="">Выберите профиль</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label">
                <span className="badge bg-secondary me-2">3</span>
                Третий приоритет *
              </label>
              <select
                className="form-select"
                value={thirdChoice}
                onChange={(e) => setThirdChoice(e.target.value)}
                disabled={!selectionOpen}
                required
              >
                <option value="">Выберите профиль</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={!selectionOpen}
            >
              Сохранить выбор
            </button>
          </form>
        </div>
      </div>

      {savedChoices && (
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Текущий выбор</h5>
          </div>
          <div className="card-body">
            <ul className="list-group list-group-flush">
              <li className="list-group-item">
                <span className="badge bg-primary me-2">1</span>
                <strong>Первый приоритет:</strong>{' '}
                {savedChoices.first_choice?.name || 'Не выбран'}
              </li>
              <li className="list-group-item">
                <span className="badge bg-secondary me-2">2</span>
                <strong>Второй приоритет:</strong>{' '}
                {savedChoices.second_choice?.name || 'Не выбран'}
              </li>
              <li className="list-group-item">
                <span className="badge bg-secondary me-2">3</span>
                <strong>Третий приоритет:</strong>{' '}
                {savedChoices.third_choice?.name || 'Не выбран'}
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfileChoice;