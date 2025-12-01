// Роуты для операторов
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getTeacherSchedulesList,
  createTeacherSchedule,
  deleteTeacherSchedule,
  generateSlots,
  getAllSlots,
  getScheduleSlots,
  createTeacher,
  getCoursesList,
  getTeachers,
  getSubjectsList,
  createSubject,
  createCourse,
  updateCourse,
  deleteSubjectFromCourse,
  addSubjectsToCourse,
  deleteCourse
} from '../controllers/operatorController.js';

const router = express.Router();

// Все роуты требуют авторизации и роль оператора
router.use(authenticateToken);
router.use(requireRole('operator'));

// GET /api/operator/teacher-schedules - все расписания
router.get('/teacher-schedules', getTeacherSchedulesList);

// POST /api/operator/teacher-schedules - создать расписание
router.post('/teacher-schedules', createTeacherSchedule);

// DELETE /api/operator/teacher-schedules/:id - удалить расписание
router.delete('/teacher-schedules/:id', deleteTeacherSchedule);

// GET /api/operator/teacher-schedules/:id/slots - слоты расписания
router.get('/teacher-schedules/:id/slots', getScheduleSlots);

// POST /api/operator/generate-slots - сгенерировать слоты
router.post('/generate-slots', generateSlots);

// GET /api/operator/slots - все слоты
router.get('/slots', getAllSlots);

// GET /api/operator/courses - получить курсы
router.get('/courses', getCoursesList);

// GET /api/operator/teachers - получить список преподавателей
router.get('/teachers', getTeachers);

// POST /api/operator/teachers - создать преподавателя
router.post('/teachers', createTeacher);

// GET /api/operator/subjects - получить список предметов
router.get('/subjects', getSubjectsList);

// POST /api/operator/subjects - создать предмет
router.post('/subjects', createSubject);

// POST /api/operator/courses - создать курс
router.post('/courses', createCourse);

// PATCH /api/operator/courses/:id - обновить курс
router.patch('/courses/:id', updateCourse);

// DELETE /api/operator/courses/:id - удалить курс
router.delete('/courses/:id', deleteCourse);

// PATCH /api/operator/courses/:id/subjects - добавить предметы к курсу
router.patch('/courses/:id/subjects', addSubjectsToCourse);

// DELETE /api/operator/courses/:id/subjects/:subjectId - удалить предмет из курса
router.delete('/courses/:id/subjects/:subjectId', deleteSubjectFromCourse);

export default router;

