// Сервис для работы со слотами и генерации слотов из расписаний
import { getSlots, saveSlots, getTeacherSchedules } from './fileDb.js';
import { getNextDayOfWeek, formatDate } from '../utils/dateUtils.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Генерирует слоты на основе расписаний преподавателей на указанное количество недель
 * @param {number} weeksAhead - количество недель вперёд (по умолчанию 4)
 * @returns {Promise<Array>} - массив созданных слотов
 */
export async function generateSlotsFromSchedules(weeksAhead = 4) {
  const schedules = await getTeacherSchedules();
  const existingSlots = await getSlots();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const newSlots = [];

  for (const schedule of schedules) {
    // Находим первый день недели для этого расписания
    const firstSlotDate = getNextDayOfWeek(schedule.dayOfWeek, today);
    
    for (let week = 0; week < weeksAhead; week++) {
      // Вычисляем дату для каждой недели
      const slotDate = new Date(firstSlotDate);
      slotDate.setDate(firstSlotDate.getDate() + week * 7);
      
      // Пропускаем прошлые даты
      if (slotDate < today) continue;

      const dateStr = formatDate(slotDate);

      // Проверяем, нет ли уже такого слота
      const existingSlot = existingSlots.find(s => 
        s.date === dateStr &&
        s.teacherId === schedule.teacherId &&
        s.timeFrom === schedule.timeFrom &&
        s.subject === schedule.subject
      );

      if (!existingSlot) {
        newSlots.push({
          id: generateId('slot'),
          courseId: schedule.courseId,
          subject: schedule.subject,
          date: dateStr,
          timeFrom: schedule.timeFrom,
          timeTo: schedule.timeTo,
          capacity: schedule.capacity,
          teacherId: schedule.teacherId,
          students: []
        });
      }
    }
  }

  // Сохраняем новые слоты
  if (newSlots.length > 0) {
    const allSlots = [...existingSlots, ...newSlots];
    await saveSlots(allSlots);
  }

  return newSlots;
}

/**
 * Генерирует слоты для одного расписания на 4 недели
 * @param {object} schedule - расписание преподавателя
 * @param {string} firstSlotDate - дата первого слота в формате YYYY-MM-DD
 * @returns {Array} - массив созданных слотов
 */
export function generateSlotsFromSchedule(schedule, firstSlotDate) {
  const newSlots = [];
  const startDate = new Date(firstSlotDate + 'T00:00:00');
  
  // Генерируем слоты на 4 недели
  for (let week = 0; week < 4; week++) {
    const slotDate = new Date(startDate);
    slotDate.setDate(startDate.getDate() + week * 7);
    
    const dateStr = formatDate(slotDate);
    
    newSlots.push({
      id: generateId('slot'),
      scheduleId: schedule.id,
      courseId: schedule.courseId,
      subject: schedule.subject,
      date: dateStr,
      timeFrom: schedule.timeFrom,
      timeTo: schedule.timeTo,
      capacity: schedule.capacity,
      teacherId: schedule.teacherId,
      students: []
    });
  }
  
  return newSlots;
}

