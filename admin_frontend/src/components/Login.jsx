// admin_frontend/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/auth';

function Login({ onLogin }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  // 🔧 Проверка токена при загрузке страницы
  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      validateToken(token);
    }
  }, [searchParams]);

  // 🔧 Валидация токена
  const validateToken = async (token) => {
    setTokenLoading(true);
    setError('');

    try {
      const data = await authService.loginByToken(token);
      onLogin(data.user);

      // Редирект в зависимости от роли
      if (data.user?.is_admin) {
        navigate('/admin/data', { replace: true });
      } else {
        navigate('/student/profile', { replace: true });
      }
    } catch (err) {
      console.error('Token validation error:', err);
      setError('Ошибка входа по токену. Пожалуйста, войдите с помощью логина и пароля.');

      // Очищаем URL от токена
      navigate('/login', { replace: true });
    } finally {
      setTokenLoading(false);
    }
  };

  // 🔧 Стандартный вход по логину/паролю
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authService.login(username, password, rememberMe);
      onLogin(data.user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Ошибка входа');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <main className="form-signin">
        <form onSubmit={handleSubmit}>
          {/* Логотип */}
          <img className="mb-4" src="/logo.png" alt="Logo" width="72" height="72" />

          <h1 className="h3 mb-3 fw-normal">Авторизация</h1>

          {/* 🔧 Сообщение об ошибке токена */}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              <i className="bi bi-exclamation-circle-fill me-2"></i>
              {error}
            </div>
          )}

          {/* 🔧 Индикатор загрузки токена */}
          {tokenLoading && (
            <div className="alert alert-info mt-3" role="alert">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Проверка токена...
            </div>
          )}

          {/* Поле логина */}
          <div className="form-floating mb-2">
            <input
              type="text"
              className="form-control"
              id="floatingInput"
              placeholder="Пользователь"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading || tokenLoading}
              autoComplete="username"
            />
            <label htmlFor="floatingInput">Имя пользователя</label>
          </div>

          {/* Поле пароля */}
          <div className="form-floating mb-2">
            <input
              type="password"
              className="form-control"
              id="floatingPassword"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading || tokenLoading}
              autoComplete="current-password"
            />
            <label htmlFor="floatingPassword">Пароль</label>
          </div>

          {/* Запомнить меня */}
          <div className="form-check text-start my-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading || tokenLoading}
            />
            <label className="form-check-label" htmlFor="rememberMe">
              Запомнить меня
            </label>
          </div>

          {/* Кнопка входа */}
          <button
            className="w-100 btn btn-lg btn-primary"
            type="submit"
            disabled={loading || tokenLoading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Вход...
              </>
            ) : (
              'Войти'
            )}
          </button>

          {/* Ссылка на восстановление */}
          <div className="container mt-3">
            <div className="row">
              <div className="col text-start">
                {/* Место для регистрации (если нужно) */}
              </div>
              <div className="col text-end">
                <p>
                  <a href="/recover">
                    <nobr>Восстановить доступ</nobr>
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Футер */}
          <p className="mt-5 mb-3 text-muted">© 2017–2026</p>
        </form>
      </main>
    </div>
  );
}

export default Login;