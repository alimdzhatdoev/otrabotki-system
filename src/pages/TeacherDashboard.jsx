// Компонент: Панель преподавателя для просмотра слотов и отметки посещаемости
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMySlots, getSlotStudents, updateAttendance, getStats } from '../api/teacherApi';
import { getCourses } from '../api/commonApi';
import Calendar from '../components/Calendar';
import Loader from '../components/Loader';
import styles from './TeacherDashboard.module.css';

function TeacherDashboard() {
  const { currentUser } = useAuth();
  
  const [slots, setSlots] = useState([]);
  const [slotStudents, setSlotStudents] = useState({}); // { slotId: { students: [...] } }
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({ totalSlots: 0, totalStudents: 0, totalAttended: 0, totalCompleted: 0 });
  const [loading, setLoading] = useState(true);
  // Состояния загрузки для операций
  const [updatingAttendance, setUpdatingAttendance] = useState(null); // { slotId, studentId }
  const [loadingStudents, setLoadingStudents] = useState(null); // ID слота, для которого загружаются студенты
  
  // Фильтры
  const [filters, setFilters] = useState({
    subject: '',
    course: ''
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [currentUser, filters]);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Загружаем курсы
      const coursesData = await getCourses();
      setCourses(coursesData);
      
      // Загружаем слоты
      const slotsData = await getMySlots(filters);
      setSlots(slotsData);
      
      // Загружаем статистику
      const statsData = await getStats();
      setStats(statsData);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
    } finally {
      setLoading(false);
    }
  };

  // Автоматически раскрыть сегодняшнюю отработку
  useEffect(() => {
    if (slots.length > 0 && currentUser) {
      const today = new Date().toISOString().split('T')[0];
      const todaySlot = slots.find(slot => 
        slot.date === today &&
        slot.students && slot.students.length > 0
      );
      
      if (todaySlot && !expandedSlot) {
        setExpandedSlot(todaySlot.id);
      }
    }
  }, [slots, currentUser]);

  if (!currentUser || currentUser.role !== 'teacher') {
    return <div>Доступ запрещён</div>;
  }

  // Получить студентов для слота
  const getStudentsForSlot = async (slotId) => {
    if (slotStudents[slotId]) {
      return slotStudents[slotId].students || [];
    }
    
    try {
      setLoadingStudents(slotId);
      const data = await getSlotStudents(slotId);
      setSlotStudents(prev => ({ ...prev, [slotId]: data }));
      return data.students || [];
    } catch (err) {
      console.error('Ошибка загрузки студентов:', err);
      return [];
    } finally {
      setLoadingStudents(null);
    }
  };

  // Проверка, можно ли редактировать слот: с начала отработки и до конца текущего дня
  const isSlotTimeActive = (slot) => {
    const now = new Date();
    
    // Парсим дату слота
    const slotDate = new Date(slot.date + 'T00:00:00');
    const slotDateOnly = new Date(slotDate.getFullYear(), slotDate.getMonth(), slotDate.getDate());
    
    // Получаем сегодняшнюю дату (без времени)
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Проверяем, что сегодняшняя дата совпадает с датой слота
    if (slotDateOnly.getTime() !== today.getTime()) {
      return false;
    }
    
    // Парсим время начала
    const [hoursFrom, minutesFrom] = slot.timeFrom.split(':').map(Number);
    
    // Создаем объект Date для времени начала
    const slotStart = new Date(today);
    slotStart.setHours(hoursFrom, minutesFrom, 0, 0);
    
    // Разрешаем редактирование с начала слота до конца текущего дня
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    return now >= slotStart && now <= endOfDay;
  };

  // Переключить посещаемость
  const toggleAttendance = async (slotId, studentId, currentAttended, slot) => {
    // Проверяем время
    if (!isSlotTimeActive(slot)) {
      return;
    }
    
    try {
      setUpdatingAttendance({ slotId, studentId });
      await updateAttendance(slotId, studentId, !currentAttended, undefined);
      // Перезагружаем данные слота
      const slotData = await getSlotStudents(slotId);
      setSlotStudents(prev => ({
        ...prev,
        [slotId]: slotData
      }));
    } catch (err) {
      console.error('Ошибка обновления посещаемости:', err);
    } finally {
      setUpdatingAttendance(null);
    }
  };

  // Переключить статус отработки
  const toggleCompleted = async (slotId, studentId, currentCompleted, slot) => {
    // Проверяем время
    if (!isSlotTimeActive(slot)) {
      return;
    }
    
    try {
      setUpdatingAttendance({ slotId, studentId });
      await updateAttendance(slotId, studentId, undefined, !currentCompleted);
      // Перезагружаем данные слота
      const slotData = await getSlotStudents(slotId);
      setSlotStudents(prev => ({
        ...prev,
        [slotId]: slotData
      }));
    } catch (err) {
      console.error('Ошибка обновления статуса отработки:', err);
    } finally {
      setUpdatingAttendance(null);
    }
  };

  // Получить статистику по слоту
  const getSlotStats = (slot) => {
    const slotData = slotStudents[slot.id];
    if (!slotData || !slotData.students) {
      return { total: slot.students?.length || 0, attended: 0, completed: 0 };
    }
    
    const total = slotData.students.length;
    const attended = slotData.students.filter(s => s.attended).length;
    const completed = slotData.students.filter(s => s.completed).length;
    
    return { total, attended, completed };
  };

  // Обработка клика на слот из календаря
  const handleSlotSelect = (slot) => {
    setExpandedSlot(slot.id);
    setViewMode('list');
  };

  const mySlots = slots;
  
  // Загружаем студентов при раскрытии слота
  useEffect(() => {
    if (expandedSlot && !slotStudents[expandedSlot]) {
      getStudentsForSlot(expandedSlot);
    }
  }, [expandedSlot]);

  return (
    <div className={styles.container}>
      {/* Профиль преподавателя */}
      <div className={styles.profileCard}>
        <div className={styles.profileIcon}>👩‍🏫</div>
        <div className={styles.profileInfo}>
          <h2 className={styles.profileName}>{currentUser.fio}</h2>
          <p className={styles.profileDetails}>
            Предметы: {currentUser.subjects.join(', ')}
          </p>
        </div>
      </div>

      {/* Статистика */}
      <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📋</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalSlots}</div>
                <div className={styles.statLabel}>Моих слотов</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎓</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalStudents}</div>
                <div className={styles.statLabel}>Записалось студентов</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalAttended}</div>
                <div className={styles.statLabel}>Присутствовало</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🎯</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{stats.totalCompleted}</div>
                <div className={styles.statLabel}>Отработали</div>
              </div>
            </div>
      </div>

      {/* Переключатель режимов */}
      <div className={styles.viewToggleWrapper}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.toggleButton} ${viewMode === 'list' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 Список
          </button>
          <button
            className={`${styles.toggleButton} ${viewMode === 'calendar' ? styles.toggleButtonActive : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            📅 Календарь
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className={styles.calendarSection}>
          <h3 className={styles.sectionTitle}>📅 Календарь моих отработок</h3>
          <Calendar
            slots={mySlots}
            onSlotSelect={handleSlotSelect}
            currentUser={null}
            userRole="teacher"
          />
        </div>
      ) : (
        <>
          {/* Фильтры */}
          <div className={styles.filtersCard}>
            <h3 className={styles.filtersTitle}>Фильтры</h3>
            <div className={styles.filtersGrid}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Предмет</label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                  className={styles.filterInput}
                >
                  <option value="">Все предметы</option>
                  {currentUser.subjects.map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>
              
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Курс</label>
                <select
                  value={filters.course}
                  onChange={(e) => setFilters({ ...filters, course: e.target.value })}
                  className={styles.filterInput}
                >
                  <option value="">Все курсы</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => setFilters({ subject: '', course: '' })}
                className={styles.resetButton}
              >
                Сбросить
              </button>
            </div>
          </div>

          {/* Список слотов */}
          <div className={styles.slotsSection}>
            <h3 className={styles.sectionTitle}>Отработки (отсортировано от сегодня) — {mySlots.length}</h3>
            
            {mySlots.length === 0 ? (
              <p className={styles.emptyMessage}>Нет слотов по заданным фильтрам</p>
            ) : (
              <div className={styles.slotsList}>
                {mySlots.map(slot => {
                  // Формируем строку курсов: сначала новые courseIds, иначе fallback на courseId
                  const courseNames = (slot.courses && slot.courses.length > 0)
                    ? slot.courses.map(c => c.name).join(', ')
                    : (courses.find(c => c.id === slot.courseId)?.name || '');
                  const stats = getSlotStats(slot);
                  const isExpanded = expandedSlot === slot.id;
                  const slotDate = new Date(slot.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isPast = slotDate < today;
                  const isToday = slot.date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <div key={slot.id} className={`${styles.slotCard} ${isPast ? styles.slotCardPast : ''} ${isToday ? styles.slotCardToday : ''}`}>
                      <div className={styles.slotHeader}>
                        <div className={styles.slotMainInfo}>
                          <h4 className={styles.slotSubject}>{slot.subject}</h4>
                          <div className={styles.slotMeta}>
                            <span>📅 {new Date(slot.date).toLocaleDateString('ru-RU')}</span>
                            <span>🕐 {slot.timeFrom} - {slot.timeTo}</span>
                            <span>📚 {courseNames}</span>
                          </div>
                        </div>
                        
                        <div className={styles.slotStats}>
                          <div className={styles.slotStatItem}>
                            <span className={styles.slotStatLabel}>Записано</span>
                            <span className={styles.slotStatValue}>{stats.total}/{slot.capacity}</span>
                          </div>
                          <div className={styles.slotStatItem}>
                            <span className={styles.slotStatLabel}>Пришло</span>
                            <span className={styles.slotStatValueSuccess}>{stats.attended}</span>
                          </div>
                          <div className={styles.slotStatItem}>
                            <span className={styles.slotStatLabel}>Отработали</span>
                            <span className={styles.slotStatValueSuccess}>{stats.completed}</span>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => setExpandedSlot(isExpanded ? null : slot.id)}
                          className={styles.expandButton}
                          disabled={slot.students.length === 0}
                        >
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                      
                      {/* Список студентов (раскрывающийся) */}
                      {isExpanded && (
                        <div className={styles.studentsList}>
                          <h5 className={styles.studentsListTitle}>Записанные студенты:</h5>
                          {(() => {
                            const slotData = slotStudents[slot.id];
                            const students = slotData?.students || [];
                            
                            if (students.length === 0 || loadingStudents === slot.id) {
                              return <Loader size="small" message="Загрузка студентов..." />;
                            }
                            
                            return students.map(student => {
                              return (
                                <div key={student.id} className={styles.studentItem}>
                                  <div className={styles.studentInfo}>
                                    <span className={styles.studentIcon}>🎓</span>
                                    <div className={styles.studentDetails}>
                                      <div className={styles.studentName}>{student.fio}</div>
                                      <div className={styles.studentGroup}>
                                        Группа {student.group}{student.course ? `, курс ${student.course.name}` : ''}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className={styles.studentActions}>
                                    {(() => {
                                      const isTimeActive = isSlotTimeActive(slot);
                                      return (
                                        <>
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={student.attended || false}
                                              onChange={() => toggleAttendance(slot.id, student.id, student.attended, slot)}
                                              disabled={!isTimeActive || (updatingAttendance?.slotId === slot.id && updatingAttendance?.studentId === student.id)}
                                              className={styles.checkbox}
                                              title={!isTimeActive ? 'Можно отмечать только во время отработки' : ''}
                                            />
                                            <span className={styles.checkboxText}>
                                              Пришёл
                                            </span>
                                          </label>
                                          
                                          <label className={styles.checkboxLabel}>
                                            <input
                                              type="checkbox"
                                              checked={student.completed || false}
                                              onChange={() => toggleCompleted(slot.id, student.id, student.completed, slot)}
                                              disabled={!isTimeActive || (updatingAttendance?.slotId === slot.id && updatingAttendance?.studentId === student.id)}
                                              className={styles.checkbox}
                                              title={!isTimeActive ? 'Можно отмечать только во время отработки' : ''}
                                            />
                                            <span className={styles.checkboxText}>
                                              Отработал
                                            </span>
                                          </label>
                                        </>
                                      );
                                    })()}
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default TeacherDashboard;
