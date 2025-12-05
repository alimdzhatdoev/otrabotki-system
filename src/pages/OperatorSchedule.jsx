// Компонент: Панель оператора для управления расписаниями и слотами
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getTeacherSchedules, 
  createTeacherSchedule, 
  deleteTeacherSchedule,
  getScheduleSlots,
  generateSlots,
  getAllSlots,
  createTeacher,
  getCourses,
  getTeachers as getTeachersApi,
  getSubjects,
  updateSlot as updateSlotApi
} from '../api/operatorApi';
import Loader from '../components/Loader';
import styles from './OperatorSchedule.module.css';

function OperatorSchedule() {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [slots, setSlots] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [newTeacher, setNewTeacher] = useState({ fio: '', subjects: [] });
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [editingSlot, setEditingSlot] = useState(null);
  // Состояния загрузки для различных операций
  const [creatingTeacher, setCreatingTeacher] = useState(false);
  const [creatingSchedule, setCreatingSchedule] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState(null); // ID удаляемого расписания
  const [updatingSlot, setUpdatingSlot] = useState(null); // ID обновляемого слота
  const [loadingSlots, setLoadingSlots] = useState(null); // ID расписания, для которого загружаются слоты
  const [slotEditForm, setSlotEditForm] = useState({
    date: '',
    timeFrom: '',
    timeTo: '',
    capacity: 1,
    teacherId: ''
  });
  
  // Форма нового расписания
  const [formData, setFormData] = useState({
    teacherId: '',
    subject: '',
    courseId: 1,
    dayOfWeek: 0, // 0 = Понедельник (первый день недели)
    timeFrom: '',
    timeTo: '',
    capacity: 1
  });

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);

      // Загружаем курсы
      const coursesData = await getCourses();
      setCourses(coursesData);

      // Загружаем предметы (для форм)
      const subjectsData = await getSubjects();
      setSubjects(subjectsData);

      // Загружаем преподавателей
      const teachersData = await getTeachersApi();
      setTeachers(teachersData);

      // Загружаем расписания
      const schedulesData = await getTeacherSchedules();
      setSchedules(schedulesData);

      // Загружаем слоты
      const slotsData = await getAllSlots();
      setSlots(slotsData);
    } catch (err) {
      console.error('Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser || currentUser.role !== 'operator') {
    return <div>Доступ запрещён</div>;
  }

  // Добавление преподавателя
  const handleAddTeacher = async (e) => {
    e.preventDefault();
    
    if (!newTeacher.fio || newTeacher.subjects.length === 0) {
      return;
    }

    try {
      setCreatingTeacher(true);
      const response = await createTeacher({
        fio: newTeacher.fio,
        subjects: newTeacher.subjects
      });

      // Показываем учётные данные
      setGeneratedCredentials({
        login: response.teacher.login,
        password: response.teacher.password,
        fio: response.teacher.fio
      });

      // Обновляем список преподавателей
      await loadData();
      
      // Сброс формы
      setNewTeacher({ fio: '', subjects: [] });
    } catch (err) {
      console.error('Ошибка при создании преподавателя:', err);
      setError(err.message || 'Ошибка при создании преподавателя');
    } finally {
      setCreatingTeacher(false);
    }
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
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    
    // Валидация
    if (!formData.teacherId || !formData.subject || !formData.timeFrom || !formData.timeTo) {
      return;
    }
    
    try {
      setCreatingSchedule(true);
      const response = await createTeacherSchedule(formData);
      
      // Генерируем слоты автоматически для созданного расписания
      if (response.schedule?.id) {
        try {
          // Небольшая задержка, чтобы убедиться, что расписание сохранено
          await new Promise(resolve => setTimeout(resolve, 200));
          
          await generateSlots(response.schedule.id, weeksAhead);
        } catch (slotError) {
          console.error('Ошибка генерации слотов:', slotError);
        }
      }
      
      // Перезагружаем данные, чтобы увидеть созданные расписание и слоты
      await loadData();
      
      // Сброс формы
      setFormData({
        teacherId: '',
        subject: '',
        courseId: 1,
        dayOfWeek: 0, // 0 = Понедельник
        timeFrom: '',
        timeTo: '',
        capacity: 1
      });
      setWeeksAhead(4);
      
      setShowModal(false);
    } catch (err) {
      console.error('Ошибка при создании расписания:', err);
      setError(err.message || 'Ошибка при создании расписания');
    } finally {
      setCreatingSchedule(false);
    }
  };

  // Удаление расписания
  const handleDeleteSchedule = async (scheduleId) => {
    if (!confirm('Удалить это расписание? (Связанные слоты также будут удалены)')) return;
    
    try {
      setDeletingSchedule(scheduleId);
      await deleteTeacherSchedule(scheduleId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Ошибка при удалении расписания');
    } finally {
      setDeletingSchedule(null);
    }
  };

  // Просмотр слотов расписания
  const handleViewSlots = async (schedule) => {
    try {
      setLoadingSlots(schedule.id);
      const relatedSlots = await getScheduleSlots(schedule.id);
      setSelectedSchedule({ ...schedule, relatedSlots: relatedSlots || [] });
    } catch (err) {
      console.error('Ошибка при загрузке слотов:', err);
      setSelectedSchedule({ ...schedule, relatedSlots: [] });
    } finally {
      setLoadingSlots(null);
    }
  };

  // Получить предметы для выбранного курса (для формы расписания)
  const getSubjectsForCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.subjectIds) return [];
    return subjects.filter(s => course.subjectIds.includes(s.id));
  };

  // Получить предметы преподавателя
  const getTeacherSubjects = (teacherId) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.subjects : [];
  };

  const currentCourseSubjects = getSubjectsForCourse(formData.courseId).map(s => s.name);
  const currentTeacherSubjects = formData.teacherId ? getTeacherSubjects(formData.teacherId) : [];

  // Дни недели: 0 = Понедельник, 1 = Вторник, ..., 6 = Воскресенье
  const daysOfWeek = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  // Статистика
  const totalSchedules = schedules.length;
  const totalSlots = slots.length;
  const totalBookings = slots.reduce((sum, s) => sum + (s.students?.length || 0), 0);

  if (loading && schedules.length === 0) {
    return <div className={styles.container}>Загрузка...</div>;
  }

  return (
    <div className={styles.container}>
      {error && (
        <div style={{ padding: '10px', background: '#fee', color: '#c00', marginBottom: '20px' }}>
          Ошибка: {error}
        </div>
      )}

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
          Система автоматически создаёт слоты отработок на выбранный период (по умолчанию 4 недели). Студенты видят эти слоты и могут записываться.
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
                  const course = schedule.course || courses.find(c => c.id === schedule.courseId);
                  
                  return (
                    <tr key={schedule.id}>
                      <td>{teacher?.fio || schedule.teacher?.fio}</td>
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
                            disabled={loadingSlots === schedule.id}
                          >
                            {loadingSlots === schedule.id ? '⏳' : '📅'}
                          </button>
                          <button
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className={styles.actionButtonDanger}
                            title="Удалить расписание"
                            disabled={deletingSchedule === schedule.id}
                          >
                            {deletingSchedule === schedule.id ? '⏳' : '❌'}
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
        <div className={styles.modal} onClick={() => !generatedCredentials && !creatingTeacher && setShowTeacherModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {creatingTeacher && <Loader fullScreen message="Создание преподавателя..." />}
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
                        {subjects.map(subject => (
                          <option key={subject.id} value={subject.name}>{subject.name}</option>
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
                      disabled={creatingTeacher}
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className={styles.submitButton}
                      disabled={creatingTeacher}
                    >
                      {creatingTeacher ? 'Создание...' : 'Создать преподавателя'}
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
        <div className={styles.modal} onClick={() => !creatingSchedule && setShowModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {creatingSchedule && <Loader fullScreen message="Создание расписания и генерация слотов..." />}
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
                      .filter(subjectName => currentTeacherSubjects.includes(subjectName))
                      .map(subjectName => (
                        <option key={subjectName} value={subjectName}>{subjectName}</option>
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
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Период генерации слотов (недель)</label>
                  <select
                    value={weeksAhead}
                    onChange={(e) => setWeeksAhead(parseInt(e.target.value, 10))}
                    className={styles.input}
                  >
                    <option value={4}>4 недели</option>
                    <option value={8}>8 недель</option>
                    <option value={12}>12 недель</option>
                  </select>
                </div>
              </div>
              
              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={styles.cancelButton}
                  disabled={creatingSchedule}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={creatingSchedule}
                >
                  {creatingSchedule ? 'Создание...' : 'Создать расписание'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра слотов */}
      {selectedSchedule && (
        <div className={styles.modal} onClick={() => !loadingSlots && setSelectedSchedule(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {loadingSlots === selectedSchedule.id && (
              <Loader fullScreen message="Загрузка слотов..." />
            )}
            <h2 className={styles.modalTitle}>Слоты расписания</h2>
            <div className={styles.scheduleInfo}>
              <p><strong>{selectedSchedule.subject}</strong></p>
              <p>{daysOfWeek[selectedSchedule.dayOfWeek]} • {selectedSchedule.timeFrom} - {selectedSchedule.timeTo}</p>
            </div>
            <div className={styles.slotsList}>
              {!selectedSchedule.relatedSlots || selectedSchedule.relatedSlots.length === 0 ? (
                <p className={styles.emptyMessage}>Слоты ещё не созданы</p>
              ) : (
                selectedSchedule.relatedSlots.map(slot => (
                  <div key={slot.id} className={styles.slotItem}>
                    <div>
                      <strong>{new Date(slot.date).toLocaleDateString('ru-RU')}</strong>
                      <p className={styles.slotDetails}>Записано: {slot.students?.length || 0}/{slot.capacity}</p>
                    </div>
                    <button
                      type="button"
                      className={styles.actionButton}
                      title="Редактировать слот"
                      onClick={() => {
                        setEditingSlot(slot);
                        setSlotEditForm({
                          date: slot.date,
                          timeFrom: slot.timeFrom,
                          timeTo: slot.timeTo,
                          capacity: slot.capacity,
                          teacherId: slot.teacherId
                        });
                      }}
                    >
                      ✏️
                    </button>
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

      {/* Модальное окно редактирования слота */}
      {editingSlot && (
        <div className={styles.modal} onClick={() => updatingSlot !== editingSlot?.id && setEditingSlot(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            {updatingSlot === editingSlot?.id && (
              <Loader fullScreen message="Обновление слота..." />
            )}
            <h2 className={styles.modalTitle}>Редактировать слот</h2>
            <form
              className={styles.form}
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setUpdatingSlot(editingSlot.id);
                  const updates = {
                    date: slotEditForm.date,
                    timeFrom: slotEditForm.timeFrom,
                    timeTo: slotEditForm.timeTo,
                    capacity: slotEditForm.capacity,
                    teacherId: slotEditForm.teacherId
                  };
                  await updateSlotApi(editingSlot.id, updates);
                  // После успешного обновления полностью перезагружаем расписания и слоты,
                  // чтобы отразить возможное создание нового расписания/слота
                  await loadData();
                  setEditingSlot(null);
                  setSelectedSchedule(null);
                } catch (err) {
                  const message = err.response?.data?.error || err.message || 'Ошибка при обновлении слота';
                  console.error('Ошибка при обновлении слота:', err);
                  setError(message);
                } finally {
                  setUpdatingSlot(null);
                }
              }}
            >
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Преподаватель</label>
                  <select
                    value={slotEditForm.teacherId || ''}
                    onChange={(e) =>
                      setSlotEditForm(prev => ({
                        ...prev,
                        teacherId: e.target.value
                      }))
                    }
                    className={styles.input}
                  >
                    <option value="">Оставить без изменений</option>
                    {teachers
                      .filter(teacher =>
                        Array.isArray(teacher.subjects) &&
                        teacher.subjects.includes(editingSlot.subject)
                      )
                      .map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.fio}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Дата</label>
                  <input
                    type="date"
                    value={slotEditForm.date}
                    onChange={(e) =>
                      setSlotEditForm(prev => ({ ...prev, date: e.target.value }))
                    }
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Время с</label>
                  <input
                    type="time"
                    value={slotEditForm.timeFrom}
                    onChange={(e) =>
                      setSlotEditForm(prev => ({ ...prev, timeFrom: e.target.value }))
                    }
                    className={styles.input}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Время до</label>
                  <input
                    type="time"
                    value={slotEditForm.timeTo}
                    onChange={(e) =>
                      setSlotEditForm(prev => ({ ...prev, timeTo: e.target.value }))
                    }
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Макс. студентов</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={slotEditForm.capacity}
                    onChange={(e) =>
                      setSlotEditForm(prev => ({
                        ...prev,
                        capacity: parseInt(e.target.value, 10) || 1
                      }))
                    }
                    className={styles.input}
                    required
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={() => setEditingSlot(null)}
                  className={styles.cancelButton}
                  disabled={updatingSlot === editingSlot?.id}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={updatingSlot === editingSlot?.id}
                >
                  {updatingSlot === editingSlot?.id ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default OperatorSchedule;
