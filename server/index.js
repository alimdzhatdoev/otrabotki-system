// Точка входа Express сервера
import express from 'express';
import cors from 'cors';
import config from './config/config.js';
import { errorHandler } from './middleware/errorHandler.js';

// Роуты
import authRoutes from './routes/authRoutes.js';
import commonRoutes from './routes/commonRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import operatorRoutes from './routes/operatorRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.nodeEnv === 'development' ? 'http://localhost:5173' : undefined,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Логирование запросов (для разработки)
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

// API роуты
app.use('/api/auth', authRoutes);
app.use('/api/common', commonRoutes); // Общие роуты (доступны всем авторизованным)
app.use('/api/student', studentRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/operator', operatorRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Обработка ошибок
app.use(errorHandler);

// Запуск сервера
app.listen(config.port, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${config.port}`);
  console.log(`📁 Данные хранятся в: ${config.dataPath}`);
  console.log(`🌍 Режим: ${config.nodeEnv}`);
});

