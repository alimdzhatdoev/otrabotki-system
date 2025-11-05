// Компонент: Контекст авторизации для управления текущим пользователем
import React, { createContext, useContext, useState, useEffect } from 'react';
import { users } from '../data/users';

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
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
      let user = users.find(u => u.id === savedUserId);
      
      // Если не нашли, проверяем кастомных пользователей
      if (!user) {
        const customUsers = localStorage.getItem('customUsers');
        if (customUsers) {
          const parsed = JSON.parse(customUsers);
          user = parsed.find(u => u.id === savedUserId);
        }
      }
      
      if (user) {
        setCurrentUser(user);
      }
    }
    setLoading(false);
  }, []);

  // Вход в систему
  const login = (loginValue, password) => {
    // Проверяем встроенных пользователей
    let user = users.find(
      u => u.login === loginValue && u.password === password
    );
    
    // Если не нашли, проверяем кастомных пользователей
    if (!user) {
      const customUsers = localStorage.getItem('customUsers');
      if (customUsers) {
        const parsed = JSON.parse(customUsers);
        user = parsed.find(
          u => u.login === loginValue && u.password === password
        );
      }
    }
    
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('currentUserId', user.id);
      return { success: true };
    }
    
    return { success: false, message: 'Неверный логин или пароль' };
  };

  // Выход из системы
  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUserId');
  };

  const value = {
    currentUser,
    login,
    logout,
    loading,
    isAuthenticated: !!currentUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

