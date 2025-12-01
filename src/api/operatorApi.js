// API для операторов
import { get, post, patch, del } from './httpClient.js';

/**
 * Получение всех расписаний преподавателей
 * @returns {Promise<Array>}
 */
export async function getTeacherSchedules() {
  return await get('/operator/teacher-schedules');
}

/**
 * Создание нового расписания
 * @param {object} scheduleData - данные расписания
 * @returns {Promise<object>}
 */
export async function createTeacherSchedule(scheduleData) {
  return await post('/operator/teacher-schedules', scheduleData);
}

/**
 * Удаление расписания
 * @param {string} scheduleId - ID расписания
 * @returns {Promise<object>}
 */
export async function deleteTeacherSchedule(scheduleId) {
  return await del(`/operator/teacher-schedules/${scheduleId}`);
}

/**
 * Получение слотов для расписания
 * @param {string} scheduleId - ID расписания
 * @returns {Promise<Array>}
 */
export async function getScheduleSlots(scheduleId) {
  return await get(`/operator/teacher-schedules/${scheduleId}/slots`);
}

/**
 * Генерация слотов из расписаний
 * @param {string} scheduleId - опционально, ID конкретного расписания
 * @param {number} weeksAhead - количество недель вперёд (по умолчанию 4)
 * @returns {Promise<object>}
 */
export async function generateSlots(scheduleId = null, weeksAhead = 4) {
  return await post('/operator/generate-slots', { scheduleId, weeksAhead });
}

/**
 * Получение всех слотов
 * @returns {Promise<Array>}
 */
export async function getAllSlots() {
  return await get('/operator/slots');
}

/**
 * Получение списка курсов
 * @returns {Promise<Array>}
 */
export async function getCourses() {
  return await get('/operator/courses');
}

/**
 * Получение списка преподавателей
 * @returns {Promise<Array>}
 */
export async function getTeachers() {
  return await get('/operator/teachers');
}

/**
 * Создание преподавателя
 * @param {object} teacherData - данные преподавателя (fio, subjects)
 * @returns {Promise<object>}
 */
export async function createTeacher(teacherData) {
  return await post('/operator/teachers', teacherData);
}

/**
 * Получение списка предметов
 * @returns {Promise<Array>}
 */
export async function getSubjects() {
  return await get('/operator/subjects');
}

/**
 * Создание предмета
 * @param {object} subjectData - данные предмета (name)
 * @returns {Promise<object>}
 */
export async function createSubject(subjectData) {
  return await post('/operator/subjects', subjectData);
}

/**
 * Создание курса
 * @param {object} courseData - данные курса (name, subjectIds)
 * @returns {Promise<object>}
 */
export async function createCourse(courseData) {
  return await post('/operator/courses', courseData);
}

/**
 * Обновление курса
 * @param {number} courseId - ID курса
 * @param {object} updates - обновления (name, subjectIds)
 * @returns {Promise<object>}
 */
export async function updateCourse(courseId, updates) {
  return await patch(`/operator/courses/${courseId}`, updates);
}

/**
 * Удаление предмета из курса
 * @param {number} courseId - ID курса
 * @param {number} subjectId - ID предмета
 * @returns {Promise<object>}
 */
export async function deleteSubjectFromCourse(courseId, subjectId) {
  return await del(`/operator/courses/${courseId}/subjects/${subjectId}`);
}

/**
 * Добавление предметов к курсу
 * @param {number} courseId - ID курса
 * @param {Array<number>} subjectIds - массив ID предметов
 * @returns {Promise<object>}
 */
export async function addSubjectsToCourse(courseId, subjectIds) {
  return await patch(`/operator/courses/${courseId}/subjects`, { subjectIds });
}

/**
 * Удаление курса
 * @param {number} courseId - ID курса
 * @returns {Promise<object>}
 */
export async function deleteCourse(courseId) {
  return await del(`/operator/courses/${courseId}`);
}

