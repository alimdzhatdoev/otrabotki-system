// Сервис для проверки лимитов записей студентов
import { getSlots, getLimits } from './fileDb.js';
import { getWeekStart, getWeekEnd, isDateInWeek } from '../utils/dateUtils.js';

/**
 * Проверяет лимиты для записи студента на слот
 * @param {string} studentId - ID студента
 * @param {string} slotDate - дата слота в формате YYYY-MM-DD
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
export async function checkBookingLimits(studentId, slotDate) {
  const slots = await getSlots();
  const limits = await getLimits();

  // Получаем все записи студента
  const studentBookings = slots.filter(slot => 
    slot.students.includes(studentId)
  );

  // Проверка лимита в день
  const bookingsOnDay = studentBookings.filter(slot => slot.date === slotDate);
  if (bookingsOnDay.length >= limits.maxPerDay) {
    return {
      valid: false,
      message: `Превышен лимит записей в день (макс. ${limits.maxPerDay})`
    };
  }

  // Проверка лимита в неделю
  const slotDateObj = new Date(slotDate);
  const weekStart = getWeekStart(slotDateObj);
  const weekEnd = getWeekEnd(slotDateObj);

  const bookingsInWeek = studentBookings.filter(slot => {
    const d = new Date(slot.date);
    return isDateInWeek(d, weekStart, weekEnd);
  });

  if (bookingsInWeek.length >= limits.maxPerWeek) {
    return {
      valid: false,
      message: `Превышен лимит записей в неделю (макс. ${limits.maxPerWeek})`
    };
  }

  return { valid: true };
}

