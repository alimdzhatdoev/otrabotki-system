// Компонент: Панель администратора с аналитикой и экспортом
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '../context/AuthContext';
import {
  getAnalytics,
  getUsers,
  getLimits,
  updateLimits,
  getRequests,
  updateUser,
  deleteUser,
  exportData,
  importData,
  getTeacherSlots,
  getSlotStudents,
  importStudents
} from '../api/adminApi';
import { getCourses } from '../api/commonApi';
import Loader from '../components/Loader';
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
  const fileInputRef = useRef(null);
  const importStudentsInputRef = useRef(null);
  const [backupInfo, setBackupInfo] = useState(null);
  // Состояния загрузки для операций
  const [updatingLimits, setUpdatingLimits] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [importingStudents, setImportingStudents] = useState(false);
  const [updatingTeacher, setUpdatingTeacher] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState(null); // ID удаляемого преподавателя
  const [studentSearchQuery, setStudentSearchQuery] = useState(''); // Поиск студентов
  const [studentSort, setStudentSort] = useState({ field: 'fio', direction: 'asc' }); // Сортировка студентов
  
  // Состояния для раскрывающихся списков в аналитике
  const [expandedTeachers, setExpandedTeachers] = useState(new Set()); // Set<teacherId>
  const [teacherSlots, setTeacherSlots] = useState({}); // { teacherId: [slots] }
  const [loadingTeacherSlots, setLoadingTeacherSlots] = useState(new Set()); // Set<teacherId>
  const [expandedSlots, setExpandedSlots] = useState(new Set()); // Set<slotId>
  const [slotStudents, setSlotStudents] = useState({}); // { slotId: { students: [...] } }
  const [loadingSlotStudents, setLoadingSlotStudents] = useState(new Set()); // Set<slotId>
  
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
      setUpdatingLimits(true);
      await updateLimits(limitForm);
      setLimits(limitForm);
    } catch (err) {
      console.error('Ошибка при обновлении лимитов:', err);
      setError(err.message || 'Ошибка при обновлении лимитов');
    } finally {
      setUpdatingLimits(false);
    }
  };


  // Экспорт в CSV
  const exportToCSV = (data, filename) => {
    if (data.length === 0) {
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
      'Номер зачетки': s.studentCardNumber || s.recordBook || s.login || '',
      'Группа': s.group,
      'Курс': courses.find(c => c.id === s.course)?.name || ''
    }));
    exportToCSV(data, 'students.csv');
  };

  // Кешируем количество заявок на студента
  const requestCountsByStudent = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      map[r.studentId] = (map[r.studentId] || 0) + 1;
    });
    return map;
  }, [requests]);

  const handleStudentSort = (field) => {
    setStudentSort(prev => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  };

  const getSortIndicator = (field) => {
    if (studentSort.field !== field) return '';
    return studentSort.direction === 'asc' ? '▲' : '▼';
  };

  const getRecordBook = (student) => student.studentCardNumber || student.recordBook || student.login || '—';

  // Импорт студентов (fio, recordBook, group)
  const handleImportStudentsClick = () => {
    importStudentsInputRef.current?.click();
  };

  const parseStudentsFromSheet = (sheet) => {
    const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return json
      .map(row => {
        const fio = (row.fio || row.FIO || row['ФИО'] || '').toString().trim();
        const recordBook = (row.recordBook || row.RecordBook || row['recordBook'] || row['Recordbook'] || row['Номер зачетки'] || row['номер зачетки'] || '').toString().trim();
        const group = (row.group || row.Group || row['Группа'] || '').toString().trim();
        return { fio, recordBook, group };
      })
      .filter(r => r.fio && r.recordBook && r.group);
  };

  const handleImportStudentsFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setImportingStudents(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const parsed = parseStudentsFromSheet(sheet);

      if (parsed.length === 0) {
        throw new Error('Не удалось прочитать студентов. Проверьте, что есть колонки fio, recordBook, group');
      }

      await importStudents(parsed);
      await loadData();
    } catch (err) {
      console.error('Ошибка импорта студентов:', err);
      setError(err.message || 'Ошибка импорта студентов');
    } finally {
      setImportingStudents(false);
      e.target.value = '';
    }
  };

  // Аналитика (из API)
  const totalSlots = analytics?.slots?.total || 0;
  const totalRequests = analytics?.requests?.total || 0;
  const attendanceRate = analytics?.requests?.attendanceRate || 0;
  const completionRate = analytics?.requests?.completionRate || 0;
  const teacherStats = analytics?.teacherStats || [];
  const subjectStats = analytics?.subjectStats || {};

  // Обработка клика на преподавателя
  const handleTeacherClick = async (teacherId) => {
    const newExpanded = new Set(expandedTeachers);
    if (newExpanded.has(teacherId)) {
      newExpanded.delete(teacherId);
    } else {
      newExpanded.add(teacherId);
      // Загружаем слоты, если еще не загружены
      if (!teacherSlots[teacherId]) {
        const loadingSet = new Set(loadingTeacherSlots);
        loadingSet.add(teacherId);
        setLoadingTeacherSlots(loadingSet);
        
        try {
          const slots = await getTeacherSlots(teacherId);
          setTeacherSlots(prev => ({ ...prev, [teacherId]: slots }));
        } catch (err) {
          console.error('Ошибка загрузки слотов преподавателя:', err);
          setError(err.message || 'Ошибка загрузки слотов');
        } finally {
          loadingSet.delete(teacherId);
          setLoadingTeacherSlots(new Set(loadingSet));
        }
      }
    }
    setExpandedTeachers(newExpanded);
  };

  // Обработка клика на слот
  const handleSlotClick = async (slotId) => {
    const newExpanded = new Set(expandedSlots);
    if (newExpanded.has(slotId)) {
      newExpanded.delete(slotId);
    } else {
      newExpanded.add(slotId);
      // Загружаем студентов, если еще не загружены
      if (!slotStudents[slotId]) {
        const loadingSet = new Set(loadingSlotStudents);
        loadingSet.add(slotId);
        setLoadingSlotStudents(loadingSet);
        
        try {
          const data = await getSlotStudents(slotId);
          setSlotStudents(prev => ({ ...prev, [slotId]: data }));
        } catch (err) {
          console.error('Ошибка загрузки студентов:', err);
          setError(err.message || 'Ошибка загрузки студентов');
        } finally {
          loadingSet.delete(slotId);
          setLoadingSlotStudents(new Set(loadingSet));
        }
      }
    }
    setExpandedSlots(newExpanded);
  };

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
                    <th style={{ width: '30px' }}></th>
                    <th>Преподаватель</th>
                    <th>Слотов</th>
                    <th>Заявок</th>
                    <th>Пришло</th>
                    <th>Отработали</th>
                    <th>% отработки</th>
                  </tr>
                </thead>
                <tbody>
                  {teacherStats.map(stat => {
                    const isExpanded = expandedTeachers.has(stat.teacher.id);
                    const slots = teacherSlots[stat.teacher.id] || [];
                    const isLoading = loadingTeacherSlots.has(stat.teacher.id);
                    
                    return (
                      <React.Fragment key={stat.teacher.id}>
                        <tr 
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleTeacherClick(stat.teacher.id)}
                        >
                          <td>
                            <span style={{ fontSize: '12px' }}>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          </td>
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
                        {isExpanded && (
                          <tr>
                            <td colSpan="7" style={{ padding: 0, borderTop: 'none' }}>
                              <div style={{ 
                                padding: '16px 24px', 
                                background: 'rgba(91, 95, 255, 0.05)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                              }}>
                                {isLoading ? (
                                  <Loader size="small" message="Загрузка слотов..." />
                                ) : slots.length === 0 ? (
                                  <div style={{ color: '#A5B4FC', textAlign: 'center', padding: '20px' }}>
                                    У этого преподавателя нет слотов
                                  </div>
                                ) : (
                                  <div>
                                    <h4 style={{ 
                                      color: '#FFFFFF', 
                                      fontSize: '14px', 
                                      fontWeight: 600,
                                      marginBottom: '12px'
                                    }}>
                                      Слоты преподавателя ({slots.length})
                                    </h4>
                                    <table style={{ 
                                      width: '100%', 
                                      borderCollapse: 'collapse',
                                      fontSize: '13px'
                                    }}>
                                      <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500,
                                            width: '30px'
                                          }}></th>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500
                                          }}>Дата</th>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500
                                          }}>Время</th>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500
                                          }}>Предмет</th>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500
                                          }}>Курс</th>
                                          <th style={{ 
                                            padding: '8px', 
                                            textAlign: 'left',
                                            color: '#A5B4FC',
                                            fontWeight: 500
                                          }}>Записано</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {slots.map(slot => {
                                          const courseNames = (slot.courses && slot.courses.length > 0)
                                            ? slot.courses.map(c => c.name).join(', ')
                                            : (slot.course?.name || '—');
                                          const isSlotExpanded = expandedSlots.has(slot.id);
                                          const slotData = slotStudents[slot.id];
                                          const isLoadingStudents = loadingSlotStudents.has(slot.id);
                                          
                                          return (
                                            <React.Fragment key={slot.id}>
                                              <tr 
                                                style={{ 
                                                  cursor: 'pointer',
                                                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)'
                                                }}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleSlotClick(slot.id);
                                                }}
                                              >
                                                <td>
                                                  <span style={{ fontSize: '12px' }}>
                                                    {isSlotExpanded ? '▼' : '▶'}
                                                  </span>
                                                </td>
                                                <td style={{ padding: '8px', color: '#FFFFFF' }}>
                                                  {new Date(slot.date).toLocaleDateString('ru-RU')}
                                                </td>
                                                <td style={{ padding: '8px', color: '#FFFFFF' }}>
                                                  {slot.timeFrom} - {slot.timeTo}
                                                </td>
                                                <td style={{ padding: '8px', color: '#FFFFFF' }}>
                                                  {slot.subject}
                                                </td>
                                                <td style={{ padding: '8px', color: '#FFFFFF' }}>
                                                  {courseNames}
                                                </td>
                                                <td style={{ padding: '8px', color: '#FFFFFF' }}>
                                                  {slot.students?.length || 0}/{slot.capacity}
                                                </td>
                                              </tr>
                                              {isSlotExpanded && (
                                                <tr>
                                                  <td colSpan="6" style={{ 
                                                    padding: 0, 
                                                    borderTop: 'none',
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                                                  }}>
                                                    <div style={{ 
                                                      padding: '16px 32px', 
                                                      background: 'rgba(91, 95, 255, 0.03)'
                                                    }}>
                                                      {isLoadingStudents ? (
                                                        <Loader size="small" message="Загрузка студентов..." />
                                                      ) : slotData && slotData.students && slotData.students.length > 0 ? (
                                                        <div>
                                                          <h5 style={{ 
                                                            color: '#FFFFFF', 
                                                            fontSize: '13px', 
                                                            fontWeight: 600,
                                                            marginBottom: '12px'
                                                          }}>
                                                            Студенты ({slotData.students.length})
                                                          </h5>
                                                          <div style={{ display: 'grid', gap: '8px' }}>
                                                            {slotData.students.map(student => (
                                                              <div 
                                                                key={student.id}
                                                                style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  padding: '10px 12px',
                                                                  background: 'rgba(255, 255, 255, 0.03)',
                                                                  borderRadius: '8px',
                                                                  border: '1px solid rgba(255, 255, 255, 0.05)'
                                                                }}
                                                              >
                                                                <div>
                                                                  <div style={{ 
                                                                    color: '#FFFFFF', 
                                                                    fontSize: '13px',
                                                                    fontWeight: 500
                                                                  }}>
                                                                    {student.fio}
                                                                  </div>
                                                                  <div style={{ 
                                                                    color: '#A5B4FC', 
                                                                    fontSize: '12px',
                                                                    marginTop: '2px'
                                                                  }}>
                                                                    Группа {student.group}{student.course ? `, курс ${student.course.name}` : ''}
                                                                  </div>
                                                                </div>
                                                                <div style={{ 
                                                                  display: 'flex', 
                                                                  gap: '16px',
                                                                  alignItems: 'center'
                                                                }}>
                                                                  <div style={{ 
                                                                    display: 'flex', 
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                  }}>
                                                                    <span style={{ 
                                                                      fontSize: '11px', 
                                                                      color: '#A5B4FC' 
                                                                    }}>
                                                                      Пришёл
                                                                    </span>
                                                                    <span style={{ 
                                                                      fontSize: '16px',
                                                                      color: student.attended ? '#4ADE80' : '#F87171'
                                                                    }}>
                                                                      {student.attended ? '✓' : '✗'}
                                                                    </span>
                                                                  </div>
                                                                  <div style={{ 
                                                                    display: 'flex', 
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                  }}>
                                                                    <span style={{ 
                                                                      fontSize: '11px', 
                                                                      color: '#A5B4FC' 
                                                                    }}>
                                                                      Отработал
                                                                    </span>
                                                                    <span style={{ 
                                                                      fontSize: '16px',
                                                                      color: student.completed ? '#4ADE80' : '#F87171'
                                                                    }}>
                                                                      {student.completed ? '✓' : '✗'}
                                                                    </span>
                                                                  </div>
                                                                </div>
                                                              </div>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <div style={{ color: '#A5B4FC', textAlign: 'center', padding: '20px' }}>
                                                          На этот слот не записалось студентов
                                                        </div>
                                                      )}
                                                    </div>
                                                  </td>
                                                </tr>
                                              )}
                                            </React.Fragment>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
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

            {/* Резервное копирование данных */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Резервное копирование данных</h3>
              <p style={{ fontSize: 14, color: '#A5B4FC', marginBottom: 16 }}>
                Вы можете выгрузить все данные системы в один JSON-файл перед обновлением,
                а затем загрузить его обратно после деплоя, чтобы восстановить состояние.
              </p>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={async () => {
                    try {
                      setExportingData(true);
                      const data = await exportData();
                      const blob = new Blob([JSON.stringify(data, null, 2)], {
                        type: 'application/json'
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
                      a.href = url;
                      a.download = `otrabotki-backup-${ts}.json`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      URL.revokeObjectURL(url);
                      setBackupInfo({
                        type: 'export',
                        timestamp: new Date().toLocaleString()
                      });
                    } catch (err) {
                      console.error('Ошибка при экспорте данных:', err);
                      setError(err.message || 'Ошибка при экспорте данных');
                    } finally {
                      setExportingData(false);
                    }
                  }}
                  disabled={exportingData}
                >
                  📥 Скачать JSON
                </button>

                <button
                  type="button"
                  className={styles.exportButton}
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  📤 Загрузить JSON
                </button>

                <input
                  type="file"
                  accept="application/json"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    try {
                      setImportingData(true);
                      const text = await file.text();
                      const json = JSON.parse(text);
                      if (!window.confirm('Импорт перезапишет текущие данные на сервере. Продолжить?')) {
                        return;
                      }
                      await importData(json);
                      setBackupInfo({
                        type: 'import',
                        timestamp: new Date().toLocaleString(),
                        fileName: file.name
                      });
                      // Перезагружаем данные
                      await loadData();
                    } catch (err) {
                      console.error('Ошибка при импорте данных:', err);
                      setError(err.message || 'Ошибка при импорте данных (проверьте JSON-файл)');
                    } finally {
                      setImportingData(false);
                    }
                  }}
                />
              </div>

              {backupInfo && (
                <p style={{ fontSize: 13, color: '#A5B4FC' }}>
                  Последнее действие: <strong>{backupInfo.type === 'export' ? 'экспорт' : 'импорт'}</strong>{' '}
                  — {backupInfo.timestamp}
                  {backupInfo.fileName ? ` (файл: ${backupInfo.fileName})` : ''}
                </p>
              )}

              <p style={{ fontSize: 12, color: '#F97373', marginTop: 12 }}>
                Внимание: импорт полностью перезаписывает данные на сервере (пользователи, расписания, слоты, предметы и т.д.).
                Всегда держите резервную копию перед обновлением.
              </p>
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
                              setDeletingTeacher(teacher.id);
                              await deleteUser(teacher.id);
                              const usersData = await getUsers();
                              setTeachers(usersData.filter(u => u.role === 'teacher'));
                            } catch (err) {
                              alert(err.message || 'Ошибка при удалении преподавателя');
                            } finally {
                              setDeletingTeacher(null);
                            }
                          }}
                          disabled={deletingTeacher === teacher.id}
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
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={handleImportStudentsClick} className={styles.exportButton} disabled={importingStudents}>
                  📤 Импорт (xlsx/csv)
                </button>
                <button onClick={exportStudents} className={styles.exportButton}>
                  📥 Экспорт в CSV
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  ref={importStudentsInputRef}
                  style={{ display: 'none' }}
                  onChange={handleImportStudentsFile}
                />
              </div>
            </div>
            
            {/* Поле поиска */}
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Поиск по ФИО, номеру зачетки, группе или курсу..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className={styles.input}
                style={{ width: '100%', maxWidth: '500px' }}
              />
            </div>
            
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleStudentSort('fio')}>
                    ФИО {getSortIndicator('fio')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleStudentSort('recordBook')}>
                    Номер зачетки {getSortIndicator('recordBook')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleStudentSort('group')}>
                    Группа {getSortIndicator('group')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleStudentSort('course')}>
                    Курс {getSortIndicator('course')}
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleStudentSort('requests')}>
                    Заявок {getSortIndicator('requests')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...students]
                  .filter(student => {
                    if (!studentSearchQuery.trim()) return true;
                    const query = studentSearchQuery.toLowerCase().trim();
                    const fio = (student.fio || '').toLowerCase();
                    const recordBook = (student.studentCardNumber || student.recordBook || student.login || '').toLowerCase();
                    const group = (student.group || '').toLowerCase();
                    const courseName = (courses.find(c => c.id === student.course)?.name || '').toLowerCase();
                    
                    return fio.includes(query) || 
                           recordBook.includes(query) || 
                           group.includes(query) || 
                           courseName.includes(query);
                  })
                  .sort((a, b) => {
                    const dir = studentSort.direction === 'asc' ? 1 : -1;
                    const getCourseName = (student) => (courses.find(c => c.id === student.course)?.name || '');
                    const recordA = getRecordBook(a).toLowerCase();
                    const recordB = getRecordBook(b).toLowerCase();
                    const groupA = (a.group || '').toLowerCase();
                    const groupB = (b.group || '').toLowerCase();
                    const courseA = getCourseName(a).toLowerCase();
                    const courseB = getCourseName(b).toLowerCase();
                    const fioA = (a.fio || '').toLowerCase();
                    const fioB = (b.fio || '').toLowerCase();
                    const reqA = requestCountsByStudent[a.id] || 0;
                    const reqB = requestCountsByStudent[b.id] || 0;

                    const compareString = (x, y) => x.localeCompare(y, 'ru', { sensitivity: 'base' }) * dir;
                    const compareNumber = (x, y) => (x - y) * dir;

                    switch (studentSort.field) {
                      case 'recordBook':
                        return compareString(recordA, recordB);
                      case 'group':
                        return compareString(groupA, groupB);
                      case 'course':
                        return compareString(courseA, courseB);
                      case 'requests':
                        return compareNumber(reqA, reqB);
                      case 'fio':
                      default:
                        return compareString(fioA, fioB);
                    }
                  })
                  .map(student => {
                    const studentRequests = requests.filter(r => r.studentId === student.id);
                    const recordBook = student.studentCardNumber || student.recordBook || student.login || '—';
                    
                    return (
                      <tr key={student.id}>
                        <td>{student.fio}</td>
                        <td><code>{recordBook}</code></td>
                        <td>{student.group}</td>
                        <td>{courses.find(c => c.id === student.course)?.name || '—'}</td>
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
        <div className={styles.modal} onClick={() => !updatingTeacher && setEditingTeacher(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {updatingTeacher && <Loader fullScreen message="Обновление преподавателя..." />}
            <h2 className={styles.modalTitle}>Изменить преподавателя</h2>
            <form
              className={styles.form}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setUpdatingTeacher(true);
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

                  setEditingTeacher(null);
                  setGeneratedTeacherPassword('');
                } catch (err) {
                  console.error('Ошибка при обновлении преподавателя:', err);
                  setError(err.message || 'Ошибка при обновлении преподавателя');
                } finally {
                  setUpdatingTeacher(false);
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
                  disabled={updatingTeacher}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={updatingTeacher}
                >
                  {updatingTeacher ? 'Сохранение...' : 'Сохранить'}
                </button>
                {exportingData && <Loader fullScreen message="Экспорт данных..." />}
                {importingData && <Loader fullScreen message="Импорт данных..." />}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminSettings;
