// Компонент: Календарь для выбора даты и времени
import React, { useState } from 'react';
import { users } from '../data/users';
import styles from './Calendar.module.css';

// Note: Компонент использует slots, переданные как props

function Calendar({ slots, onSlotSelect, currentUser, userRole }) {
  // Получить всех пользователей (включая кастомных)
  const getAllUsers = () => {
    const customUsers = localStorage.getItem('customUsers');
    if (customUsers) {
      return [...users, ...JSON.parse(customUsers)];
    }
    return users;
  };

  const allUsers = getAllUsers();
  
  // Форматирование даты в формат YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Инициализация сегодняшней даты
  const todayDateStr = formatDate(new Date());
  
  const [selectedDate, setSelectedDate] = useState(todayDateStr);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Получить дни текущего месяца
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);

  // Переход к предыдущему месяцу
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  // Переход к следующему месяцу
  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  // Получить слоты на конкретную дату
  const getSlotsForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return slots.filter(slot => slot.date === dateStr);
  };

  // Проверить, есть ли доступные слоты
  const hasAvailableSlots = (day) => {
    const daySlots = getSlotsForDate(day);
    return daySlots.some(slot => slot.students.length < slot.capacity);
  };

  // Обработка клика по дню
  const handleDayClick = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  // Получить слоты для выбранной даты
  const selectedDaySlots = selectedDate ? slots.filter(slot => slot.date === selectedDate) : [];

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  // Создать массив дней для отображения
  const days = [];
  
  // Пустые ячейки до первого дня месяца
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(<div key={`empty-${i}`} className={styles.dayEmpty}></div>);
  }
  
  // Дни месяца
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    const isSelected = selectedDate === dateStr;
    const hasSlots = hasAvailableSlots(day);
    const daySlots = getSlotsForDate(day);
    
    days.push(
      <div
        key={day}
        className={`
          ${styles.day}
          ${isToday ? styles.dayToday : ''}
          ${isSelected ? styles.daySelected : ''}
          ${hasSlots ? styles.dayHasSlots : ''}
          ${daySlots.length > 0 ? styles.dayClickable : ''}
        `}
        onClick={() => daySlots.length > 0 && handleDayClick(day)}
      >
        <div className={styles.dayNumber}>{day}</div>
        {daySlots.length > 0 && (
          <div className={styles.dayDots}>
            {daySlots.slice(0, 3).map((slot, idx) => (
              <div key={idx} className={styles.dayDot}></div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${selectedDate ? styles.containerWithSlots : styles.containerFullWidth}`}>
      <div className={styles.calendarWrapper}>
        <div className={styles.header}>
          <button onClick={prevMonth} className={styles.navButton}>
            ◀
          </button>
          <h3 className={styles.monthTitle}>
            {monthNames[month]} {year}
          </h3>
          <button onClick={nextMonth} className={styles.navButton}>
            ▶
          </button>
        </div>

        <div className={styles.weekDays}>
          {weekDays.map(day => (
            <div key={day} className={styles.weekDay}>{day}</div>
          ))}
        </div>

        <div className={styles.days}>
          {days}
        </div>
      </div>

      {selectedDate && (
        <div className={styles.slotsPanel}>
          <h4 className={styles.slotsPanelTitle}>
            Слоты на {new Date(selectedDate).toLocaleDateString('ru-RU')}
          </h4>
          <div className={styles.slotsList}>
            {selectedDaySlots.length === 0 ? (
              <div style={{ color: '#A5B4FC', textAlign: 'center', padding: '20px' }}>
                На эту дату нет доступных слотов
              </div>
            ) : (
              selectedDaySlots.map(slot => {
              const isAvailable = (slot.bookedCount || slot.students?.length || 0) < slot.capacity;
              const isBooked = currentUser && (slot.isBooked || (slot.students && slot.students.includes(currentUser.id)));
              // Используем информацию о преподавателе из API, если доступна, иначе ищем в локальных данных
              const teacher = slot.teacher || allUsers.find(u => u.id === slot.teacherId);
              
              return (
                <div
                  key={slot.id}
                  className={`${styles.slotItem} ${!isAvailable ? styles.slotItemFull : ''} ${isBooked ? styles.slotItemBooked : ''}`}
                >
                  <div className={styles.slotInfo}>
                    <div className={styles.slotTime}>
                      🕐 {slot.timeFrom} - {slot.timeTo}
                    </div>
                    <div className={styles.slotSubject}>{slot.subject}</div>
                    {userRole === 'student' && teacher && (
                      <div className={styles.slotTeacher}>{teacher.fio || teacher.name || 'Не указан'}</div>
                    )}
                    <div className={styles.slotCapacity}>
                      {slot.bookedCount || slot.students?.length || 0}/{slot.capacity}
                    </div>
                  </div>
                  {isBooked ? (
                    <div className={styles.slotBooked}>Записан</div>
                  ) : userRole === 'student' ? (
                    <button
                      onClick={() => onSlotSelect && onSlotSelect(slot)}
                      className={styles.slotButton}
                      disabled={!isAvailable}
                    >
                      {isAvailable ? 'Записаться' : 'Нет мест'}
                    </button>
                  ) : null}
                </div>
              );
            }))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;

