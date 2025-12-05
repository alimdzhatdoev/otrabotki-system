// Базовый HTTP-клиент для работы с API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Выполняет HTTP-запрос к API
 * @param {string} endpoint - путь к эндпоинту (например, '/auth/login')
 * @param {object} options - опции fetch (method, body, headers и т.д.)
 * @returns {Promise<Response>}
 */
async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  // Получаем токен из localStorage
  const token = localStorage.getItem('authToken');
  
  // Настройка заголовков
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  // Добавляем токен авторизации, если он есть
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Настройка запроса
  const config = {
    ...options,
    headers
  };
  
  try {
    const response = await fetch(url, config);
    
    // Парсим JSON ответ
    const data = await response.json();
    
    // Если ошибка, выбрасываем исключение
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    // Если это ошибка сети или парсинга
    if (error instanceof TypeError) {
      throw new Error('Ошибка подключения к серверу');
    }
    throw error;
  }
}

/**
 * GET запрос
 */
export function get(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'GET' });
}

/**
 * POST запрос
 */
export function post(endpoint, data, options = {}) {
  return request(endpoint, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PATCH запрос
 */
export function patch(endpoint, data, options = {}) {
  return request(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE запрос
 */
export function del(endpoint, options = {}) {
  return request(endpoint, { ...options, method: 'DELETE' });
}

export default { get, post, patch, delete: del };



