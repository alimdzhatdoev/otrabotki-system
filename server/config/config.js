// Конфигурация сервера
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Пути к JSON-файлам с данными
  dataPath: join(__dirname, '..', 'data'),
  
  // Имена файлов данных
  files: {
    users: 'users.json',
    courses: 'courses.json',
    subjects: 'subjects.json',
    slots: 'slots.json',
    limits: 'limits.json',
    teacherSchedules: 'teacherSchedules.json',
    attendance: 'attendance.json'
  }
};














