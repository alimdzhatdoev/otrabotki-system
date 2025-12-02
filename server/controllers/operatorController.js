// Контроллер для оператора
import { 
  getTeacherSchedules, 
  saveTeacherSchedules, 
  getSlots, 
  saveSlots,
  getUsers,
  saveUsers,
  getCourses,
  saveCourses,
  getSubjects,
  saveSubjects
} from '../services/fileDb.js';
import { generateSlotsFromSchedule, generateSlotsFromSchedules } from '../services/slotService.js';
import { getNextDayOfWeek, formatDate } from '../utils/dateUtils.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Получение списка расписаний преподавателей
 * GET /api/operator/teacher-schedules
 */
export async function getTeacherSchedulesList(req, res, next) {
  try {
    const schedules = await getTeacherSchedules();
    const users = await getUsers();
    const courses = await getCourses();
    
    // Добавляем информацию о преподавателе и курсе
    const schedulesWithDetails = schedules.map(schedule => {
      const teacher = users.find(u => u.id === schedule.teacherId);
      const course = courses.find(c => c.id === schedule.courseId);
      
      return {
        ...schedule,
        teacher: teacher ? { id: teacher.id, fio: teacher.fio } : null,
        course: course ? { id: course.id, name: course.name } : null
      };
    });
    
    res.json(schedulesWithDetails);
  } catch (error) {
    next(error);
  }
}

/**
 * Создание расписания преподавателя
 * POST /api/operator/teacher-schedules
 */
export async function createTeacherSchedule(req, res, next) {
  try {
    const { teacherId, subject, courseId, dayOfWeek, timeFrom, timeTo, capacity } = req.body;

    if (!teacherId || !subject || !courseId || dayOfWeek === undefined || !timeFrom || !timeTo || !capacity) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    const schedules = await getTeacherSchedules();
    
    const newSchedule = {
      id: generateId(),
      teacherId,
      subject,
      courseId,
      dayOfWeek: parseInt(dayOfWeek),
      timeFrom,
      timeTo,
      capacity: parseInt(capacity)
    };

    schedules.push(newSchedule);
    await saveTeacherSchedules(schedules);

    res.status(201).json({ message: 'Расписание создано', schedule: newSchedule });
  } catch (error) {
    next(error);
  }
}

/**
 * Удаление расписания преподавателя
 * DELETE /api/operator/teacher-schedules/:id
 */
export async function deleteTeacherSchedule(req, res, next) {
  try {
    const { id } = req.params;
    const schedules = await getTeacherSchedules();
    const scheduleIndex = schedules.findIndex(s => s.id === id);

    if (scheduleIndex === -1) {
      return res.status(404).json({ error: 'Расписание не найдено' });
    }

    // Удаляем расписание
    schedules.splice(scheduleIndex, 1);
    await saveTeacherSchedules(schedules);

    // Удаляем связанные слоты
    const slots = await getSlots();
    const filteredSlots = slots.filter(slot => slot.scheduleId !== id);
    await saveSlots(filteredSlots);

    res.json({ message: 'Расписание удалено' });
  } catch (error) {
    next(error);
  }
}

/**
 * Генерация слотов из расписания
 * POST /api/operator/generate-slots
 */
export async function generateSlots(req, res, next) {
  try {
    const { scheduleId, firstSlotDate, weeksAhead } = req.body;
    
    // Нормализуем scheduleId (убираем null, undefined, пустые строки, строку "null")
    const normalizedScheduleId = scheduleId && 
                                 scheduleId !== 'null' && 
                                 scheduleId !== 'undefined' && 
                                 scheduleId !== '' && 
                                 scheduleId !== null && 
                                 scheduleId !== undefined ? scheduleId : null;
    const normalizedFirstSlotDate = firstSlotDate && 
                                    firstSlotDate !== 'null' && 
                                    firstSlotDate !== 'undefined' && 
                                    firstSlotDate !== '' && 
                                    firstSlotDate !== null && 
                                    firstSlotDate !== undefined ? firstSlotDate : null;
    
    // Если scheduleId не указан, генерируем слоты для всех расписаний
    if (!normalizedScheduleId) {
      const weeks = weeksAhead || 4;
      const newSlots = await generateSlotsFromSchedules(weeks);
      return res.json({ message: `Создано ${newSlots.length} слотов`, slots: newSlots });
    }

    // Если scheduleId указан, но нет firstSlotDate, вычисляем дату автоматически
    if (normalizedScheduleId && !normalizedFirstSlotDate) {
      const schedules = await getTeacherSchedules();
      const schedule = schedules.find(s => s.id === normalizedScheduleId);

      if (!schedule) {
        // Пробуем еще раз через небольшую задержку (на случай, если расписание еще сохраняется)
        await new Promise(resolve => setTimeout(resolve, 100));
        const schedulesRetry = await getTeacherSchedules();
        const scheduleRetry = schedulesRetry.find(s => s.id === normalizedScheduleId);
        
        if (!scheduleRetry) {
          return res.status(404).json({ error: 'Расписание не найдено' });
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const firstSlotDateObj = getNextDayOfWeek(scheduleRetry.dayOfWeek, today);
        const firstSlotDateStr = formatDate(firstSlotDateObj);

        const slots = await getSlots();
        const newSlots = generateSlotsFromSchedule(scheduleRetry, firstSlotDateStr);
        
        // Добавляем новые слоты
        const updatedSlots = [...slots, ...newSlots];
        await saveSlots(updatedSlots);

        return res.json({ message: `Создано ${newSlots.length} слотов`, slots: newSlots });
      }

      // Вычисляем дату первого слота на основе dayOfWeek
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const firstSlotDateObj = getNextDayOfWeek(schedule.dayOfWeek, today);
      const firstSlotDateStr = formatDate(firstSlotDateObj);

      const slots = await getSlots();
      const newSlots = generateSlotsFromSchedule(schedule, firstSlotDateStr);
      
      // Добавляем новые слоты
      const updatedSlots = [...slots, ...newSlots];
      await saveSlots(updatedSlots);

      return res.json({ message: `Создано ${newSlots.length} слотов`, slots: newSlots });
    }

    // Если указаны и scheduleId, и firstSlotDate
    if (normalizedScheduleId && normalizedFirstSlotDate) {
      const schedules = await getTeacherSchedules();
      const schedule = schedules.find(s => s.id === normalizedScheduleId);

      if (!schedule) {
        return res.status(404).json({ error: 'Расписание не найдено' });
      }

      const slots = await getSlots();
      const newSlots = generateSlotsFromSchedule(schedule, normalizedFirstSlotDate);
      
      // Добавляем новые слоты
      const updatedSlots = [...slots, ...newSlots];
      await saveSlots(updatedSlots);

      return res.json({ message: `Создано ${newSlots.length} слотов`, slots: newSlots });
    }

    // Если ничего не указано - это не должно произойти, но на всякий случай
    return res.status(400).json({ error: 'ID расписания или количество недель обязательны' });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение всех слотов
 * GET /api/operator/slots
 */
export async function getAllSlots(req, res, next) {
  try {
    const slots = await getSlots();
    const users = await getUsers();
    const courses = await getCourses();

    const slotsWithDetails = slots.map(slot => {
      const teacher = users.find(u => u.id === slot.teacherId);
      const course = courses.find(c => c.id === slot.courseId);

      return {
        ...slot,
        teacher: teacher ? { id: teacher.id, fio: teacher.fio } : null,
        course: course ? { id: course.id, name: course.name } : null,
        bookedCount: slot.students.length
      };
    });

    res.json(slotsWithDetails);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение слотов для конкретного расписания
 * GET /api/operator/schedules/:id/slots
 */
export async function getScheduleSlots(req, res, next) {
  try {
    const { id } = req.params;
    const slots = await getSlots();
    const scheduleSlots = slots.filter(slot => slot.scheduleId === id);
    res.json(scheduleSlots);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка преподавателей
 * GET /api/operator/teachers
 */
export async function getTeachers(req, res, next) {
  try {
    const users = await getUsers();
    const teachers = users.filter(u => u.role === 'teacher');
    res.json(teachers);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка курсов
 * GET /api/operator/courses
 */
export async function getCoursesList(req, res, next) {
  try {
    const courses = await getCourses();
    const subjects = await getSubjects();
    
    // Добавляем полные данные предметов к каждому курсу
    const coursesWithSubjects = courses.map(course => ({
      ...course,
      subjects: subjects.filter(s => course.subjectIds?.includes(s.id))
    }));
    
    res.json(coursesWithSubjects);
  } catch (error) {
    next(error);
  }
}

/**
 * Создание преподавателя
 * POST /api/operator/teachers
 */
export async function createTeacher(req, res, next) {
  try {
    const { fio, subjects } = req.body;

    if (!fio || !subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return res.status(400).json({ error: 'ФИО и предметы обязательны' });
    }

    const users = await getUsers();
    
    // Генерируем логин из ФИО (транслитерация)
    const login = fio.toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[а-яё]/g, (char) => {
        const map = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      });

    const newTeacher = {
      id: generateId(),
      login,
      password: '123', // Пароль по умолчанию
      role: 'teacher',
      fio: fio.trim(),
      subjects: subjects.map(s => s.trim())
    };

    users.push(newTeacher);
    await saveUsers(users);

    res.status(201).json({ 
      message: 'Преподаватель создан', 
      teacher: {
        ...newTeacher,
        password: newTeacher.password // Возвращаем пароль для отображения
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка предметов
 * GET /api/operator/subjects
 */
export async function getSubjectsList(req, res, next) {
  try {
    const subjects = await getSubjects();
    res.json(subjects);
  } catch (error) {
    next(error);
  }
}

/**
 * Создание предмета
 * POST /api/operator/subjects
 */
export async function createSubject(req, res, next) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Название предмета обязательно' });
    }

    const subjects = await getSubjects();
    
    // Проверяем, что предмет с таким названием не существует
    const existingSubject = subjects.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
    if (existingSubject) {
      return res.status(400).json({ error: 'Предмет с таким названием уже существует' });
    }

    const newSubject = {
      id: subjects.length > 0 ? Math.max(...subjects.map(s => s.id)) + 1 : 1,
      name: name.trim()
    };

    subjects.push(newSubject);
    await saveSubjects(subjects);

    res.status(201).json({ message: 'Предмет создан', subject: newSubject });
  } catch (error) {
    next(error);
  }
}

/**
 * Создание курса
 * POST /api/operator/courses
 */
export async function createCourse(req, res, next) {
  try {
    const { subjectIds = [] } = req.body;

    const courses = await getCourses();
    const subjects = await getSubjects();
    
    // Если переданы subjectIds, проверяем их валидность
    if (subjectIds && Array.isArray(subjectIds) && subjectIds.length > 0) {
      const invalidSubjects = subjectIds.filter(id => !subjects.find(s => s.id === id));
      if (invalidSubjects.length > 0) {
        return res.status(400).json({ error: 'Некоторые выбранные предметы не найдены' });
      }
    }

    // Генерируем автоматический номер курса (следующий номер)
    const courseNumbers = courses.map(c => {
      const num = parseInt(c.name);
      return isNaN(num) ? 0 : num;
    });
    const nextCourseNumber = courseNumbers.length > 0 ? Math.max(...courseNumbers) + 1 : 1;

    const newCourse = {
      id: courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1,
      name: String(nextCourseNumber),
      subjectIds: Array.isArray(subjectIds) ? subjectIds.map(id => parseInt(id)) : []
    };

    courses.push(newCourse);
    await saveCourses(courses);

    // Возвращаем курс с полными данными предметов
    const courseWithSubjects = {
      ...newCourse,
      subjects: subjects.filter(s => newCourse.subjectIds.includes(s.id))
    };

    res.status(201).json({ message: 'Курс создан', course: courseWithSubjects });
  } catch (error) {
    next(error);
  }
}

/**
 * Обновление курса
 * PATCH /api/operator/courses/:id
 */
export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { name, subjectIds } = req.body;

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const subjects = await getSubjects();
    
    // Если переданы subjectIds, проверяем их валидность
    if (subjectIds && Array.isArray(subjectIds)) {
      const invalidSubjects = subjectIds.filter(subjectId => !subjects.find(s => s.id === subjectId));
      if (invalidSubjects.length > 0) {
        return res.status(400).json({ error: 'Некоторые выбранные предметы не найдены' });
      }
    }

    const updatedCourse = {
      ...courses[courseIndex],
      ...(name && { name: name.trim() }),
      ...(subjectIds && { subjectIds: subjectIds.map(id => parseInt(id)) })
    };

    courses[courseIndex] = updatedCourse;
    await saveCourses(courses);

    // Возвращаем курс с полными данными предметов
    const courseWithSubjects = {
      ...updatedCourse,
      subjects: subjects.filter(s => updatedCourse.subjectIds.includes(s.id))
    };

    res.json({ message: 'Курс обновлён', course: courseWithSubjects });
  } catch (error) {
    next(error);
  }
}

/**
 * Удаление предмета из курса
 * DELETE /api/operator/courses/:id/subjects/:subjectId
 */
export async function deleteSubjectFromCourse(req, res, next) {
  try {
    const { id, subjectId } = req.params;

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const course = courses[courseIndex];
    course.subjectIds = course.subjectIds.filter(sId => sId !== parseInt(subjectId));
    await saveCourses(courses);

    const subjects = await getSubjects();
    const courseWithSubjects = {
      ...course,
      subjects: subjects.filter(s => course.subjectIds.includes(s.id))
    };

    res.json({ message: 'Предмет удалён из курса', course: courseWithSubjects });
  } catch (error) {
    next(error);
  }
}

/**
 * Добавление предметов к курсу
 * PATCH /api/operator/courses/:id/subjects
 */
export async function addSubjectsToCourse(req, res, next) {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;

    if (!subjectIds || !Array.isArray(subjectIds) || subjectIds.length === 0) {
      return res.status(400).json({ error: 'Необходимо указать массив subjectIds' });
    }

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    const subjects = await getSubjects();
    
    // Проверяем валидность предметов
    const invalidSubjects = subjectIds.filter(subjectId => !subjects.find(s => s.id === parseInt(subjectId)));
    if (invalidSubjects.length > 0) {
      return res.status(400).json({ error: 'Некоторые выбранные предметы не найдены' });
    }

    const course = courses[courseIndex];
    // Добавляем только те предметы, которых еще нет в курсе
    const newSubjectIds = subjectIds.map(id => parseInt(id)).filter(sId => !course.subjectIds.includes(sId));
    course.subjectIds = [...course.subjectIds, ...newSubjectIds];
    
    await saveCourses(courses);

    const courseWithSubjects = {
      ...course,
      subjects: subjects.filter(s => course.subjectIds.includes(s.id))
    };

    res.json({ message: 'Предметы добавлены к курсу', course: courseWithSubjects });
  } catch (error) {
    next(error);
  }
}

/**
 * Удаление курса
 * DELETE /api/operator/courses/:id
 */
export async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;

    const courses = await getCourses();
    const courseIndex = courses.findIndex(c => c.id === parseInt(id));

    if (courseIndex === -1) {
      return res.status(404).json({ error: 'Курс не найден' });
    }

    courses.splice(courseIndex, 1);
    await saveCourses(courses);

    res.json({ message: 'Курс удалён' });
  } catch (error) {
    next(error);
  }
}
