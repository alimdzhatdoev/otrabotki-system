// Компонент: Панель студента для записи на отработки
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { courses } from '../data/courses';
import { users } from '../data/users';
import { initialSlots } from '../data/slots';
import { initialLimits } from '../data/limits';
import Calendar from '../components/Calendar';
import styles from './StudentDashboard.module.css';

function StudentDashboard() {
  const { currentUser } = useAuth();
  
  const [slots, setSlots] = useState([]);
  const [limits, setLimits] = useState(initialLimits);
  const [selectedSubject, setSelectedSubject] = useState('');

  // Загрузка данных из localStorage при монтировании
  useEffect(() => {
    const savedSlots = localStorage.getItem('slots');
    const savedLimits = localStorage.getItem('limits');
    
    if (savedSlots) {
      setSlots(JSON.parse(savedSlots));
    } else {
      setSlots(initialSlots);
      localStorage.setItem('slots', JSON.stringify(initialSlots));
    }
    
    if (savedLimits) {
      setLimits(JSON.parse(savedLimits));
    } else {
      setLimits(initialLimits);
      localStorage.setItem('limits', JSON.stringify(initialLimits));
    }
  }, []);

  if (!currentUser || currentUser.role !== 'student') {
    return <div>Доступ запрещён</div>;
  }

  // Получить курс студента
  const studentCourse = courses.find(c => c.id === currentUser.course);
  
  // Фильтрация слотов
  const getAvailableSlots = () => {
    return slots.filter(slot => {
      const matchesCourse = slot.courseId === currentUser.course;
      const matchesSubject = !selectedSubject || slot.subject === selectedSubject;
      return matchesCourse && matchesSubject;
    });
  };

  // Получить мои записи
  const getMyBookings = () => {
    return slots.filter(slot => slot.students.includes(currentUser.id));
  };

  // Проверка лимитов
  const checkLimits = (slotDate) => {
    const myBookings = getMyBookings();
    
    // Проверка лимита в день
    const bookingsOnDay = myBookings.filter(slot => slot.date === slotDate);
    if (bookingsOnDay.length >= limits.maxPerDay) {
      return { valid: false, message: `Превышен лимит записей в день (макс. ${limits.maxPerDay})` };
    }
    
    // Проверка лимита в неделю
    const slotDateObj = new Date(slotDate);
    const weekStart = new Date(slotDateObj);
    weekStart.setDate(slotDateObj.getDate() - slotDateObj.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const bookingsInWeek = myBookings.filter(slot => {
      const d = new Date(slot.date);
      return d >= weekStart && d <= weekEnd;
    });
    
    if (bookingsInWeek.length >= limits.maxPerWeek) {
      return { valid: false, message: `Превышен лимит записей в неделю (макс. ${limits.maxPerWeek})` };
    }
    
    return { valid: true };
  };

  // Запись на слот (вызывается из календаря)
  const handleSlotSelect = (slot) => {
    // Проверка: слот уже заполнен
    if (slot.students.length >= slot.capacity) {
      alert('Все места заняты!');
      return;
    }
    
    // Проверка: студент уже записан
    if (slot.students.includes(currentUser.id)) {
      alert('Вы уже записаны на эту отработку!');
      return;
    }
    
    // Проверка лимитов
    const limitCheck = checkLimits(slot.date);
    if (!limitCheck.valid) {
      alert(limitCheck.message);
      return;
    }
    
    // Запись студента
    const updatedSlots = slots.map(s => {
      if (s.id === slot.id) {
        return {
          ...s,
          students: [...s.students, currentUser.id]
        };
      }
      return s;
    });
    
    setSlots(updatedSlots);
    localStorage.setItem('slots', JSON.stringify(updatedSlots));
    alert('Вы успешно записались на отработку!');
  };

  // Отмена записи
  const cancelBooking = (slotId) => {
    if (!confirm('Отменить запись на эту отработку?')) return;
    
    const updatedSlots = slots.map(s => {
      if (s.id === slotId) {
        return {
          ...s,
          students: s.students.filter(id => id !== currentUser.id)
        };
      }
      return s;
    });
    
    setSlots(updatedSlots);
    localStorage.setItem('slots', JSON.stringify(updatedSlots));
    alert('Запись отменена');
  };

  const availableSlots = getAvailableSlots();
  const myBookings = getMyBookings();

  return (
    <div className={styles.container}>
      {/* Профиль студента */}
      <div className={styles.profileCard}>
        <div className={styles.profileIcon}>🎓</div>
        <div className={styles.profileInfo}>
          <h2 className={styles.profileName}>{currentUser.fio}</h2>
          <p className={styles.profileDetails}>
            Группа {currentUser.group} • {studentCourse?.name}
          </p>
        </div>
        <div className={styles.limitsInfo}>
          <div className={styles.limitItem}>
            <span className={styles.limitLabel}>Записей сегодня</span>
            <span className={styles.limitValue}>
              {myBookings.filter(s => s.date === new Date().toISOString().split('T')[0]).length}/{limits.maxPerDay}
            </span>
          </div>
          <div className={styles.limitItem}>
            <span className={styles.limitLabel}>Записей на неделю</span>
            <span className={styles.limitValue}>
              {/* Подсчёт записей на текущую неделю */}
              {(() => {
                const today = new Date();
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                const count = myBookings.filter(slot => {
                  const d = new Date(slot.date);
                  return d >= weekStart && d <= weekEnd;
                }).length;
                return `${count}/${limits.maxPerWeek}`;
              })()}
            </span>
          </div>
        </div>
      </div>

      {/* Фильтр по предметам */}
      <div className={styles.filterCard}>
        <h3 className={styles.filterTitle}>Фильтр по предмету</h3>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="">Все предметы</option>
          {studentCourse?.subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>

      {/* Календарь */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📅 Календарь отработок</h3>
        <Calendar
          slots={availableSlots}
          onSlotSelect={handleSlotSelect}
          currentUser={currentUser}
          userRole="student"
        />
      </div>

      {/* Мои записи */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Мои записи ({myBookings.length})</h3>
        <div className={styles.bookingsList}>
          {myBookings.length === 0 ? (
            <p className={styles.emptyMessage}>У вас пока нет записей</p>
          ) : (
            myBookings.map(slot => {
              const teacher = users.find(t => t.id === slot.teacherId);
              
              return (
                <div key={slot.id} className={styles.bookingCard}>
                  <div className={styles.bookingInfo}>
                    <h4 className={styles.bookingSubject}>{slot.subject}</h4>
                    <div className={styles.bookingDetails}>
                      <span>📅 {new Date(slot.date).toLocaleDateString('ru-RU')}</span>
                      <span>🕐 {slot.timeFrom} - {slot.timeTo}</span>
                      <span>👨‍🏫 {teacher?.fio}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => cancelBooking(slot.id)}
                    className={styles.bookingCancelButton}
                  >
                    Отменить
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
