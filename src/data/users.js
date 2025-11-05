// Данные: Пользователи системы с логинами, паролями и ролями
export const users = [
  // Студенты
  {
    id: 'u1',
    login: 'ivanov',
    password: '123',
    role: 'student',
    fio: 'Иванов Иван Иванович',
    group: '201',
    course: 1
  },
  {
    id: 'u2',
    login: 'petrov',
    password: '123',
    role: 'student',
    fio: 'Петров Петр Петрович',
    group: '202',
    course: 2
  },
  {
    id: 'u3',
    login: 'sidorova',
    password: '123',
    role: 'student',
    fio: 'Сидорова Мария Александровна',
    group: '201',
    course: 1
  },
  {
    id: 'u4',
    login: 'kuznetsov',
    password: '123',
    role: 'student',
    fio: 'Кузнецов Дмитрий Сергеевич',
    group: '301',
    course: 3
  },
  {
    id: 'u5',
    login: 'smirnova',
    password: '123',
    role: 'student',
    fio: 'Смирнова Елена Викторовна',
    group: '202',
    course: 2
  },
  {
    id: 'u6',
    login: 'volkova',
    password: '123',
    role: 'student',
    fio: 'Волкова Анна Павловна',
    group: '301',
    course: 3
  },
  
  // Преподаватели
  {
    id: 't1',
    login: 'petrova',
    password: '123',
    role: 'teacher',
    fio: 'Петрова Ирина Сергеевна',
    subjects: ['Анатомия', 'Гистология']
  },
  {
    id: 't2',
    login: 'sidorov.a',
    password: '123',
    role: 'teacher',
    fio: 'Сидоров Алексей Павлович',
    subjects: ['Биология', 'Биохимия']
  },
  {
    id: 't3',
    login: 'mikhailov',
    password: '123',
    role: 'teacher',
    fio: 'Михайлов Николай Дмитриевич',
    subjects: ['Физиология', 'Анатомия']
  },
  {
    id: 't4',
    login: 'novikova',
    password: '123',
    role: 'teacher',
    fio: 'Новикова Светлана Олеговна',
    subjects: ['Химия', 'Биохимия']
  },
  
  // Операторы
  {
    id: 'o1',
    login: 'operator',
    password: '123',
    role: 'operator',
    fio: 'Оператор Деканата'
  },
  
  // Администраторы
  {
    id: 'a1',
    login: 'admin',
    password: '123',
    role: 'admin',
    fio: 'Администратор Системы'
  }
];



