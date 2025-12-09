// API для авторизации
import { post, get } from './httpClient.js';

/**
 * Вход в систему
 * @param {string} login - логин пользователя
 * @param {string} password - пароль
 * @returns {Promise<{token: string, user: object}>}
 */
export async function login(loginValue, password) {
  const response = await post('/auth/login', { login: loginValue, password });
  
  // Сохраняем токен в localStorage, если есть (может быть отсутствовать при needsSetup)
  if (response.token) {
    localStorage.setItem('authToken', response.token);
  }
  
  return response;
}

/**
 * Получение текущего пользователя
 * @returns {Promise<object>}
 */
export async function getMe() {
  return await get('/auth/me');
}

/**
 * Регистрация студента
 * @param {object} userData - данные студента (login, password, email, phone, studentCardNumber, fio, group, course)
 * @returns {Promise<{token: string, user: object}>}
 */
export async function register(userData) {
  const response = await post('/auth/register', userData);
  
  // Сохраняем токен в localStorage
  if (response.token) {
    localStorage.setItem('authToken', response.token);
  }
  
  return response;
}

/**
 * Выход из системы (удаляет токен)
 */
export function logout() {
  localStorage.removeItem('authToken');
}

/**
 * Первый вход: установка курса и нового пароля
 */
export async function firstSetup(payload) {
  const response = await post('/auth/first-setup', payload);
  if (response.token) {
    localStorage.setItem('authToken', response.token);
  }
  return response;
}

