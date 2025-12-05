// API для преподавателей
import { get, patch } from './httpClient.js';

/**
 * Получение слотов преподавателя
 * @param {object} filters - фильтры (subject, courseId, date)
 * @returns {Promise<Array>}
 */
export async function getMySlots(filters = {}) {
  const params = new URLSearchParams();
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.courseId) params.append('courseId', filters.courseId);
  if (filters.date) params.append('date', filters.date);
  
  const query = params.toString();
  return await get(`/teacher/slots${query ? '?' + query : ''}`);
}

/**
 * Получение списка студентов для слота
 * @param {string} slotId - ID слота
 * @returns {Promise<object>}
 */
export async function getSlotStudents(slotId) {
  return await get(`/teacher/slots/${slotId}/students`);
}

/**
 * Обновление посещаемости
 * @param {string} slotId - ID слота
 * @param {string} studentId - ID студента
 * @param {boolean} attended - пришёл ли студент
 * @param {boolean} completed - отработал ли студент
 * @returns {Promise<object>}
 */
export async function updateAttendance(slotId, studentId, attended, completed) {
  return await patch('/teacher/attendance', {
    slotId,
    studentId,
    attended,
    completed
  });
}

/**
 * Получение статистики преподавателя
 * @returns {Promise<object>}
 */
export async function getStats() {
  return await get('/teacher/stats');
}



