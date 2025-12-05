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
  getAttendance,
  saveAttendance,
  getSubjects,
  saveSubjects
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
 * Экспорт всех данных системы (бэкап)
 * GET /api/admin/data-export
 */
export async function exportData(req, res, next) {
  try {
    const [users, slots, teacherSchedules, courses, subjects, attendance, limits] =
      await Promise.all([
        getUsers(),
        getSlots(),
        getTeacherSchedules(),
        getCourses(),
        getSubjects(),
        getAttendance(),
        getLimits()
      ]);

    res.json({
      users,
      slots,
      teacherSchedules,
      courses,
      subjects,
      attendance,
      limits
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Импорт всех данных системы (восстановление из бэкапа)
 * POST /api/admin/data-import
 */
export async function importData(req, res, next) {
  try {
    const {
      users,
      slots,
      teacherSchedules,
      courses,
      subjects,
      attendance,
      limits
    } = req.body || {};

    // Простая валидация типов
    if (users && !Array.isArray(users)) {
      return res.status(400).json({ error: 'Поле users должно быть массивом' });
    }
    if (slots && !Array.isArray(slots)) {
      return res.status(400).json({ error: 'Поле slots должно быть массивом' });
    }
    if (teacherSchedules && !Array.isArray(teacherSchedules)) {
      return res.status(400).json({ error: 'Поле teacherSchedules должно быть массивом' });
    }
    if (courses && !Array.isArray(courses)) {
      return res.status(400).json({ error: 'Поле courses должно быть массивом' });
    }
    if (subjects && !Array.isArray(subjects)) {
      return res.status(400).json({ error: 'Поле subjects должно быть массивом' });
    }
    if (attendance && !Array.isArray(attendance)) {
      return res.status(400).json({ error: 'Поле attendance должно быть массивом' });
    }
    if (limits && typeof limits !== 'object') {
      return res.status(400).json({ error: 'Поле limits должно быть объектом' });
    }

    // Пишем только те файлы, которые реально пришли в бэкапе
    await Promise.all([
      users ? saveUsers(users) : Promise.resolve(),
      slots ? saveSlots(slots) : Promise.resolve(),
      teacherSchedules ? saveTeacherSchedules(teacherSchedules) : Promise.resolve(),
      courses ? saveCourses(courses) : Promise.resolve(),
      subjects ? saveSubjects(subjects) : Promise.resolve(),
      attendance ? saveAttendance(attendance) : Promise.resolve(),
      limits ? saveLimits(limits) : Promise.resolve()
    ]);

    res.json({ message: 'Данные успешно импортированы' });
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

/**
 * Получение всех слотов преподавателя
 * GET /api/admin/teachers/:teacherId/slots
 */
export async function getTeacherSlots(req, res, next) {
  try {
    const { teacherId } = req.params;
    
    const slots = await getSlots();
    const courses = await getCourses();
    
    // Фильтруем слоты преподавателя (все, включая прошедшие)
    const teacherSlots = slots
      .filter(slot => String(slot.teacherId) === String(teacherId))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(slot => {
        const course = courses.find(c => c.id === slot.courseId);
        return {
          ...slot,
          course: course ? { id: course.id, name: course.name } : null
        };
      });

    res.json(teacherSlots);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка студентов для слота (для админа)
 * GET /api/admin/slots/:slotId/students
 */
export async function getSlotStudentsForAdmin(req, res, next) {
  try {
    const { slotId } = req.params;
    
    const slots = await getSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Слот не найден' });
    }

    const users = await getUsers();
    const attendance = await getAttendance();

    // Получаем студентов с их статусами посещаемости
    const students = slot.students.map(studentId => {
      const student = users.find(u => u.id === studentId);
      const att = attendance.find(
        a => a.slotId === slotId && a.studentId === studentId
      );

      return {
        id: student?.id,
        fio: student?.fio,
        group: student?.group,
        attended: att?.attended || false,
        completed: att?.completed || false
      };
    });

    res.json({
      slot: {
        id: slot.id,
        subject: slot.subject,
        date: slot.date,
        timeFrom: slot.timeFrom,
        timeTo: slot.timeTo
      },
      students
    });
  } catch (error) {
    next(error);
  }
}

