// Роуты для авторизации
import express from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login - вход
router.post('/login', login);

// POST /api/auth/register - регистрация студентов
router.post('/register', register);

// GET /api/auth/me - получение текущего пользователя
router.get('/me', authenticateToken, getMe);

export default router;

