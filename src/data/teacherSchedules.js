// Данные: Расписания преподавателей для автогенерации слотов
export const initialTeacherSchedules = [
  {
    id: 'ts1',
    teacherId: 't1',
    subject: 'Анатомия',
    courseId: 1,
    dayOfWeek: 1, // Понедельник (0 = Воскресенье, 1 = Понедельник, ...)
    timeFrom: '10:00',
    timeTo: '11:30',
    capacity: 2
  },
  {
    id: 'ts2',
    teacherId: 't2',
    subject: 'Биология',
    courseId: 1,
    dayOfWeek: 3, // Среда
    timeFrom: '14:00',
    timeTo: '15:30',
    capacity: 3
  }
];



