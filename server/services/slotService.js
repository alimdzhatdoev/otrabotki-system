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
    // Поддержка старого формата (courseId) и нового (courseIds)
    let courseIds = [];
    if (schedule.courseIds && Array.isArray(schedule.courseIds) && schedule.courseIds.length > 0) {
      courseIds = schedule.courseIds;
    } else if (schedule.courseId) {
      courseIds = [schedule.courseId];
    }
    
    // Находим первый день недели для этого расписания
    const firstSlotDate = getNextDayOfWeek(schedule.dayOfWeek, today);
    
    // Создаем один общий слот, доступный всем указанным курсам
    for (let week = 0; week < weeksAhead; week++) {
      // Вычисляем дату для каждой недели
      const slotDate = new Date(firstSlotDate);
      slotDate.setDate(firstSlotDate.getDate() + week * 7);
      
      // Пропускаем прошлые даты
      if (slotDate < today) continue;

      const dateStr = formatDate(slotDate);

      // Проверяем, нет ли уже такого слота (с тем же набором курсов)
      const existingSlot = existingSlots.find(s => 
        s.date === dateStr &&
        s.teacherId === schedule.teacherId &&
        s.timeFrom === schedule.timeFrom &&
        s.subject === schedule.subject &&
        JSON.stringify((s.courseIds && s.courseIds.length > 0 ? s.courseIds : (s.courseId ? [s.courseId] : [])).sort()) === JSON.stringify([...courseIds].sort())
      );

      if (!existingSlot) {
        newSlots.push({
          id: generateId('slot'),
          scheduleId: schedule.id,
          // Для обратной совместимости сохраняем первый courseId, но основной массив в courseIds
          courseId: courseIds[0] ?? null,
          courseIds: courseIds,
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
 * Генерирует слоты для одного расписания на указанное количество недель
 * @param {object} schedule - расписание преподавателя
 * @param {string} firstSlotDate - дата первого слота в формате YYYY-MM-DD
 * @param {number} weeksAhead - количество недель вперёд (по умолчанию 4)
 * @returns {Array} - массив созданных слотов
 */
export function generateSlotsFromSchedule(schedule, firstSlotDate, weeksAhead = 4) {
  const newSlots = [];
  const startDate = new Date(firstSlotDate + 'T00:00:00');
  
  // Поддержка старого формата (courseId) и нового (courseIds)
  let courseIds = [];
  if (schedule.courseIds && Array.isArray(schedule.courseIds) && schedule.courseIds.length > 0) {
    courseIds = schedule.courseIds;
  } else if (schedule.courseId) {
    courseIds = [schedule.courseId];
  }
  
  // Генерируем слоты на указанное количество недель (один слот с общим набором курсов)
  for (let week = 0; week < weeksAhead; week++) {
    const slotDate = new Date(startDate);
    slotDate.setDate(startDate.getDate() + week * 7);
    
    const dateStr = formatDate(slotDate);
    
    newSlots.push({
      id: generateId('slot'),
      scheduleId: schedule.id,
      courseId: courseIds[0] ?? null,
      courseIds: courseIds,
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

