// Общие роуты (доступны всем авторизованным пользователям)
import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getCourses } from '../services/fileDb.js';

const router = express.Router();

// Все роуты требуют авторизации
router.use(authenticateToken);

/**
 * Получение списка курсов (доступно всем авторизованным пользователям)
 * GET /api/common/courses
 */
router.get('/courses', async (req, res, next) => {
  try {
    const courses = await getCourses();
    res.json(courses);
  } catch (error) {
    next(error);
  }
});

export default router;


