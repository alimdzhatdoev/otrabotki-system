// Сервис для проверки лимитов записей студентов
// В текущей версии лимиты отключены: студент может записываться без ограничений по количеству

/**
 * Проверяет лимиты для записи студента на слот
 * @param {string} studentId - ID студента
 * @param {string} slotDate - дата слота в формате YYYY-MM-DD
 * @returns {Promise<{valid: boolean, message?: string}>}
 */
export async function checkBookingLimits(studentId, slotDate) {
  // Лимиты по количеству записей отключены — всегда разрешаем
  return { valid: true };
}

