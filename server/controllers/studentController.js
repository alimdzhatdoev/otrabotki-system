// Контроллер для студентов
import { getSlots, saveSlots, getLimits, getUsers, getCourses } from '../services/fileDb.js';
import { checkBookingLimits } from '../services/limitService.js';

/**
 * Получение доступных слотов для студента
 * GET /api/student/slots
 */
export async function getAvailableSlots(req, res, next) {
  try {
    const { courseId, subject, date } = req.query;
    const studentId = req.user.id;

    // Получаем данные студента
    const users = await getUsers();
    const student = users.find(u => u.id === studentId);
    
    if (!student || student.role !== 'student') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const slots = await getSlots();
    const usersList = await getUsers();
    const courses = await getCourses();

    // Фильтруем слоты
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let availableSlots = slots.filter(slot => {
      // Проверяем, доступен ли слот для курса студента
      let isAvailableForStudent = false;
      
      if (slot.courseIds && Array.isArray(slot.courseIds)) {
        // Новый формат: проверяем, есть ли курс студента в массиве courseIds
        isAvailableForStudent = slot.courseIds.includes(student.course);
      } else if (slot.courseId !== null && slot.courseId !== undefined) {
        // Старый формат: проверяем прямое совпадение
        isAvailableForStudent = slot.courseId === student.course;
      }
      
      if (!isAvailableForStudent) return false;
      
      // Фильтр по предмету
      if (subject && slot.subject !== subject) return false;
      
      // Фильтр по дате
      if (date && slot.date !== date) return false;
      
      // Показываем только слоты в пределах 7 дней от сегодня
      const slotDate = new Date(slot.date + 'T00:00:00');
      const daysDiff = Math.ceil((slotDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 0 || daysDiff > 7) return false;
      
      return true;
    });

    // Добавляем информацию о заполненности и преподавателе
    availableSlots = availableSlots.map(slot => {
      const teacher = usersList.find(u => u.id === slot.teacherId);
      // Для нового формата берем первый курс из массива, для старого - courseId
      const slotCourseId = slot.courseIds && slot.courseIds.length > 0
        ? slot.courseIds[0]
        : slot.courseId;
      const course = courses.find(c => c.id === slotCourseId);
      const isBooked = slot.students.includes(studentId);
      
      return {
        ...slot,
        teacher: teacher ? { id: teacher.id, fio: teacher.fio } : null,
        course: course ? { id: course.id, name: course.name } : null,
        bookedCount: slot.students.length,
        isBooked,
        availableSpots: slot.capacity - slot.students.length
      };
    });

    res.json(availableSlots);
  } catch (error) {
    next(error);
  }
}

/**
 * Запись студента на слот
 * POST /api/student/book
 */
export async function bookSlot(req, res, next) {
  try {
    const { slotId } = req.body;
    const studentId = req.user.id;

    if (!slotId) {
      return res.status(400).json({ error: 'ID слота обязателен' });
    }

    const slots = await getSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Слот не найден' });
    }

    // Проверка: студент уже записан
    if (slot.students.includes(studentId)) {
      return res.status(400).json({ error: 'Вы уже записаны на эту отработку' });
    }

    // Проверка: слот заполнен
    if (slot.students.length >= slot.capacity) {
      return res.status(400).json({ error: 'Все места заняты' });
    }

    // Проверка: запись можно сделать только в течение 7 дней от сегодня
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const slotDate = new Date(slot.date + 'T00:00:00');
    const daysDiff = Math.ceil((slotDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return res.status(400).json({ error: 'Нельзя записаться на прошедшую отработку' });
    }
    
    if (daysDiff > 7) {
      return res.status(400).json({ error: 'Можно записаться только на отработки в течение 7 дней от сегодня' });
    }

    // Проверка: у одного преподавателя можно в день отработать только 1 отработку
    const studentBookings = slots.filter(s => s.students.includes(studentId));
    const sameTeacherSameDay = studentBookings.find(s => 
      s.teacherId === slot.teacherId && s.date === slot.date
    );
    
    if (sameTeacherSameDay) {
      return res.status(400).json({ error: 'У одного преподавателя можно в день отработать только 1 отработку' });
    }

    // Проверка лимитов
    const limitCheck = await checkBookingLimits(studentId, slot.date);
    if (!limitCheck.valid) {
      return res.status(400).json({ error: limitCheck.message });
    }

    // Записываем студента
    const updatedSlots = slots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          students: [...s.students, studentId]
        };
      }
      return s;
    });

    await saveSlots(updatedSlots);

    res.json({ message: 'Вы успешно записались на отработку', slot: updatedSlots.find(s => s.id === slotId) });
  } catch (error) {
    next(error);
  }
}

/**
 * Отмена записи студента на слот
 * DELETE /api/student/book/:slotId
 */
export async function cancelBooking(req, res, next) {
  try {
    const { slotId } = req.params;
    const studentId = req.user.id;

    const slots = await getSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Слот не найден' });
    }

    // Проверка: студент записан
    if (!slot.students.includes(studentId)) {
      return res.status(400).json({ error: 'Вы не записаны на эту отработку' });
    }

    // Проверка: отменить запись можно не позднее 5 минут до начала отработки
    const now = new Date();
    const slotDate = new Date(slot.date + 'T00:00:00');
    const [hours, minutes] = slot.timeFrom.split(':').map(Number);
    const slotStartTime = new Date(slotDate);
    slotStartTime.setHours(hours, minutes, 0, 0);
    
    const minutesUntilStart = (slotStartTime - now) / (1000 * 60);
    
    if (minutesUntilStart < 5) {
      return res.status(400).json({ error: 'Отменить запись можно не позднее 5 минут до начала отработки' });
    }

    // Отменяем запись
    const updatedSlots = slots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          students: s.students.filter(id => id !== studentId)
        };
      }
      return s;
    });

    await saveSlots(updatedSlots);

    res.json({ message: 'Запись отменена' });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение всех записей студента
 * GET /api/student/bookings
 */
export async function getMyBookings(req, res, next) {
  try {
    const studentId = req.user.id;
    const slots = await getSlots();
    const users = await getUsers();
    const courses = await getCourses();

    // Получаем слоты, на которые записан студент
    const myBookings = slots
      .filter(slot => slot.students.includes(studentId))
      .map(slot => {
        const teacher = users.find(u => u.id === slot.teacherId);
        // Для нового формата берем первый курс из массива, для старого - courseId
        const slotCourseId = slot.courseIds && slot.courseIds.length > 0
          ? slot.courseIds[0]
          : slot.courseId;
        const course = courses.find(c => c.id === slotCourseId);
        
        return {
          ...slot,
          teacher: teacher ? { id: teacher.id, fio: teacher.fio } : null,
          course: course ? { id: course.id, name: course.name } : null
        };
      });

    res.json(myBookings);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение лимитов для студента
 * GET /api/student/limits
 */
export async function getLimitsInfo(req, res, next) {
  try {
    const studentId = req.user.id;
    const limits = await getLimits();
    const slots = await getSlots();
    const today = new Date().toISOString().split('T')[0];

    // Подсчитываем текущие записи
    const myBookings = slots.filter(slot => slot.students.includes(studentId));
    const bookingsToday = myBookings.filter(s => s.date === today).length;
    
    // Подсчитываем записи на текущую неделю
    const todayObj = new Date();
    const weekStart = new Date(todayObj);
    weekStart.setDate(todayObj.getDate() - todayObj.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const bookingsThisWeek = myBookings.filter(slot => {
      const d = new Date(slot.date);
      return d >= weekStart && d <= weekEnd;
    }).length;

    res.json({
      limits,
      current: {
        today: bookingsToday,
        week: bookingsThisWeek
      }
    });
  } catch (error) {
    next(error);
  }
}

