// Контроллер для преподавателей
import { getSlots, getAttendance, saveAttendance, getUsers, getCourses } from '../services/fileDb.js';

/**
 * Получение слотов преподавателя
 * GET /api/teacher/slots
 */
export async function getMySlots(req, res, next) {
  try {
    const teacherId = req.user.id;
    const { subject, courseId, date } = req.query;
    
    const slots = await getSlots();
    const users = await getUsers();
    const courses = await getCourses();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Фильтруем слоты преподавателя (от сегодня и дальше)
    let mySlots = slots
      .filter(slot => {
        // Сравниваем ID как строки для надежности
        if (String(slot.teacherId) !== String(teacherId)) {
          return false;
        }
        
        // Парсим дату из строки YYYY-MM-DD
        const slotDate = new Date(slot.date + 'T00:00:00');
        slotDate.setHours(0, 0, 0, 0);
        
        // Пропускаем только прошлые даты (не включая сегодня)
        if (slotDate < today) {
          return false;
        }
        
        if (subject && slot.subject !== subject) return false;
        
        // Фильтр по курсу: проверяем вхождение в courseIds или совпадение с courseId
        if (courseId) {
          const courseIdNum = parseInt(courseId);
          const hasCourse = (slot.courseIds && Array.isArray(slot.courseIds) && slot.courseIds.includes(courseIdNum)) ||
                           (slot.courseId === courseIdNum);
          if (!hasCourse) return false;
        }
        
        if (date && slot.date !== date) return false;
        
        return true;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map(slot => {
        // Для нового формата берем все курсы, для старого - один курс
        let slotCourses = [];
        if (slot.courseIds && Array.isArray(slot.courseIds) && slot.courseIds.length > 0) {
          slotCourses = slot.courseIds.map(id => courses.find(c => c.id === id)).filter(Boolean);
        } else if (slot.courseId) {
          const course = courses.find(c => c.id === slot.courseId);
          if (course) slotCourses = [course];
        }
        
        return {
          ...slot,
          course: slotCourses.length > 0 ? { id: slotCourses[0].id, name: slotCourses[0].name } : null,
          courses: slotCourses.map(c => ({ id: c.id, name: c.name }))
        };
      });

    res.json(mySlots);
  } catch (error) {
    next(error);
  }
}

/**
 * Получение списка студентов для слота
 * GET /api/teacher/slots/:slotId/students
 */
export async function getSlotStudents(req, res, next) {
  try {
    const { slotId } = req.params;
    const teacherId = req.user.id;
    
    const slots = await getSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Слот не найден' });
    }

    if (slot.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const users = await getUsers();
    const courses = await getCourses();
    const attendance = await getAttendance();

    // Получаем студентов с их статусами посещаемости
    const students = slot.students.map(studentId => {
      const student = users.find(u => u.id === studentId);
      const att = attendance.find(
        a => a.slotId === slotId && a.studentId === studentId
      );
      
      // Получаем курс студента
      const studentCourse = student?.course ? courses.find(c => c.id === student.course) : null;

      return {
        id: student?.id,
        fio: student?.fio,
        group: student?.group,
        course: studentCourse ? { id: studentCourse.id, name: studentCourse.name } : null,
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

/**
 * Обновление посещаемости
 * PATCH /api/teacher/attendance
 */
export async function updateAttendance(req, res, next) {
  try {
    const { slotId, studentId, attended, completed } = req.body;
    const teacherId = req.user.id;

    if (!slotId || !studentId) {
      return res.status(400).json({ error: 'ID слота и студента обязательны' });
    }

    // Проверяем, что слот принадлежит преподавателю
    const slots = await getSlots();
    const slot = slots.find(s => s.id === slotId);

    if (!slot) {
      return res.status(404).json({ error: 'Слот не найден' });
    }

    if (slot.teacherId !== teacherId) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    if (!slot.students.includes(studentId)) {
      return res.status(400).json({ error: 'Студент не записан на этот слот' });
    }

    // Обновляем посещаемость
    const attendance = await getAttendance();
    const existingIndex = attendance.findIndex(
      a => a.slotId === slotId && a.studentId === studentId
    );

    let updatedAttendance;
    if (existingIndex >= 0) {
      updatedAttendance = [...attendance];
      updatedAttendance[existingIndex] = {
        ...updatedAttendance[existingIndex],
        attended: attended !== undefined ? attended : updatedAttendance[existingIndex].attended,
        completed: completed !== undefined ? completed : updatedAttendance[existingIndex].completed
      };
    } else {
      updatedAttendance = [
        ...attendance,
        {
          slotId,
          studentId,
          attended: attended || false,
          completed: completed || false
        }
      ];
    }

    await saveAttendance(updatedAttendance);

    res.json({ message: 'Посещаемость обновлена', attendance: updatedAttendance.find(a => a.slotId === slotId && a.studentId === studentId) });
  } catch (error) {
    next(error);
  }
}

/**
 * Получение статистики преподавателя
 * GET /api/teacher/stats
 */
export async function getStats(req, res, next) {
  try {
    const teacherId = req.user.id;
    const slots = await getSlots();
    const attendance = await getAttendance();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mySlots = slots.filter(s => {
      // Сравниваем ID как строки
      if (String(s.teacherId) !== String(teacherId)) return false;
      
      // Парсим дату из строки YYYY-MM-DD
      const slotDate = new Date(s.date + 'T00:00:00');
      slotDate.setHours(0, 0, 0, 0);
      return slotDate >= today;
    });

    const totalSlots = mySlots.length;
    const totalStudents = mySlots.reduce((sum, s) => sum + s.students.length, 0);
    
    const totalAttended = mySlots.reduce((sum, slot) => {
      return sum + slot.students.filter(studentId => {
        const att = attendance.find(a => a.slotId === slot.id && a.studentId === studentId);
        return att?.attended;
      }).length;
    }, 0);

    const totalCompleted = mySlots.reduce((sum, slot) => {
      return sum + slot.students.filter(studentId => {
        const att = attendance.find(a => a.slotId === slot.id && a.studentId === studentId);
        return att?.completed;
      }).length;
    }, 0);

    res.json({
      totalSlots,
      totalStudents,
      totalAttended,
      totalCompleted
    });
  } catch (error) {
    next(error);
  }
}

