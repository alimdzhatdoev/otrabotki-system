// API для администраторов
import { get, post, patch, del } from './httpClient.js';

/**
 * Получение аналитики
 * @returns {Promise<object>}
 */
export async function getAnalytics() {
  return await get('/admin/analytics');
}

/**
 * Получение списка пользователей
 * @param {string} role - опционально, фильтр по роли
 * @returns {Promise<Array>}
 */
export async function getUsers(role = null) {
  const params = role ? `?role=${role}` : '';
  return await get(`/admin/users${params}`);
}

/**
 * Создание пользователя
 * @param {object} userData - данные пользователя
 * @returns {Promise<object>}
 */
export async function createUser(userData) {
  return await post('/admin/users', userData);
}

/**
 * Обновление пользователя
 * @param {string} userId - ID пользователя
 * @param {object} updates - обновления
 * @returns {Promise<object>}
 */
export async function updateUser(userId, updates) {
  return await patch(`/admin/users/${userId}`, updates);
}

/**
 * Удаление пользователя
 * @param {string} userId - ID пользователя
 * @returns {Promise<object>}
 */
export async function deleteUser(userId) {
  return await del(`/admin/users/${userId}`);
}

/**
 * Получение лимитов
 * @returns {Promise<object>}
 */
export async function getLimits() {
  return await get('/admin/limits');
}

/**
 * Обновление лимитов
 * @param {object} limits - лимиты (maxPerDay, maxPerWeek)
 * @returns {Promise<object>}
 */
export async function updateLimits(limits) {
  return await patch('/admin/limits', limits);
}

/**
 * Получение списка курсов
 * @returns {Promise<Array>}
 */
export async function getCourses() {
  return await get('/admin/courses');
}

/**
 * Создание курса
 * @param {object} courseData - данные курса (name)
 * @returns {Promise<object>}
 */
export async function createCourse(courseData) {
  return await post('/admin/courses', courseData);
}

/**
 * Обновление курса
 * @param {number} courseId - ID курса
 * @param {object} updates - обновления
 * @returns {Promise<object>}
 */
export async function updateCourse(courseId, updates) {
  return await patch(`/admin/courses/${courseId}`, updates);
}

/**
 * Добавление предмета к курсу
 * @param {number} courseId - ID курса
 * @param {string} subject - название предмета
 * @returns {Promise<object>}
 */
export async function addSubjectToCourse(courseId, subject) {
  return await post(`/admin/courses/${courseId}/subjects`, { subject });
}

/**
 * Удаление предмета из курса
 * @param {number} courseId - ID курса
 * @param {string} subject - название предмета
 * @returns {Promise<object>}
 */
export async function deleteSubjectFromCourse(courseId, subject) {
  return await del(`/admin/courses/${courseId}/subjects/${encodeURIComponent(subject)}`);
}

/**
 * Получение всех заявок
 * @returns {Promise<Array>}
 */
export async function getRequests() {
  return await get('/admin/requests');
}

/**
 * Экспорт всех данных системы (бэкап)
 * @returns {Promise<object>}
 */
export async function exportData() {
  return await get('/admin/data-export');
}

/**
 * Импорт всех данных системы (восстановление из бэкапа)
 * @param {object} data - объект с данными (users, slots, teacherSchedules, courses, subjects, attendance, limits)
 * @returns {Promise<object>}
 */
export async function importData(data) {
  return await post('/admin/data-import', data);
}

