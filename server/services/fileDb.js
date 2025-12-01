// Сервис для работы с JSON-файлами как с базой данных
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import config from '../config/config.js';

/**
 * Читает данные из JSON-файла
 * @param {string} fileName - имя файла (из config.files)
 * @returns {Promise<any>} - данные из файла
 */
export async function readJson(fileName) {
  try {
    const filePath = join(config.dataPath, fileName);
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Если файл не существует, возвращаем пустой массив или объект по умолчанию
    if (error.code === 'ENOENT') {
      // Определяем тип по имени файла
      if (fileName === config.files.limits) {
        return { maxPerDay: 1, maxPerWeek: 3 };
      }
      return [];
    }
    throw error;
  }
}

/**
 * Записывает данные в JSON-файл
 * @param {string} fileName - имя файла
 * @param {any} data - данные для записи
 * @returns {Promise<void>}
 */
export async function writeJson(fileName, data) {
  const filePath = join(config.dataPath, fileName);
  const jsonString = JSON.stringify(data, null, 2);
  await writeFile(filePath, jsonString, 'utf-8');
}

/**
 * Читает и возвращает все пользователи
 */
export async function getUsers() {
  return await readJson(config.files.users);
}

/**
 * Сохраняет всех пользователей
 */
export async function saveUsers(users) {
  await writeJson(config.files.users, users);
}

/**
 * Читает и возвращает все слоты
 */
export async function getSlots() {
  return await readJson(config.files.slots);
}

/**
 * Сохраняет все слоты
 */
export async function saveSlots(slots) {
  await writeJson(config.files.slots, slots);
}

/**
 * Читает и возвращает лимиты
 */
export async function getLimits() {
  return await readJson(config.files.limits);
}

/**
 * Сохраняет лимиты
 */
export async function saveLimits(limits) {
  await writeJson(config.files.limits, limits);
}

/**
 * Читает и возвращает расписания преподавателей
 */
export async function getTeacherSchedules() {
  return await readJson(config.files.teacherSchedules);
}

/**
 * Сохраняет расписания преподавателей
 */
export async function saveTeacherSchedules(schedules) {
  await writeJson(config.files.teacherSchedules, schedules);
}

/**
 * Читает и возвращает посещаемость
 */
export async function getAttendance() {
  return await readJson(config.files.attendance);
}

/**
 * Сохраняет посещаемость
 */
export async function saveAttendance(attendance) {
  await writeJson(config.files.attendance, attendance);
}

/**
 * Читает и возвращает курсы
 */
export async function getCourses() {
  return await readJson(config.files.courses);
}

/**
 * Сохраняет курсы
 */
export async function saveCourses(courses) {
  await writeJson(config.files.courses, courses);
}

/**
 * Читает и возвращает предметы
 */
export async function getSubjects() {
  return await readJson(config.files.subjects);
}

/**
 * Сохраняет предметы
 */
export async function saveSubjects(subjects) {
  await writeJson(config.files.subjects, subjects);
}

