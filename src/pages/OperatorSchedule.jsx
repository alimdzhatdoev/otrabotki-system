// Компонент: Панель оператора для управления расписаниями и слотами
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courses } from '../data/courses';
import { users } from '../data/users';
import { initialTeacherSchedules } from '../data/teacherSchedules';
import styles from './OperatorSchedule.module.css';

function OperatorSchedule() {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [slots, setSlots] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ fio: '', subjects: [] });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // Форма нового расписания
  const [formData, setFormData] = useState({
    teacherId: '',
    subject: '',
    courseId: 1,
    dayOfWeek: 1,
    timeFrom: '',
    timeTo: '',
    capacity: 1
  });

  // Загрузка данных из localStorage
  useEffect(() => {
    const savedSchedules = localStorage.getItem('teacherSchedules');
    const savedSlots = localStorage.getItem('slots');
    
    if (savedSchedules) {
      setSchedules(JSON.parse(savedSchedules));
    } else {
      setSchedules(initialTeacherSchedules);
      localStorage.setItem('teacherSchedules', JSON.stringify(initialTeacherSchedules));
    }
    
    if (savedSlots) {
      setSlots(JSON.parse(savedSlots));
    } else {
      setSlots([]);
    }
  }, []);

  // Генерация слотов на основе расписаний (на следующие 4 недели)
  useEffect(() => {
    if (schedules.length === 0) return;
    
    const generatedSlots = [];
    const today = new Date();
    const weeksAhead = 4;
    
    schedules.forEach(schedule => {
      for (let week = 0; week < weeksAhead; week++) {
        const date = new Date(today);
        date.setDate(today.getDate() + (schedule.dayOfWeek - today.getDay() + 7) % 7 + (week * 7));
        
        // Пропускаем прошлые даты
        if (date < today) continue;
        
        const dateStr = date.toISOString().split('T')[0];
        
        // Проверяем, нет ли уже такого слота
        const existingSlot = slots.find(s => 
          s.date === dateStr && 
          s.teacherId === schedule.teacherId &&
          s.timeFrom === schedule.timeFrom
        );
        
        if (!existingSlot) {
          generatedSlots.push({
            id: 'slot_' + Date.now() + '_' + Math.random(),
            courseId: schedule.courseId,
            subject: schedule.subject,
            date: dateStr,
            timeFrom: schedule.timeFrom,
            timeTo: schedule.timeTo,
            capacity: schedule.capacity,
            teacherId: schedule.teacherId,
            students: []
          });
        }
      }
    });
    
    if (generatedSlots.length > 0) {
      const updatedSlots = [...slots, ...generatedSlots];
      setSlots(updatedSlots);
      localStorage.setItem('slots', JSON.stringify(updatedSlots));
    }
  }, [schedules]);

  if (!currentUser || currentUser.role !== 'operator') {
    return <div>Доступ запрещён</div>;
  }

  // Преподаватели из users (обновляемый список)
  const [teachersList, setTeachersList] = useState([]);

  useEffect(() => {
    const savedUsers = localStorage.getItem('customUsers');
    if (savedUsers) {
      const customUsers = JSON.parse(savedUsers);
      setTeachersList([...users.filter(u => u.role === 'teacher'), ...customUsers.filter(u => u.role === 'teacher')]);
    } else {
      setTeachersList(users.filter(u => u.role === 'teacher'));
    }
  }, []);

  const teachers = teachersList;

  // Транслитерация ФИО в логин
  const transliterate = (text) => {
    const ru = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    };
    
    return text.toLowerCase().split('').map(char => ru[char] || char).join('').replace(/[^a-z]/g, '');
  };

  // Генерация пароля
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Добавление преподавателя
  const handleAddTeacher = (e) => {
    e.preventDefault();
    
    if (!newTeacher.fio || newTeacher.subjects.length === 0) {
      alert('Заполните все поля!');
      return;
    }

    // Формируем логин из ФИО (берём фамилию)
    const parts = newTeacher.fio.split(' ');
    const login = transliterate(parts[0]); // Фамилия
    const password = generatePassword();

    const teacher = {
      id: 't' + Date.now(),
      login,
      password,
      role: 'teacher',
      fio: newTeacher.fio,
      subjects: newTeacher.subjects
    };

    // Сохраняем в customUsers
    const savedUsers = localStorage.getItem('customUsers');
    const customUsers = savedUsers ? JSON.parse(savedUsers) : [];
    customUsers.push(teacher);
    localStorage.setItem('customUsers', JSON.stringify(customUsers));

    // Обновляем список
    setTeachersList([...teachersList, teacher]);

    // Показываем учётные данные
    setGeneratedCredentials({ login, password, fio: newTeacher.fio });
    
    // Сброс формы
    setNewTeacher({ fio: '', subjects: [] });
  };

  // Добавить предмет к новому преподавателю
  const handleAddSubject = (subject) => {
    if (subject && !newTeacher.subjects.includes(subject)) {
      setNewTeacher({ ...newTeacher, subjects: [...newTeacher.subjects, subject] });
    }
  };

  // Удалить предмет у нового преподавателя
  const handleRemoveSubject = (subject) => {
    setNewTeacher({
      ...newTeacher,
      subjects: newTeacher.subjects.filter(s => s !== subject)
    });
  };

  // Обработка изменения полей формы
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['courseId', 'dayOfWeek', 'capacity'].includes(name) ? parseInt(value) : value
    }));
  };

  // Добавление нового расписания
  const handleAddSchedule = (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.teacherId || !formData.subject || !formData.timeFrom || !formData.timeTo) {
      alert('Заполните все поля!');
      return;
    }
    
    const newSchedule = {
      id: 'ts' + Date.now(),
      ...formData
    };
    
    const updatedSchedules = [...schedules, newSchedule];
    setSchedules(updatedSchedules);
    localStorage.setItem('teacherSchedules', JSON.stringify(updatedSchedules));
    
    // Сброс формы
    setFormData({
      teacherId: '',
      subject: '',
      courseId: 1,
      dayOfWeek: 1,
      timeFrom: '',
      timeTo: '',
      capacity: 1
    });
    
    setShowModal(false);
    alert('Расписание добавлено! Слоты будут созданы автоматически.');
  };

  // Удаление расписания
  const handleDeleteSchedule = (scheduleId) => {
    if (!confirm('Удалить это расписание? (Существующие слоты останутся)')) return;
    
    const updatedSchedules = schedules.filter(s => s.id !== scheduleId);
    setSchedules(updatedSchedules);
    localStorage.setItem('teacherSchedules', JSON.stringify(updatedSchedules));
  };

  // Просмотр слотов расписания
  const handleViewSlots = (schedule) => {
    const relatedSlots = slots.filter(s => 
      s.teacherId === schedule.teacherId &&
      s.subject === schedule.subject &&
      s.timeFrom === schedule.timeFrom
    );
    setSelectedSchedule({ ...schedule, relatedSlots });
  };

  // Получить предметы для выбранного курса
  const getSubjectsForCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    return course ? course.subjects : [];
  };

  // Получить предметы преподавателя
  const getTeacherSubjects = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.subjects : [];
  };

  const currentCourseSubjects = getSubjectsForCourse(formData.courseId);
  const currentTeacherSubjects = formData.teacherId ? getTeacherSubjects(formData.teacherId) : [];

  const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  // Статистика
  const totalSchedules = schedules.length;
  const totalSlots = slots.length;
  const totalBookings = slots.reduce((sum, s) => sum + s.students.length, 0);

  return (
    <div className={styles.container}>
      {/* Заголовок */}
      <div className={styles.header}>
        <h1 className={styles.title}>Управление расписанием</h1>
        <div className={styles.headerButtons}>
          <button
            onClick={() => setShowTeacherModal(true)}
            className={styles.addTeacherButton}
          >
            + Добавить преподавателя
          </button>
          <button
            onClick={() => setShowModal(true)}
            className={styles.addButton}
          >
            + Добавить расписание
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalSchedules}</div>
          <div className={styles.statLabel}>Расписаний</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalSlots}</div>
          <div className={styles.statLabel}>Созданных слотов</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalBookings}</div>
          <div className={styles.statLabel}>Записей студентов</div>
        </div>
      </div>

      {/* Информация */}
      <div className={styles.infoCard}>
        <p className={styles.infoText}>
          💡 <strong>Как это работает:</strong> Вы создаёте регулярное расписание для преподавателей (например, "Каждый понедельник с 10:00 до 11:30").
          Система автоматически создаёт слоты отработок на следующие 4 недели. Студенты видят эти слоты и могут записываться.
        </p>
      </div>

      {/* Таблица расписаний */}
      <div className={styles.tableCard}>
        <h2 className={styles.tableTitle}>Расписания преподавателей</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Преподаватель</th>
                <th>Предмет</th>
                <th>Курс</th>
                <th>День недели</th>
                <th>Время</th>
                <th>Мест</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan="7" className={styles.emptyRow}>
                    Нет расписаний. Добавьте первое расписание!
                  </td>
                </tr>
              ) : (
                schedules.map(schedule => {
                  const teacher = teachers.find(t => t.id === schedule.teacherId);
                  const course = courses.find(c => c.id === schedule.courseId);
                  
                  return (
                    <tr key={schedule.id}>
                      <td>{teacher?.fio}</td>
                      <td>{schedule.subject}</td>
                      <td>{course?.name}</td>
                      <td>{daysOfWeek[schedule.dayOfWeek]}</td>
                      <td>{schedule.timeFrom} - {schedule.timeTo}</td>
                      <td>{schedule.capacity}</td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            onClick={() => handleViewSlots(schedule)}
                            className={styles.actionButton}
                            title="Просмотр слотов"
                          >
                            📅
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className={styles.actionButtonDanger}
                            title="Удалить расписание"
                          >
                            ❌
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модальное окно добавления преподавателя */}
      {showTeacherModal && (
        <div className={styles.modal} onClick={() => !generatedCredentials && setShowTeacherModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {!generatedCredentials ? (
              <>
                <h2 className={styles.modalTitle}>Добавить преподавателя</h2>
                <form onSubmit={handleAddTeacher} className={styles.form}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>ФИО</label>
                    <input
                      type="text"
                      placeholder="Иванов Иван Иванович"
                      value={newTeacher.fio}
                      onChange={(e) => setNewTeacher({ ...newTeacher, fio: e.target.value })}
                      className={styles.input}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Предметы</label>
                    <div className={styles.subjectsSelector}>
                      <select
                        className={styles.input}
                        onChange={(e) => {
                          handleAddSubject(e.target.value);
                          e.target.value = '';
                        }}
                      >
                        <option value="">Выберите предмет</option>
                        {courses.flatMap(c => c.subjects).filter((s, i, arr) => arr.indexOf(s) === i).map(subject => (
                          <option key={subject} value={subject}>{subject}</option>
                        ))}
                      </select>
                    </div>
                    
                    {newTeacher.subjects.length > 0 && (
                      <div className={styles.selectedSubjects}>
                        {newTeacher.subjects.map(subject => (
                          <div key={subject} className={styles.subjectTag}>
                            <span>{subject}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(subject)}
                              className={styles.removeSubject}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      onClick={() => setShowTeacherModal(false)}
                      className={styles.cancelButton}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                    >
                      Создать преподавателя
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className={styles.modalTitle}>✅ Преподаватель создан!</h2>
                <div className={styles.credentialsCard}>
                  <p className={styles.credentialsText}>
                    <strong>ФИО:</strong> {generatedCredentials.fio}
                  </p>
                  <p className={styles.credentialsText}>
                    <strong>Логин:</strong> <code>{generatedCredentials.login}</code>
                  </p>
                  <p className={styles.credentialsText}>
                    <strong>Пароль:</strong> <code>{generatedCredentials.password}</code>
                  </p>
                  <p className={styles.credentialsHint}>
                    ⚠️ Сохраните эти данные! Они больше не будут показаны.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setGeneratedCredentials(null);
                    setShowTeacherModal(false);
                  }}
                  className={styles.closeButton}
                >
                  Закрыть
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Модальное окно добавления расписания */}
      {showModal && (
        <div className={styles.modal} onClick={() => setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Добавить расписание преподавателя</h2>
            <form onSubmit={handleAddSchedule} className={styles.form}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Преподаватель</label>
                  <select
                    name="teacherId"
                    value={formData.teacherId}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  >
                    <option value="">Выберите преподавателя</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>{teacher.fio}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Курс</label>
                  <select
                    name="courseId"
                    value={formData.courseId}
                    onChange={handleInputChange}
                    className={styles.input}
                  >
                    {courses.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Предмет</label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  >
                    <option value="">Выберите предмет</option>
                    {/* Показываем предметы из пересечения курса и преподавателя */}
                    {currentCourseSubjects
                      .filter(s => currentTeacherSubjects.includes(s))
                      .map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>День недели</label>
                  <select
                    name="dayOfWeek"
                    value={formData.dayOfWeek}
                    onChange={handleInputChange}
                    className={styles.input}
                  >
                    {daysOfWeek.map((day, index) => (
                      <option key={index} value={index}>{day}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Время с</label>
                  <input
                    type="time"
                    name="timeFrom"
                    value={formData.timeFrom}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Время до</label>
                  <input
                    type="time"
                    name="timeTo"
                    value={formData.timeTo}
                    onChange={handleInputChange}
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Макс. студентов</label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="1"
                    max="10"
                    required
                  />
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelButton}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  Создать расписание
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра слотов */}
      {selectedSchedule && (
        <div className={styles.modal} onClick={() => setSelectedSchedule(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Слоты расписания</h2>
            <div className={styles.scheduleInfo}>
              <p><strong>{selectedSchedule.subject}</strong></p>
              <p>{daysOfWeek[selectedSchedule.dayOfWeek]} • {selectedSchedule.timeFrom} - {selectedSchedule.timeTo}</p>
            </div>
            <div className={styles.slotsList}>
              {selectedSchedule.relatedSlots.length === 0 ? (
                <p className={styles.emptyMessage}>Слоты ещё не созданы</p>
              ) : (
                selectedSchedule.relatedSlots.map(slot => (
                  <div key={slot.id} className={styles.slotItem}>
                    <div>
                      <strong>{new Date(slot.date).toLocaleDateString('ru-RU')}</strong>
                      <p className={styles.slotDetails}>Записано: {slot.students.length}/{slot.capacity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <button
              onClick={() => setSelectedSchedule(null)}
              className={styles.closeButton}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorSchedule;
