// Компонент: Панель администратора с аналитикой и экспортом
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getAnalytics,
  getUsers,
  getLimits,
  updateLimits,
  getRequests,
  updateUser,
  deleteUser
} from '../api/adminApi';
import { getCourses } from '../api/commonApi';
import styles from './AdminSettings.module.css';

function AdminSettings() {
  const { currentUser } = useAuth();
  const [limits, setLimits] = useState({ maxPerDay: 1, maxPerWeek: 3 });
  const [courses, setCourses] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [teacherForm, setTeacherForm] = useState({ fio: '', subjectsText: '', login: '' });
  const [generatedTeacherPassword, setGeneratedTeacherPassword] = useState('');
  const [activeTab, setActiveTab] = useState('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Форма для лимитов
  const [limitForm, setLimitForm] = useState({
    maxPerDay: 1,
    maxPerWeek: 3
  });


  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [currentUser, activeTab]);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      // Загружаем аналитику
      if (activeTab === 'analytics') {
        const analyticsData = await getAnalytics();
        setAnalytics(analyticsData);
      }

      // Загружаем лимиты
      const limitsData = await getLimits();
      setLimits(limitsData);
      setLimitForm(limitsData);

      // Загружаем курсы
      const coursesData = await getCourses();
      setCourses(coursesData);

      // Загружаем пользователей
      const usersData = await getUsers();
      setStudents(usersData.filter(u => u.role === 'student'));
      setTeachers(usersData.filter(u => u.role === 'teacher'));

      // Загружаем заявки (всегда, так как они нужны для аналитики)
      const requestsData = await getRequests();
      setRequests(requestsData);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return <div>Доступ запрещён</div>;
  }

  // Сохранение лимитов
  const handleSaveLimits = async (e) => {
    e.preventDefault();
    try {
      await updateLimits(limitForm);
      setLimits(limitForm);
      alert('Лимиты обновлены!');
    } catch (err) {
      alert(err.message || 'Ошибка при обновлении лимитов');
    }
  };


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
      return {
        'Студент': r.student?.fio || '',
        'Группа': r.student?.group || '',
        'Предмет': r.subject,
        'Дата': new Date(r.date).toLocaleDateString('ru-RU'),
        'Время': `${r.timeFrom} - ${r.timeTo}`,
        'Преподаватель': r.teacher?.fio || '',
        'Пришёл': r.attended ? 'Да' : 'Нет',
        'Отработал': r.completed ? 'Да' : 'Нет'
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

  // Аналитика (из API)
  const totalSlots = analytics?.slots?.total || 0;
  const totalRequests = analytics?.requests?.total || 0;
  const attendanceRate = analytics?.requests?.attendanceRate || 0;
  const completionRate = analytics?.requests?.completionRate || 0;
  const teacherStats = analytics?.teacherStats || [];
  const subjectStats = analytics?.subjectStats || {};

  if (loading && !analytics) {
    return <div className={styles.container}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <div style={{ padding: '10px', background: '#fee', color: '#c00', marginBottom: '20px' }}>
          Ошибка: {error}
        </div>
      )}
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
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td>{teacher.fio}</td>
                    <td><code>{teacher.login}</code></td>
                    <td>{teacher.subjects.join(', ')}</td>
                    <td>
                      <div className={styles.teacherActions}>
                        <button
                          type="button"
                          className={styles.teacherButton}
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setTeacherForm({
                              fio: teacher.fio,
                              subjectsText: teacher.subjects.join(', '),
                              login: teacher.login
                            });
                            setGeneratedTeacherPassword('');
                          }}
                        >
                          <span>✏️</span>
                          <span>Изменить</span>
                        </button>
                        <button
                          type="button"
                          className={styles.teacherButtonDanger}
                          onClick={async () => {
                            if (!window.confirm('Удалить этого преподавателя?')) return;
                            try {
                              await deleteUser(teacher.id);
                              const usersData = await getUsers();
                              setTeachers(usersData.filter(u => u.role === 'teacher'));
                            } catch (err) {
                              alert(err.message || 'Ошибка при удалении преподавателя');
                            }
                          }}
                        >
                          <span>🗑</span>
                          <span>Удалить</span>
                        </button>
                      </div>
                    </td>
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
                  return (
                    <tr key={request.id}>
                      <td>{request.student?.fio || ''}</td>
                      <td>{request.student?.group || ''}</td>
                      <td>{request.subject}</td>
                      <td>{new Date(request.date).toLocaleDateString('ru-RU')}</td>
                      <td>{request.timeFrom} - {request.timeTo}</td>
                      <td>{request.teacher?.fio || ''}</td>
                      <td>
                        {request.attended ? (
                          <span className={styles.statusYes}>✓</span>
                        ) : (
                          <span className={styles.statusNo}>—</span>
                        )}
                      </td>
                      <td>
                        {request.completed ? (
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

        {/* Вкладка настроек временно отключена, чтобы не путать пользователей.
            Логику можно быстро вернуть, раскомментировав блок ниже.
        {activeTab === 'settings' && (
          <div className={styles.grid}>
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
          </div>
        )}
        */}
      </div>

      {/* Модалка редактирования преподавателя */}
      {editingTeacher && (
        <div className={styles.modal} onClick={() => setEditingTeacher(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Изменить преподавателя</h2>
            <form
              className={styles.form}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const subjects = teacherForm.subjectsText
                    .split(',')
                    .map(s => s.trim())
                    .filter(Boolean);

                  const updates = {
                    fio: teacherForm.fio,
                    subjects
                  };

                  if (generatedTeacherPassword) {
                    updates.password = generatedTeacherPassword;
                  }

                  await updateUser(editingTeacher.id, updates);

                  // Перезагружаем список преподавателей
                  const usersData = await getUsers();
                  setTeachers(usersData.filter(u => u.role === 'teacher'));

                  alert('Преподаватель обновлён');
                  setEditingTeacher(null);
                  setGeneratedTeacherPassword('');
                } catch (err) {
                  alert(err.message || 'Ошибка при обновлении преподавателя');
                }
              }}
            >
              <div className={styles.formGroup}>
                <label className={styles.label}>ФИО</label>
                <input
                  type="text"
                  className={styles.input}
                  value={teacherForm.fio}
                  onChange={(e) =>
                    setTeacherForm(prev => ({ ...prev, fio: e.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Логин</label>
                <input
                  type="text"
                  className={styles.input}
                  value={teacherForm.login}
                  disabled
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Предметы (через запятую)</label>
                <input
                  type="text"
                  className={styles.input}
                  value={teacherForm.subjectsText}
                  onChange={(e) =>
                    setTeacherForm(prev => ({ ...prev, subjectsText: e.target.value }))
                  }
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Пароль</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className={styles.input}
                    value={generatedTeacherPassword}
                    placeholder="Нажмите «Сгенерировать пароль»"
                    readOnly
                  />
                  <button
                    type="button"
                    className={styles.exportButton}
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
                      let pwd = '';
                      for (let i = 0; i < 10; i++) {
                        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setGeneratedTeacherPassword(pwd);
                    }}
                  >
                    🔐 Сгенерировать
                  </button>
                </div>
                {generatedTeacherPassword && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#A5B4FC' }}>
                    Новый пароль будет сохранён для преподавателя после нажатия «Сохранить».
                  </p>
                )}
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setEditingTeacher(null);
                    setGeneratedTeacherPassword('');
                  }}
                >
                  Отмена
                </button>
                <button type="submit" className={styles.submitButton}>
                  Сохранить
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
