// Общие API-методы (доступны всем авторизованным пользователям)
import { get } from './httpClient.js';

/**
 * Получение списка курсов
 * @returns {Promise<Array>}
 */
export async function getCourses() {
  return await get('/common/courses');
}

