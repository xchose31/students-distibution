// admin_frontend/src/services/auth.js
import api from './api';

export const authService = {
  login: async (username, password, rememberMe = false) => {
    const response = await api.post('/login', {
      username,
      password,
      remember_me: rememberMe  // ← Отправляем на бэкенд
    });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      const user = {
        ...response.data.user,
        is_admin: response.data.user.role === 'admin'
      };
      localStorage.setItem('user', JSON.stringify(user));

      // Если "запомнить меня" не выбрано, очищаем данные при закрытии вкладки
      if (!rememberMe) {
        window.addEventListener('beforeunload', () => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
        });
      }
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  }
};