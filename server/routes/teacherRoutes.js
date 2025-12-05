// Роуты для преподавателей
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getMySlots,
  getSlotStudents,
  updateAttendance,
  getStats
} from '../controllers/teacherController.js';

const router = express.Router();

// Все роуты требуют авторизации и роль преподавателя
router.use(authenticateToken);
router.use(requireRole('teacher'));

// GET /api/teacher/slots - мои слоты
router.get('/slots', getMySlots);

// GET /api/teacher/slots/:slotId/students - студенты слота
router.get('/slots/:slotId/students', getSlotStudents);

// PATCH /api/teacher/attendance - обновление посещаемости
router.patch('/attendance', updateAttendance);

// GET /api/teacher/stats - статистика
router.get('/stats', getStats);

export default router;



