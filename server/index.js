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
// CORS настройка
const corsOptions = {
  origin: function (origin, callback) {
    // Список разрешенных origin'ов
    const allowedOrigins = [
      'http://localhost:5173', // Для локальной разработки
      process.env.FRONTEND_URL, // Из переменной окружения
      'https://otrabotki-system.onrender.com', // Прямой URL фронтенда
    ].filter(Boolean); // Убираем undefined значения
    
    // В development разрешаем localhost
    if (config.nodeEnv === 'development') {
      allowedOrigins.push('http://localhost:5173');
    }
    
    // Если origin не указан (например, запрос из Postman или прямой доступ), разрешаем
    if (!origin) {
      return callback(null, true);
    }
    
    // Проверяем, есть ли origin в списке разрешенных
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Логируем для отладки
      console.log('⚠️ CORS: Blocked origin:', origin);
      console.log('✅ CORS: Allowed origins:', allowedOrigins);
      console.log('🔧 CORS: FRONTEND_URL from env:', process.env.FRONTEND_URL);
      // Временно разрешаем для отладки, но лучше вернуть ошибку в production
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
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

