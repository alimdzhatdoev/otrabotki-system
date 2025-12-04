// Роуты для администраторов
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getAnalyticsData,
  getUsersList,
  createUser,
  updateUser,
  deleteUser,
  getLimitsData,
  updateLimits,
  getCoursesList,
  createCourse,
  updateCourse,
  addSubjectToCourse,
  deleteSubjectFromCourse,
  getRequests,
  exportData,
  importData
} from '../controllers/adminController.js';

const router = express.Router();

// Все роуты требуют авторизации и роль администратора
router.use(authenticateToken);
router.use(requireRole('admin'));

// GET /api/admin/analytics - аналитика
router.get('/analytics', getAnalyticsData);

// GET /api/admin/users - список пользователей
router.get('/users', getUsersList);

// POST /api/admin/users - создать пользователя
router.post('/users', createUser);

// PATCH /api/admin/users/:id - обновить пользователя
router.patch('/users/:id', updateUser);

// DELETE /api/admin/users/:id - удалить пользователя
router.delete('/users/:id', deleteUser);

// GET /api/admin/limits - получить лимиты
router.get('/limits', getLimitsData);

// PATCH /api/admin/limits - обновить лимиты
router.patch('/limits', updateLimits);

// GET /api/admin/courses - список курсов
router.get('/courses', getCoursesList);

// POST /api/admin/courses - создать курс
router.post('/courses', createCourse);

// PATCH /api/admin/courses/:id - обновить курс
router.patch('/courses/:id', updateCourse);

// POST /api/admin/courses/:id/subjects - добавить предмет к курсу
router.post('/courses/:id/subjects', addSubjectToCourse);

// DELETE /api/admin/courses/:id/subjects/:subject - удалить предмет из курса
router.delete('/courses/:id/subjects/:subject', deleteSubjectFromCourse);

// GET /api/admin/requests - все заявки
router.get('/requests', getRequests);

// GET /api/admin/data-export - экспорт всех данных
router.get('/data-export', exportData);

// POST /api/admin/data-import - импорт всех данных
router.post('/data-import', importData);

export default router;

