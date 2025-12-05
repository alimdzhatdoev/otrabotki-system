// Middleware для проверки авторизации и ролей
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Middleware для проверки JWT токена
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded; // Добавляем данные пользователя в req
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

/**
 * Middleware для проверки роли пользователя
 * @param {string|string[]} allowedRoles - разрешённые роли
 */
export function requireRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Пользователь не авторизован' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    next();
  };
}


