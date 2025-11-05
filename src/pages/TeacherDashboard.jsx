// Компонент: Панель преподавателя для просмотра слотов и отметки посещаемости
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { users } from '../data/users';
import { courses } from '../data/courses';
import { initialSlots } from '../data/slots';
import Calendar from '../components/Calendar';
import styles from './TeacherDashboard.module.css';

function TeacherDashboard() {
  const { currentUser } = useAuth();
  
  const [slots, setSlots] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [expandedSlot, setExpandedSlot] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' по умолчанию
  const [todaySlotFound, setTodaySlotFound] = useState(false);
  
  // Фильтры
  const [filters, setFilters] = useState({
    subject: '',
    course: ''
  });

  // Загрузка данных
  useEffect(() => {
    const savedSlots = localStorage.getItem('slots');
    const savedAttendance = localStorage.getItem('attendance');
    
    if (savedSlots) {
      setSlots(JSON.parse(savedSlots));
    } else {
      setSlots(initialSlots);
    }
    
    if (savedAttendance) {
      setAttendance(JSON.parse(savedAttendance));
    }
  }, []);

  // Автоматически раскрыть сегодняшнюю отработку
  useEffect(() => {
    if (slots.length > 0 && currentUser && !todaySlotFound) {
      const today = new Date().toISOString().split('T')[0];
      const todaySlot = slots.find(slot => 
        slot.teacherId === currentUser.id && 
        slot.date === today &&
        slot.students.length > 0
      );
      
      if (todaySlot) {
        setExpandedSlot(todaySlot.id);
        setTodaySlotFound(true);
      }
    }
  }, [slots, currentUser, todaySlotFound]);

  if (!currentUser || currentUser.role !== 'teacher') {
    return <div>Доступ запрещён</div>;
  }

  // Получить слоты преподавателя с сортировкой от сегодня
  const getMySlots = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return slots
      .filter(slot => {
        if (slot.teacherId !== currentUser.id) return false;
        
        if (filters.subject && slot.subject !== filters.subject) return false;
        if (filters.course && slot.courseId !== parseInt(filters.course)) return false;
        
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        // Сортируем от сегодня вперёд
        return dateA - dateB;
      });
  };

  // Проверить посещаемость
  const isAttended = (slotId, studentId) => {
    const record = attendance.find(
      a => a.slotId === slotId && a.studentId === studentId
    );
    return record ? record.attended : false;
  };

  // Проверить, отработал ли
  const isCompleted = (slotId, studentId) => {
    const record = attendance.find(
      a => a.slotId === slotId && a.studentId === studentId
    );
    return record ? record.completed : false;
  };

  // Переключить посещаемость
  const toggleAttendance = (slotId, studentId) => {
    const existingIndex = attendance.findIndex(
      a => a.slotId === slotId && a.studentId === studentId
    );
    
    let newAttendance;
    
    if (existingIndex >= 0) {
      newAttendance = [...attendance];
      newAttendance[existingIndex] = {
        ...newAttendance[existingIndex],
        attended: !newAttendance[existingIndex].attended
      };
    } else {
      newAttendance = [
        ...attendance,
        { slotId, studentId, attended: true, completed: false }
      ];
    }
    
    setAttendance(newAttendance);
    localStorage.setItem('attendance', JSON.stringify(newAttendance));
  };

  // Переключить статус отработки
  const toggleCompleted = (slotId, studentId) => {
    const existingIndex = attendance.findIndex(
      a => a.slotId === slotId && a.studentId === studentId
    );
    
    let newAttendance;
    
    if (existingIndex >= 0) {
      newAttendance = [...attendance];
      newAttendance[existingIndex] = {
        ...newAttendance[existingIndex],
        completed: !newAttendance[existingIndex].completed
      };
    } else {
      newAttendance = [
        ...attendance,
        { slotId, studentId, attended: false, completed: true }
      ];
    }
    
    setAttendance(newAttendance);
    localStorage.setItem('attendance', JSON.stringify(newAttendance));
  };

  // Получить статистику по слоту
  const getSlotStats = (slot) => {
    const total = slot.students.length;
    const attended = slot.students.filter(studentId => 
      isAttended(slot.id, studentId)
    ).length;
    const completed = slot.students.filter(studentId =>
      isCompleted(slot.id, studentId)
    ).length;
    
    return { total, attended, completed };
  };

  // Обработка клика на слот из календаря
  const handleSlotSelect = (slot) => {
    setExpandedSlot(slot.id);
    setViewMode('list');
  };

  const mySlots = getMySlots();
  
  // Статистика по всем слотам
  const totalSlots = mySlots.length;
  const totalStudents = mySlots.reduce((sum, s) => sum + s.students.length, 0);
  const totalAttended = mySlots.reduce((sum, s) => {
    return sum + s.students.filter(studentId => isAttended(s.id, studentId)).length;
  }, 0);
  const totalCompleted = mySlots.reduce((sum, s) => {
    return sum + s.students.filter(studentId => isCompleted(s.id, studentId)).length;
  }, 0);

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
            <div className={styles.statValue}>{totalSlots}</div>
            <div className={styles.statLabel}>Моих слотов</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎓</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalStudents}</div>
            <div className={styles.statLabel}>Записалось студентов</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>✅</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalAttended}</div>
            <div className={styles.statLabel}>Присутствовало</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>🎯</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{totalCompleted}</div>
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
                  const course = courses.find(c => c.id === slot.courseId);
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
                            <span>📚 {course?.name}</span>
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
                          {slot.students.map(studentId => {
                            const student = users.find(s => s.id === studentId);
                            if (!student) return null;
                            
                            const attended = isAttended(slot.id, studentId);
                            const completed = isCompleted(slot.id, studentId);
                            
                            return (
                              <div key={studentId} className={styles.studentItem}>
                                <div className={styles.studentInfo}>
                                  <span className={styles.studentIcon}>🎓</span>
                                  <div className={styles.studentDetails}>
                                    <div className={styles.studentName}>{student.fio}</div>
                                    <div className={styles.studentGroup}>Группа {student.group}</div>
                                  </div>
                                </div>
                                
                                <div className={styles.studentActions}>
                                  <label className={styles.checkboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={attended}
                                      onChange={() => toggleAttendance(slot.id, studentId)}
                                      className={styles.checkbox}
                                    />
                                    <span className={styles.checkboxText}>
                                      Пришёл
                                    </span>
                                  </label>
                                  
                                  <label className={styles.checkboxLabel}>
                                    <input
                                      type="checkbox"
                                      checked={completed}
                                      onChange={() => toggleCompleted(slot.id, studentId)}
                                      className={styles.checkbox}
                                    />
                                    <span className={styles.checkboxText}>
                                      Отработал
                                    </span>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
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
