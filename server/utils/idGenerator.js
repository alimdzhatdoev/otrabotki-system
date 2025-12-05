// Утилита для генерации уникальных ID

/**
 * Генерирует уникальный ID на основе текущего времени и случайного числа
 * @param {string} prefix - префикс для ID (например, 'slot', 'ts')
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}






