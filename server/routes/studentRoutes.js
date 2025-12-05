// Роуты для студентов
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getAvailableSlots,
  bookSlot,
  cancelBooking,
  getMyBookings,
  getLimitsInfo
} from '../controllers/studentController.js';

const router = express.Router();

// Все роуты требуют авторизации и роль студента
router.use(authenticateToken);
router.use(requireRole('student'));

// GET /api/student/slots - доступные слоты
router.get('/slots', getAvailableSlots);

// POST /api/student/book - запись на слот
router.post('/book', bookSlot);

// DELETE /api/student/book/:slotId - отмена записи
router.delete('/book/:slotId', cancelBooking);

// GET /api/student/bookings - мои записи
router.get('/bookings', getMyBookings);

// GET /api/student/limits - информация о лимитах
router.get('/limits', getLimitsInfo);

export default router;


