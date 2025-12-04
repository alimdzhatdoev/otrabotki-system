// Контроллер для администраторов
import { 
  getUsers, 
  saveUsers, 
  getLimits, 
  saveLimits, 
  getCourses, 
  saveCourses,
  getSlots,
  saveSlots,
  getTeacherSchedules,
  saveTeacherSchedules,
  getAttendance
} from '../services/fileDb.js';
import { getAnalytics } from '../services/analyticsService.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Получение аналитики
 * GET /api/admin/analytics
 */
export async function getAnalyticsData(req, res, next) {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка пользователей
 * GET /api/admin/users
 */
export async function getUsersList(req, res, next) {
  try {
    const { role } = req.query;
    const users = await getUsers();
    
    let filteredUsers = users;
    if (role) {
      filteredUsers = users.filter(u => u.role === role);
    }

    // Убираем пароли из ответа
    const usersWithoutPasswords = filteredUsers.map(({ password, ...user }) => user);
    
    res.json(usersWithoutPasswords);
  } catch (error) {
    next(error);
  }
}

/**
 * Создание пользователя
 * POST /api/admin/users
 */
export async function createUser(req, res, next) {
  try {
    const { login, password, role, fio, group, course, subjects } = req.body;

    if (!login || !password || !role || !fio) {
      return res.status(400).json({ error: 'Логин, пароль, роль и ФИО обязательны' });
    }

    const users = await getUsers();
    
    // Проверяем, нет ли уже такого логина
    if (users.find(u => u.login === login)) {
      return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });
    }

    const newUser = {
      id: generateId('u'),
      login,
      password,
      role,
      fio
    };

    // Добавляем дополнительные поля в зависимости от роли
    if (role === 'student') {
      if (!group || !course) {
        return res.status(400).json({ error: 'Группа и курс обязательны для студента' });
      }
      newUser.group = group;
      newUser.course = parseInt(course);
    } else if (role === 'teacher') {
      if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        return res.status(400).json({ error: 'Предметы обязательны для преподавателя' });
      }
      newUser.subjects = subjects;
    }

    const updatedUsers = [...users, newUser];
    await saveUsers(updatedUsers);

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'Пользователь создан', user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
}

/**
 * Обновление пользователя
 * PATCH /api/admin/users/:id
 */
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === id);

    if (userIndex === -1) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Обновляем пользователя
    const updatedUser = {
      ...users[userIndex],
      ...updates,
      id // Не позволяем менять ID
    };

    users[userIndex] = updatedUser;
    await saveUsers(users);

    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json({ message: 'Пользователь обновлён', user: userWithoutPassword });
  } catch (error) {
    next(error);
  }
}

/**
 * Удаление пользователя
 * DELETE /api/admin/users/:id
 */
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const users = await getUsers();
    const userToDelete = users.find(u => u.id === id);
    const updatedUsers = users.filter(u => u.id !== id);

    if (!userToDelete) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await saveUsers(updatedUsers);

    // Если удаляем преподавателя — удаляем его расписания и слоты
    if (userToDelete.role === 'teacher') {
      const schedules = await getTeacherSchedules();
      const updatedSchedules = schedules.filter(s => s.teacherId !== id);
      await saveTeacherSchedules(updatedSchedules);

      const slots = await getSlots();
      const updatedSlots = slots.filter(s => s.teacherId !== id);
      await saveSlots(updatedSlots);
    }

    res.json({ message: 'Пользователь удалён' });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение лимитов
 * GET /api/admin/limits
 */
export async function getLimitsData(req, res, next) {
  try {
    const limits = await getLimits();
    res.json(limits);
  } catch (error) {
    next(error);
  }
}

/**
 * Обновление лимитов
 * PATCH /api/admin/limits
 */
export async function updateLimits(req, res, next) {
  try {
    const { maxPerDay, maxPerWeek } = req.body;

    if (maxPerDay === undefined || maxPerWeek === undefined) {
      return res.status(400).json({ error: 'maxPerDay и maxPerWeek обязательны' });
    }

    const limits = {
      maxPerDay: parseInt(maxPerDay),
      maxPerWeek: parseInt(maxPerWeek)
    };

    await saveLimits(limits);
    res.json({ message: 'Лимиты обновлены', limits });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение курсов
 * GET /api/admin/courses
 */
export async function getCoursesList(req, res, next) {
  try {
    const courses = await getCourses();
    res.json(courses);
  } catch (error) {
    next(error);
  }
}

/**
 * Создание курса
 * POST /api/admin/courses
 */
export async function createCourse(req, res, next) {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название курса обязательно' });
    }

    const courses = await getCourses();
    
    const newCourse = {
      id: courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1,
      name: name.trim(),
      subjects: []
    };

    const updatedCourses = [...courses, newCourse];
    await saveCourses(updatedCourses);

    res.status(201).json({ message: 'Курс создан', course: newCourse });
  } catch (error) {
    next(error);
  }
}

/**
 * Обновление курса
 * PATCH /api/admin/courses/:id
 */
export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const updatedCourse = {
      ...courses[courseIndex],
      ...updates,
      id: parseInt(id)
    };

    courses[courseIndex] = updatedCourse;
    await saveCourses(courses);

    res.json({ message: 'Курс обновлён', course: updatedCourse });
  } catch (error) {
    next(error);
  }
}

/**
 * Добавление предмета к курсу
 * POST /api/admin/courses/:id/subjects
 */
export async function addSubjectToCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { subject } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Название предмета обязательно' });
    }

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const course = courses[courseIndex];
    if (course.subjects.includes(subject.trim())) {
      return res.status(400).json({ error: 'Такой предмет уже существует' });
    }

    course.subjects.push(subject.trim());
    await saveCourses(courses);

    res.json({ message: 'Предмет добавлен', course });
  } catch (error) {
    next(error);
  }
}

/**
 * Удаление предмета из курса
 * DELETE /api/admin/courses/:id/subjects/:subject
 */
export async function deleteSubjectFromCourse(req, res, next) {
  try {
    const { id, subject } = req.params;

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const course = courses[courseIndex];
    course.subjects = course.subjects.filter(s => s !== subject);
    await saveCourses(courses);

    res.json({ message: 'Предмет удалён', course });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение всех заявок (записей студентов)
 * GET /api/admin/requests
 */
export async function getRequests(req, res, next) {
  try {
    const slots = await getSlots();
    const users = await getUsers();
    const attendance = await getAttendance();

    const requests = slots.flatMap(slot =>
      slot.students.map(studentId => {
        const student = users.find(u => u.id === studentId);
        const teacher = users.find(u => u.id === slot.teacherId);
        const att = attendance.find(a => a.slotId === slot.id && a.studentId === studentId);

        return {
          id: `${slot.id}_${studentId}`,
          slotId: slot.id,
          studentId,
          student: student ? { id: student.id, fio: student.fio, group: student.group } : null,
          subject: slot.subject,
          date: slot.date,
          timeFrom: slot.timeFrom,
          timeTo: slot.timeTo,
          teacherId: slot.teacherId,
          teacher: teacher ? { id: teacher.id, fio: teacher.fio } : null,
          courseId: slot.courseId,
          attended: att?.attended || false,
          completed: att?.completed || false
        };
      })
    );

    res.json(requests);
  } catch (error) {
    next(error);
  }
}

