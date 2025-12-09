// Контроллер для авторизации
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { getUsers, saveUsers } from '../services/fileDb.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Вход в систему
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { login: loginValue, password } = req.body;

    if (!loginValue || !password) {
      return res.status(400).json({ error: 'Логин и пароль обязательны' });
    }

    const users = await getUsers();
    const user = users.find(u => u.login === loginValue && u.password === password);

    if (!user) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    // Проверка на первый вход для студента: логин == пароль и курс не указан
    if (user.role === 'student' && user.login === user.password && (user.course === null || user.course === undefined)) {
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        needsSetup: true,
        user: userWithoutPassword
      });
    }

    // Создаём JWT токен
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        login: user.login
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Возвращаем токен и данные пользователя (без пароля)
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Первый вход студента: установка курса и нового пароля
 * POST /api/auth/first-setup
 */
export async function firstSetup(req, res, next) {
  try {
    const { login: loginValue, oldPassword, newPassword, course } = req.body;

    if (!loginValue || !oldPassword || !newPassword || course === undefined || course === null) {
      return res.status(400).json({ error: 'Логин, старый пароль, новый пароль и курс обязательны' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.login === loginValue && u.password === oldPassword && u.role === 'student');

    if (userIndex === -1) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }

    const updatedUser = {
      ...users[userIndex],
      password: newPassword,
      course: parseInt(course),
      mustChangePassword: false,
      mustSetCourse: false
    };

    users[userIndex] = updatedUser;
    await saveUsers(users);

    const token = jwt.sign(
      { 
        id: updatedUser.id, 
        role: updatedUser.role,
        login: updatedUser.login
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'Данные обновлены',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Регистрация студента
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const { password, email, phone, studentCardNumber, fio, group, course } = req.body;

    // Валидация обязательных полей
    if (!password || !email || !studentCardNumber || !fio || !group || !course) {
      return res.status(400).json({ 
        error: 'Все поля обязательны: пароль, email, номер зачетки, ФИО, группа, курс' 
      });
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Некорректный формат email' });
    }

    // Телефон опциональный, но если указан - валидируем
    let cleanPhone = null;
    if (phone) {
      const phoneRegex = /^[0-9]{10,15}$/;
      cleanPhone = phone.replace(/[^0-9]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        return res.status(400).json({ error: 'Некорректный формат телефона' });
      }
    }

    // Валидация пароля (минимум 6 символов)
    if (password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен содержать минимум 6 символов' });
    }

    const users = await getUsers();

    // Используем email как логин
    const login = email.toLowerCase().trim();

    // Проверка уникальности email (логина)
    if (users.find(u => u.login === login || u.email === email)) {
      return res.status(400).json({ error: 'Пользователь с таким email уже зарегистрирован' });
    }

    // Проверка уникальности номера зачетки
    if (users.find(u => u.studentCardNumber === studentCardNumber)) {
      return res.status(400).json({ error: 'Студент с таким номером зачетки уже зарегистрирован' });
    }

    // Создаем нового студента
    const newStudent = {
      id: generateId('s'),
      login, // Используем email как логин
      password,
      email: email.toLowerCase().trim(),
      ...(cleanPhone && { phone: cleanPhone }), // Добавляем телефон только если указан
      studentCardNumber: studentCardNumber.trim(),
      role: 'student',
      fio: fio.trim(),
      group: group.trim(),
      course: parseInt(course)
    };

    const updatedUsers = [...users, newStudent];
    await saveUsers(updatedUsers);

    // Создаём JWT токен для автоматического входа
    const token = jwt.sign(
      { 
        id: newStudent.id, 
        role: newStudent.role,
        login: newStudent.login
      },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    // Возвращаем токен и данные пользователя (без пароля)
    const { password: _, ...studentWithoutPassword } = newStudent;

    res.status(201).json({
      message: 'Регистрация успешна',
      token,
      user: studentWithoutPassword
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение текущего пользователя
 * GET /api/auth/me
 */
export async function getMe(req, res, next) {
  try {
    const users = await getUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    next(error);
  }
}

