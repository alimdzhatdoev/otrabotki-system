// Роуты для авторизации
import express from 'express';
import { login, register, getMe, firstSetup } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/auth/login - вход
router.post('/login', login);

// POST /api/auth/register - регистрация студентов
router.post('/register', register);

// POST /api/auth/first-setup - первый вход (установка курса и нового пароля)
router.post('/first-setup', firstSetup);

// GET /api/auth/me - получение текущего пользователя
router.get('/me', authenticateToken, getMe);

export default router;

