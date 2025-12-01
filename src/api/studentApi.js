// API для студентов
import { get, post, del } from './httpClient.js';

/**
 * Получение доступных слотов
 * @param {object} filters - фильтры (courseId, subject, date)
 * @returns {Promise<Array>}
 */
export async function getAvailableSlots(filters = {}) {
  const params = new URLSearchParams();
  if (filters.subject) params.append('subject', filters.subject);
  if (filters.date) params.append('date', filters.date);
  
  const query = params.toString();
  return await get(`/student/slots${query ? '?' + query : ''}`);
}

/**
 * Запись на слот
 * @param {string} slotId - ID слота
 * @returns {Promise<object>}
 */
export async function bookSlot(slotId) {
  return await post('/student/book', { slotId });
}

/**
 * Отмена записи на слот
 * @param {string} slotId - ID слота
 * @returns {Promise<object>}
 */
export async function cancelBooking(slotId) {
  return await del(`/student/book/${slotId}`);
}

/**
 * Получение всех записей студента
 * @returns {Promise<Array>}
 */
export async function getMyBookings() {
  return await get('/student/bookings');
}

/**
 * Получение информации о лимитах
 * @returns {Promise<object>}
 */
export async function getLimitsInfo() {
  return await get('/student/limits');
}

