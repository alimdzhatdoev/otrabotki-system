// Компонент: Контекст авторизации для управления текущим пользователем
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin, register as apiRegister, getMe, logout as apiLogout } from '../api/authApi';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Проверка сохранённой сессии при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          // Пытаемся получить текущего пользователя по токену
          const user = await getMe();
          setCurrentUser(user);
        } catch (error) {
          // Если токен невалидный, удаляем его
          console.error('Ошибка проверки токена:', error);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Вход в систему
  const login = async (loginValue, password) => {
    try {
      const response = await apiLogin(loginValue, password);
      setCurrentUser(response.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Неверный логин или пароль' 
      };
    }
  };

  // Регистрация студента
  const register = async (userData) => {
    try {
      const response = await apiRegister(userData);
      setCurrentUser(response.user);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.message || 'Ошибка при регистрации' 
      };
    }
  };

  // Выход из системы
  const logout = () => {
    apiLogout();
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!currentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

