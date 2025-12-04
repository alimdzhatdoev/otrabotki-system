// Компонент: Панель студента для записи на отработки
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAvailableSlots, bookSlot, cancelBooking, getMyBookings, getLimitsInfo } from '../api/studentApi';
import { getCourses } from '../api/commonApi';
import Calendar from '../components/Calendar';
import styles from './StudentDashboard.module.css';

function StudentDashboard() {
  const { currentUser } = useAuth();
  
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [limits, setLimits] = useState({ maxPerDay: 1, maxPerWeek: 3 });
  const [limitsCurrent, setLimitsCurrent] = useState({ today: 0, week: 0 });
  const [selectedSubject, setSelectedSubject] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadData();
  }, [currentUser, selectedSubject]);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      // Загружаем курсы для получения предметов
      const coursesData = await getCourses();
      setCourses(coursesData);

      // Загружаем доступные слоты
      const slotsData = await getAvailableSlots({ subject: selectedSubject || undefined });
      setSlots(slotsData);

      // Загружаем мои записи
      const bookingsData = await getMyBookings();
      setMyBookings(bookingsData);

      // Загружаем информацию о лимитах
      const limitsData = await getLimitsInfo();
      setLimits(limitsData.limits);
      setLimitsCurrent(limitsData.current);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== 'student') {
    return <div>Доступ запрещён</div>;
  }

  // Получить курс студента
  const studentCourse = courses.find(c => c.id === currentUser.course);
  
  // Фильтрация слотов (уже отфильтрованы на бэкенде, но можно дополнительно)
  const availableSlots = slots.filter(slot => {
    const matchesSubject = !selectedSubject || slot.subject === selectedSubject;
    return matchesSubject;
  });

  // Запись на слот (вызывается из календаря)
  const handleSlotSelect = async (slot) => {
    // Проверка: слот уже заполнен
    if (slot.bookedCount >= slot.capacity) {
      alert('Все места заняты!');
      return;
    }
    
    // Проверка: студент уже записан
    if (slot.isBooked) {
      alert('Вы уже записаны на эту отработку!');
      return;
    }

    try {
      await bookSlot(slot.id);
      alert('Вы успешно записались на отработку!');
      // Перезагружаем данные
      await loadData();
    } catch (err) {
      alert(err.message || 'Ошибка при записи на слот');
    }
  };

  // Отмена записи
  const handleCancelBooking = async (slotId) => {
    if (!confirm('Отменить запись на эту отработку?')) return;
    
    try {
      await cancelBooking(slotId);
      alert('Запись отменена');
      // Перезагружаем данные
      await loadData();
    } catch (err) {
      alert(err.message || 'Ошибка при отмене записи');
    }
  };

  if (loading && slots.length === 0) {
    return <div className={styles.container}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <div style={{ padding: '10px', background: '#fee', color: '#c00', marginBottom: '20px' }}>
          Ошибка: {error}
        </div>
      )}

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
              {limitsCurrent.today}
            </span>
          </div>
          <div className={styles.limitItem}>
            <span className={styles.limitLabel}>Записей за неделю</span>
            <span className={styles.limitValue}>
              {limitsCurrent.week}
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
              return (
                <div key={slot.id} className={styles.bookingCard}>
                  <div className={styles.bookingInfo}>
                    <h4 className={styles.bookingSubject}>{slot.subject}</h4>
                    <div className={styles.bookingDetails}>
                      <span>📅 {new Date(slot.date).toLocaleDateString('ru-RU')}</span>
                      <span>🕐 {slot.timeFrom} - {slot.timeTo}</span>
                      <span>👨‍🏫 {slot.teacher?.fio || 'Не указан'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelBooking(slot.id)}
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
