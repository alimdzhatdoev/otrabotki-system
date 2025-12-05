// Сервис для аналитики и статистики
import { getUsers, getSlots, getAttendance, getCourses } from './fileDb.js';

/**
 * Получает общую аналитику для администратора
 */
export async function getAnalytics() {
  const users = await getUsers();
  const slots = await getSlots();
  const attendance = await getAttendance();
  const courses = await getCourses();

  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  const operators = users.filter(u => u.role === 'operator');
  const admins = users.filter(u => u.role === 'admin');

  // Заявки = записи студентов
  const requests = slots.flatMap(slot =>
    slot.students.map(studentId => ({
      id: `${slot.id}_${studentId}`,
      slotId: slot.id,
      studentId,
      subject: slot.subject,
      date: slot.date,
      timeFrom: slot.timeFrom,
      timeTo: slot.timeTo,
      teacherId: slot.teacherId,
      courseId: slot.courseId
    }))
  );

  const totalSlots = slots.length;
  const totalRequests = requests.length;
  
  const attendedCount = requests.filter(r => {
    const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
    return att?.attended;
  }).length;

  const completedCount = requests.filter(r => {
    const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
    return att?.completed;
  }).length;

  const attendanceRate = totalRequests > 0 ? Math.round((attendedCount / totalRequests) * 100) : 0;
  const completionRate = totalRequests > 0 ? Math.round((completedCount / totalRequests) * 100) : 0;

  // Аналитика по преподавателям
  const teacherStats = teachers.map(teacher => {
    const teacherSlots = slots.filter(s => s.teacherId === teacher.id);
    const teacherRequests = requests.filter(r => r.teacherId === teacher.id);
    const teacherAttended = teacherRequests.filter(r => {
      const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
      return att?.attended;
    }).length;
    const teacherCompleted = teacherRequests.filter(r => {
      const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
      return att?.completed;
    }).length;

    return {
      teacher: {
        id: teacher.id,
        fio: teacher.fio,
        login: teacher.login
      },
      slotsCount: teacherSlots.length,
      requestsCount: teacherRequests.length,
      attendedCount: teacherAttended,
      completedCount: teacherCompleted,
      completionRate: teacherRequests.length > 0 ? Math.round((teacherCompleted / teacherRequests.length) * 100) : 0
    };
  });

  // Аналитика по предметам
  const subjectStats = {};
  requests.forEach(r => {
    if (!subjectStats[r.subject]) {
      subjectStats[r.subject] = { total: 0, completed: 0 };
    }
    subjectStats[r.subject].total++;
    const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
    if (att?.completed) {
      subjectStats[r.subject].completed++;
    }
  });

  // Статистика по студентам
  const studentStats = students.map(student => {
    const studentRequests = requests.filter(r => r.studentId === student.id);
    return {
      student: {
        id: student.id,
        fio: student.fio,
        login: student.login,
        group: student.group,
        course: student.course
      },
      requestsCount: studentRequests.length
    };
  });

  return {
    users: {
      total: users.length,
      students: students.length,
      teachers: teachers.length,
      operators: operators.length,
      admins: admins.length
    },
    slots: {
      total: totalSlots
    },
    requests: {
      total: totalRequests,
      attended: attendedCount,
      completed: completedCount,
      attendanceRate,
      completionRate
    },
    teacherStats,
    subjectStats,
    studentStats
  };
}









