// Утилиты для работы с датами

/**
 * Получает начало недели для указанной даты
 * @param {Date} date
 * @returns {Date}
 */
export function getWeekStart(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Получает конец недели для указанной даты
 * @param {Date} date
 * @returns {Date}
 */
export function getWeekEnd(date) {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

/**
 * Проверяет, находится ли дата в указанной неделе
 * @param {Date} date
 * @param {Date} weekStart
 * @param {Date} weekEnd
 * @returns {boolean}
 */
export function isDateInWeek(date, weekStart, weekEnd) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d >= weekStart && d <= weekEnd;
}

/**
 * Форматирует дату в строку YYYY-MM-DD (без смещения часового пояса)
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получает дату следующего указанного дня недели
 * @param {number} dayOfWeek - день недели (0 = понедельник, 1 = вторник, ..., 6 = воскресенье)
 * @param {Date} fromDate - начальная дата
 * @returns {Date}
 */
export function getNextDayOfWeek(dayOfWeek, fromDate = new Date()) {
  const date = new Date(fromDate);
  date.setHours(0, 0, 0, 0);
  
  // JavaScript: 0 = воскресенье, 1 = понедельник, 2 = вторник, 3 = среда, ..., 6 = суббота
  // Наша система: 0 = понедельник, 1 = вторник, 2 = среда, ..., 6 = воскресенье
  // Конвертируем нашу систему в JS:
  // наш 0 (понедельник) → JS 1
  // наш 1 (вторник) → JS 2
  // наш 2 (среда) → JS 3
  // наш 6 (воскресенье) → JS 0
  const jsDayOfWeek = dayOfWeek === 6 ? 0 : dayOfWeek + 1;
  
  const currentDay = date.getDay(); // JavaScript день недели (0-6)
  
  // Вычисляем количество дней до нужного дня недели
  let daysUntilTarget = (jsDayOfWeek - currentDay + 7) % 7;
  
  // Если сегодня уже этот день недели, берём следующий (через неделю)
  if (daysUntilTarget === 0) {
    daysUntilTarget = 7;
  }
  
  // Добавляем дни
  const resultDate = new Date(date);
  resultDate.setDate(date.getDate() + daysUntilTarget);
  resultDate.setHours(0, 0, 0, 0);
  
  return resultDate;
}

