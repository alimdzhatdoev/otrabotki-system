// Компонент: Панель администратора с аналитикой и экспортом
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courses as initialCourses } from '../data/courses';
import { users } from '../data/users';
import { initialLimits } from '../data/limits';
import styles from './AdminSettings.module.css';

function AdminSettings() {
  const { currentUser } = useAuth();
  const [limits, setLimits] = useState(initialLimits);
  const [courses, setCourses] = useState(initialCourses);
  const [slots, setSlots] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'teachers', 'requests', 'students', 'settings'
  
  // Форма для лимитов
  const [limitForm, setLimitForm] = useState({
    maxPerDay: 1,
    maxPerWeek: 3
  });

  // Форма для добавления предмета
  const [subjectForm, setSubjectForm] = useState({
    courseId: 1,
    subject: ''
  });

  // Модалка для создания курса
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');

  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Доступ запрещён</div>;
  }

  // Загрузка данных
  useEffect(() => {
    const savedLimits = localStorage.getItem('limits');
    const savedSlots = localStorage.getItem('slots');
    const savedAttendance = localStorage.getItem('attendance');
    
    if (savedLimits) {
      const parsed = JSON.parse(savedLimits);
      setLimits(parsed);
      setLimitForm(parsed);
    }
    
    if (savedSlots) {
      setSlots(JSON.parse(savedSlots));
    }
    
    if (savedAttendance) {
      setAttendance(JSON.parse(savedAttendance));
    }
  }, []);

  // Получаем данные
  const students = users.filter(u => u.role === 'student');
  const teachers = users.filter(u => u.role === 'teacher');
  
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

  // Сохранение лимитов
  const handleSaveLimits = (e) => {
    e.preventDefault();
    setLimits(limitForm);
    localStorage.setItem('limits', JSON.stringify(limitForm));
    alert('Лимиты обновлены!');
  };

  // Добавление предмета к курсу
  const handleAddSubject = (e) => {
    e.preventDefault();
    
    if (!subjectForm.subject.trim()) {
      alert('Введите название предмета');
      return;
    }

    const updatedCourses = courses.map(course => {
      if (course.id === subjectForm.courseId) {
        if (course.subjects.includes(subjectForm.subject)) {
          alert('Такой предмет уже существует');
          return course;
        }
        return {
          ...course,
          subjects: [...course.subjects, subjectForm.subject]
        };
      }
      return course;
    });

    setCourses(updatedCourses);
    setSubjectForm({ ...subjectForm, subject: '' });
    alert('Предмет добавлен!');
  };

  // Удаление предмета
  const handleDeleteSubject = (courseId, subject) => {
    if (!confirm(`Удалить предмет "${subject}"?`)) return;

    const updatedCourses = courses.map(course => {
      if (course.id === courseId) {
        return {
          ...course,
          subjects: course.subjects.filter(s => s !== subject)
        };
      }
      return course;
    });

    setCourses(updatedCourses);
  };

  // Добавление нового курса
  const handleAddCourse = (e) => {
    e.preventDefault();
    
    if (!newCourseName.trim()) {
      alert('Введите название курса');
      return;
    }

    const newCourse = {
      id: courses.length > 0 ? Math.max(...courses.map(c => c.id)) + 1 : 1,
      name: newCourseName.trim(),
      subjects: []
    };

    const updatedCourses = [...courses, newCourse];
    setCourses(updatedCourses);
    
    // Сохраняем в localStorage
    localStorage.setItem('customCourses', JSON.stringify(updatedCourses));
    
    setNewCourseName('');
    setShowCourseModal(false);
    alert('Курс добавлен!');
  };

  // Загрузка кастомных курсов при монтировании
  useEffect(() => {
    const savedCourses = localStorage.getItem('customCourses');
    if (savedCourses) {
      setCourses(JSON.parse(savedCourses));
    }
  }, []);

  // Экспорт в CSV
  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
      alert('Нет данных для экспорта');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  // Экспорт преподавателей
  const exportTeachers = () => {
    const data = teachers.map(t => ({
      'ФИО': t.fio,
      'Логин': t.login,
      'Предметы': t.subjects.join(', ')
    }));
    exportToCSV(data, 'teachers.csv');
  };

  // Экспорт заявок
  const exportRequests = () => {
    const data = requests.map(r => {
      const student = students.find(s => s.id === r.studentId);
      const teacher = teachers.find(t => t.id === r.teacherId);
      const att = attendance.find(a => a.slotId === r.slotId && a.studentId === r.studentId);
      
      return {
        'Студент': student?.fio || '',
        'Группа': student?.group || '',
        'Предмет': r.subject,
        'Дата': new Date(r.date).toLocaleDateString('ru-RU'),
        'Время': `${r.timeFrom} - ${r.timeTo}`,
        'Преподаватель': teacher?.fio || '',
        'Пришёл': att?.attended ? 'Да' : 'Нет',
        'Отработал': att?.completed ? 'Да' : 'Нет'
      };
    });
    exportToCSV(data, 'requests.csv');
  };

  // Экспорт студентов
  const exportStudents = () => {
    const data = students.map(s => ({
      'ФИО': s.fio,
      'Логин': s.login,
      'Группа': s.group,
      'Курс': courses.find(c => c.id === s.course)?.name || ''
    }));
    exportToCSV(data, 'students.csv');
  };

  // Аналитика
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
      teacher,
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

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Панель администратора</h1>

      {/* Вкладки */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'analytics' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📊 Аналитика
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'teachers' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('teachers')}
        >
          👩‍🏫 Преподаватели ({teachers.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'requests' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📝 Заявки ({requests.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'students' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('students')}
        >
          🎓 Студенты ({students.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Настройки
        </button>
      </div>

      {/* Контент вкладок */}
      <div className={styles.tabContent}>
        {activeTab === 'analytics' && (
          <div>
            {/* Общая статистика */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📋</div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{totalSlots}</div>
                  <div className={styles.statLabel}>Всего слотов</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📝</div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{totalRequests}</div>
                  <div className={styles.statLabel}>Заявок студентов</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>✅</div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{attendanceRate}%</div>
                  <div className={styles.statLabel}>Посещаемость</div>
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>🎯</div>
                <div className={styles.statContent}>
                  <div className={styles.statValue}>{completionRate}%</div>
                  <div className={styles.statLabel}>Процент отработки</div>
                </div>
              </div>
            </div>

            {/* Аналитика по преподавателям */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Аналитика по преподавателям</h3>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Преподаватель</th>
                    <th>Слотов</th>
                    <th>Заявок</th>
                    <th>Пришло</th>
                    <th>Отработали</th>
                    <th>% отработки</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStats.map(stat => (
                    <tr key={stat.teacher.id}>
                      <td>{stat.teacher.fio}</td>
                      <td>{stat.slotsCount}</td>
                      <td>{stat.requestsCount}</td>
                      <td>{stat.attendedCount}</td>
                      <td>{stat.completedCount}</td>
                      <td>
                        <span className={styles.percentBadge}>
                          {stat.completionRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Аналитика по предметам */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Аналитика по предметам</h3>
              <div className={styles.subjectsGrid}>
                {Object.entries(subjectStats).map(([subject, stat]) => (
                  <div key={subject} className={styles.subjectCard}>
                    <div className={styles.subjectName}>{subject}</div>
                    <div className={styles.subjectStat}>
                      <span>Заявок: {stat.total}</span>
                      <span>Отработали: {stat.completed}</span>
                    </div>
                    <div className={styles.subjectProgress}>
                      <div 
                        className={styles.subjectProgressBar}
                        style={{ width: `${(stat.completed / stat.total) * 100}%` }}
                      ></div>
                    </div>
                    <div className={styles.subjectPercent}>
                      {Math.round((stat.completed / stat.total) * 100)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teachers' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Список преподавателей</h3>
              <button onClick={exportTeachers} className={styles.exportButton}>
                📥 Экспорт в CSV
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Предметы</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td>{teacher.fio}</td>
                    <td><code>{teacher.login}</code></td>
                    <td>{teacher.subjects.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'requests' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Список заявок</h3>
              <button onClick={exportRequests} className={styles.exportButton}>
                📥 Экспорт в CSV
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Студент</th>
                  <th>Группа</th>
                  <th>Предмет</th>
                  <th>Дата</th>
                  <th>Время</th>
                  <th>Преподаватель</th>
                  <th>Пришёл</th>
                  <th>Отработал</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(request => {
                  const student = students.find(s => s.id === request.studentId);
                  const teacher = teachers.find(t => t.id === request.teacherId);
                  const att = attendance.find(a => a.slotId === request.slotId && a.studentId === request.studentId);
                  
                  return (
                    <tr key={request.id}>
                      <td>{student?.fio}</td>
                      <td>{student?.group}</td>
                      <td>{request.subject}</td>
                      <td>{new Date(request.date).toLocaleDateString('ru-RU')}</td>
                      <td>{request.timeFrom} - {request.timeTo}</td>
                      <td>{teacher?.fio}</td>
                      <td>
                        {att?.attended ? (
                          <span className={styles.statusYes}>✓</span>
                        ) : (
                          <span className={styles.statusNo}>—</span>
                        )}
                      </td>
                      <td>
                        {att?.completed ? (
                          <span className={styles.statusYes}>✓</span>
                        ) : (
                          <span className={styles.statusNo}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'students' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Список студентов</h3>
              <button onClick={exportStudents} className={styles.exportButton}>
                📥 Экспорт в CSV
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ФИО</th>
                  <th>Логин</th>
                  <th>Группа</th>
                  <th>Курс</th>
                  <th>Заявок</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => {
                  const studentRequests = requests.filter(r => r.studentId === student.id);
                  
                  return (
                    <tr key={student.id}>
                      <td>{student.fio}</td>
                      <td><code>{student.login}</code></td>
                      <td>{student.group}</td>
                      <td>{courses.find(c => c.id === student.course)?.name}</td>
                      <td>{studentRequests.length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className={styles.grid}>
            {/* Лимиты */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>⚙️ Настройка лимитов</h2>
              <form onSubmit={handleSaveLimits} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Макс. записей в день</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={limitForm.maxPerDay}
                    onChange={(e) => setLimitForm({ ...limitForm, maxPerDay: parseInt(e.target.value) })}
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Макс. записей в неделю</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={limitForm.maxPerWeek}
                    onChange={(e) => setLimitForm({ ...limitForm, maxPerWeek: parseInt(e.target.value) })}
                    className={styles.input}
                  />
                </div>
                <button type="submit" className={styles.submitButton}>
                  Сохранить лимиты
                </button>
              </form>
              <div className={styles.currentLimits}>
                <p className={styles.currentLimitsTitle}>Текущие лимиты:</p>
                <p className={styles.currentLimitsValue}>
                  День: <strong>{limits.maxPerDay}</strong> | Неделя: <strong>{limits.maxPerWeek}</strong>
                </p>
              </div>
            </div>

            {/* Курсы и предметы */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>📚 Курсы и предметы</h2>
              <form onSubmit={handleAddSubject} className={styles.form}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Курс</label>
                  <div className={styles.courseSelectWrapper}>
                    <select
                      value={subjectForm.courseId}
                      onChange={(e) => setSubjectForm({ ...subjectForm, courseId: parseInt(e.target.value) })}
                      className={styles.input}
                    >
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCourseModal(true)}
                      className={styles.addCourseButton}
                      title="Добавить новый курс"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Новый предмет</label>
                  <input
                    type="text"
                    placeholder="Название предмета"
                    value={subjectForm.subject}
                    onChange={(e) => setSubjectForm({ ...subjectForm, subject: e.target.value })}
                    className={styles.input}
                  />
                </div>
                <button type="submit" className={styles.submitButton}>
                  Добавить предмет
                </button>
              </form>

              <div className={styles.coursesList}>
                {courses.map(course => (
                  <div key={course.id} className={styles.courseItem}>
                    <h3 className={styles.courseName}>{course.name}</h3>
                    <div className={styles.subjectsList}>
                      {course.subjects.map(subject => (
                        <div key={subject} className={styles.subjectTag}>
                          <span>{subject}</span>
                          <button
                            onClick={() => handleDeleteSubject(course.id, subject)}
                            className={styles.deleteSubjectButton}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно добавления курса */}
      {showCourseModal && (
        <div className={styles.modal} onClick={() => setShowCourseModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Добавить новый курс</h2>
            <form onSubmit={handleAddCourse} className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Название курса</label>
                <input
                  type="text"
                  placeholder="Например: 4 курс"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className={styles.input}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className={styles.cancelButton}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                >
                  Создать курс
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
