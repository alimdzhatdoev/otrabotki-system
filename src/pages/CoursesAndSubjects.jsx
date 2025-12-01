// Компонент: Управление курсами и предметами для оператора
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  getCourses,
  getSubjects,
  createSubject,
  createCourse,
  updateCourse,
  deleteSubjectFromCourse,
  addSubjectsToCourse,
  deleteCourse
} from '../api/operatorApi';
import { Autocomplete, TextField, Chip } from '@mui/material';
import styles from './CoursesAndSubjects.module.css';

function CoursesAndSubjects() {
  const { currentUser } = useAuth();
  const [courses, setCourses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Состояние для управления курсами и предметами
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedSubjectsForCourse, setSelectedSubjectsForCourse] = useState([]);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showAddSubjectsModal, setShowAddSubjectsModal] = useState(null); // ID курса, для которого открыт модал

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

      // Загружаем предметы
      const subjectsData = await getSubjects();
      setSubjects(subjectsData);
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

  // Создание предмета
  const handleCreateSubject = async (e) => {
    e.preventDefault();
    if (!newSubjectName.trim()) {
      alert('Введите название предмета');
      return;
    }
    try {
      await createSubject({ name: newSubjectName.trim() });
      setNewSubjectName('');
      await loadData();
      alert('Предмет создан!');
    } catch (err) {
      alert(err.message || 'Ошибка при создании предмета');
    }
  };

  // Создание нового курса (автоматический номер)
  const handleCreateNewCourse = async () => {
    try {
      // Создаем курс с пустым массивом предметов (можно будет добавить позже)
      // Номер курса генерируется автоматически на бэкенде
      await createCourse({ subjectIds: [] });
      await loadData();
    } catch (err) {
      alert(err.message || 'Ошибка при создании курса');
    }
  };

  // Обновление курса (редактирование)
  const handleUpdateCourse = async (courseId) => {
    if (selectedSubjectsForCourse.length === 0) {
      alert('Выберите хотя бы один предмет');
      return;
    }
    try {
      await updateCourse(courseId, { 
        subjectIds: selectedSubjectsForCourse.map(s => s.id) 
      });
      setEditingCourse(null);
      setSelectedSubjectsForCourse([]);
      await loadData();
      alert('Курс обновлён!');
    } catch (err) {
      alert(err.message || 'Ошибка при обновлении курса');
    }
  };

  // Удаление курса
  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Удалить этот курс? Все предметы будут удалены из курса.')) return;
    try {
      await deleteCourse(courseId);
      await loadData();
      alert('Курс удалён!');
    } catch (err) {
      alert(err.message || 'Ошибка при удалении курса');
    }
  };

  // Удаление предмета из курса
  const handleDeleteSubjectFromCourse = async (courseId, subjectId) => {
    if (!confirm('Удалить предмет из курса?')) return;
    try {
      await deleteSubjectFromCourse(courseId, subjectId);
      await loadData();
    } catch (err) {
      alert(err.message || 'Ошибка при удалении предмета');
    }
  };

  // Добавление предметов к курсу
  const handleAddSubjectsToCourse = async (courseId) => {
    if (selectedSubjectsForCourse.length === 0) {
      alert('Выберите хотя бы один предмет');
      return;
    }
    try {
      await addSubjectsToCourse(courseId, selectedSubjectsForCourse.map(s => s.id));
      setShowAddSubjectsModal(null);
      setSelectedSubjectsForCourse([]);
      await loadData();
      alert('Предметы добавлены к курсу!');
    } catch (err) {
      alert(err.message || 'Ошибка при добавлении предметов');
    }
  };

  // Начать редактирование курса
  const startEditCourse = (course) => {
    setEditingCourse(course);
    // Загружаем предметы курса
    const courseSubjects = subjects.filter(s => course.subjectIds?.includes(s.id));
    setSelectedSubjectsForCourse(courseSubjects);
  };

  // Открыть модал добавления предметов
  const openAddSubjectsModal = (course) => {
    setShowAddSubjectsModal(course.id);
    // Показываем только те предметы, которых еще нет в курсе
    const courseSubjectIds = course.subjectIds || [];
    const availableSubjects = subjects.filter(s => !courseSubjectIds.includes(s.id));
    setSelectedSubjectsForCourse([]);
  };

  // Получить предметы для выбранного курса
  const getSubjectsForCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course || !course.subjectIds) return [];
    return subjects.filter(s => course.subjectIds.includes(s.id));
  };

  // Получить доступные предметы для добавления (те, которых еще нет в курсе)
  const getAvailableSubjectsForCourse = (courseId) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return subjects;
    const courseSubjectIds = course.subjectIds || [];
    return subjects.filter(s => !courseSubjectIds.includes(s.id));
  };

  if (loading && courses.length === 0 && subjects.length === 0) {
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
        <h1 className={styles.title}>📚 Курсы и предметы</h1>
      </div>

      {/* Создание предмета */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Создать предмет</h2>
        <form onSubmit={handleCreateSubject} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Название предмета</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                placeholder="Введите название предмета"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                className={styles.input}
                style={{ flex: 1 }}
                required
              />
              <button type="submit" className={styles.submitButton} style={{ whiteSpace: 'nowrap' }}>
                Создать предмет
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Список курсов */}
      <div className={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 className={styles.cardTitle}>Список курсов</h2>
          <button
            onClick={handleCreateNewCourse}
            className={styles.addButtonSmall}
            title="Добавить курс"
          >
            +
          </button>
        </div>
        <div className={styles.coursesList}>
          {courses.length === 0 ? (
            <p className={styles.emptyMessage}>Нет курсов. Создайте первый курс!</p>
          ) : (
            courses.map((course) => {
              const courseSubjects = getSubjectsForCourse(course.id);
              const isEditing = editingCourse?.id === course.id;
              return (
                <div key={course.id} className={styles.courseItem}>
                  <div className={styles.courseHeader}>
                    <h4 className={styles.courseName}>{course.name}</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => startEditCourse(course)}
                        className={styles.editButton}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className={styles.deleteButton}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </div>
                  
                  {/* Редактирование курса */}
                  {isEditing && (
                    <div className={styles.editForm}>
                      <div className={styles.formGroup}>
                        <label className={styles.label}>Предметы</label>
                        <Autocomplete
                          multiple
                          options={subjects}
                          getOptionLabel={(option) => option.name}
                          value={selectedSubjectsForCourse}
                          onChange={(event, newValue) => {
                            setSelectedSubjectsForCourse(newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              placeholder="Выберите предметы"
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  backgroundColor: '#1A2140',
                                  color: '#FFFFFF',
                                  '& fieldset': {
                                    borderColor: 'rgba(255, 255, 255, 0.04)',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: '#5B5FFF',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: '#5B5FFF',
                                  },
                                },
                                '& .MuiInputBase-input': {
                                  color: '#FFFFFF',
                                },
                                '& .MuiInputBase-input::placeholder': {
                                  color: 'rgba(255, 255, 255, 0.5)',
                                },
                              }}
                            />
                          )}
                          renderTags={(value, getTagProps) =>
                            value.map((option, index) => (
                              <Chip
                                {...getTagProps({ index })}
                                key={option.id}
                                label={option.name}
                                sx={{
                                  backgroundColor: '#5B5FFF',
                                  color: '#FFFFFF',
                                  '& .MuiChip-deleteIcon': {
                                    color: '#FFFFFF',
                                  },
                                }}
                              />
                            ))
                          }
                          componentsProps={{
                            popper: {
                              sx: {
                                zIndex: 2000,
                                '& .MuiPaper-root': {
                                  backgroundColor: '#1A2140 !important',
                                  color: '#FFFFFF !important',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  '& .MuiAutocomplete-listbox': {
                                    backgroundColor: '#1A2140',
                                    color: '#FFFFFF',
                                    '& .MuiAutocomplete-option': {
                                      backgroundColor: '#1A2140',
                                      color: '#FFFFFF !important',
                                      '&:hover': {
                                        backgroundColor: 'rgba(91, 95, 255, 0.3) !important',
                                      },
                                      '&[aria-selected="true"]': {
                                        backgroundColor: '#5B5FFF !important',
                                        color: '#FFFFFF !important',
                                      },
                                      '&.Mui-focused': {
                                        backgroundColor: 'rgba(91, 95, 255, 0.2) !important',
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          }}
                          ListboxProps={{
                            sx: {
                              backgroundColor: '#1A2140',
                              color: '#FFFFFF',
                              '& .MuiAutocomplete-option': {
                                backgroundColor: '#1A2140',
                                color: '#FFFFFF !important',
                                '&:hover': {
                                  backgroundColor: 'rgba(91, 95, 255, 0.3) !important',
                                },
                                '&[aria-selected="true"]': {
                                  backgroundColor: '#5B5FFF !important',
                                  color: '#FFFFFF !important',
                                },
                                '&.Mui-focused': {
                                  backgroundColor: 'rgba(91, 95, 255, 0.2) !important',
                                },
                              },
                            },
                          }}
                        />
                      </div>
                      <div className={styles.formActions}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCourse(null);
                            setSelectedSubjectsForCourse([]);
                          }}
                          className={styles.cancelButton}
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleUpdateCourse(course.id)}
                          className={styles.submitButton}
                        >
                          Сохранить изменения
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Список предметов курса */}
                  <div className={styles.subjectsList}>
                    {courseSubjects.length === 0 ? (
                      <p className={styles.emptyMessage}>Нет предметов</p>
                    ) : (
                      courseSubjects.map(subject => (
                        <div key={subject.id} className={styles.subjectTag}>
                          <span>{subject.name}</span>
                          <button
                            onClick={() => handleDeleteSubjectFromCourse(course.id, subject.id)}
                            className={styles.deleteSubjectButton}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Кнопка добавить предмет */}
                  {!isEditing && (
                    <button
                      onClick={() => openAddSubjectsModal(course)}
                      className={styles.addSubjectButton}
                    >
                      + Добавить предмет
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Модальное окно добавления предметов */}
      {showAddSubjectsModal && (
        <div className={styles.modal} onClick={() => setShowAddSubjectsModal(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Добавить предметы к курсу</h2>
            <div className={styles.formGroup}>
              <label className={styles.label}>Выберите предметы</label>
              <Autocomplete
                multiple
                options={getAvailableSubjectsForCourse(showAddSubjectsModal)}
                getOptionLabel={(option) => option.name}
                value={selectedSubjectsForCourse}
                onChange={(event, newValue) => {
                  setSelectedSubjectsForCourse(newValue);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Выберите предметы"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#1A2140',
                        color: '#FFFFFF',
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.04)',
                        },
                        '&:hover fieldset': {
                          borderColor: '#5B5FFF',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#5B5FFF',
                        },
                      },
                      '& .MuiInputBase-input': {
                        color: '#FFFFFF',
                      },
                      '& .MuiInputBase-input::placeholder': {
                        color: 'rgba(255, 255, 255, 0.5)',
                      },
                    }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.id}
                      label={option.name}
                      sx={{
                        backgroundColor: '#5B5FFF',
                        color: '#FFFFFF',
                        '& .MuiChip-deleteIcon': {
                          color: '#FFFFFF',
                        },
                      }}
                    />
                  ))
                }
                componentsProps={{
                  popper: {
                    sx: {
                      zIndex: 2000,
                      '& .MuiPaper-root': {
                        backgroundColor: '#1A2140 !important',
                        color: '#FFFFFF !important',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        '& .MuiAutocomplete-listbox': {
                          backgroundColor: '#1A2140',
                          color: '#FFFFFF',
                          '& .MuiAutocomplete-option': {
                            backgroundColor: '#1A2140',
                            color: '#FFFFFF !important',
                            '&:hover': {
                              backgroundColor: 'rgba(91, 95, 255, 0.3) !important',
                            },
                            '&[aria-selected="true"]': {
                              backgroundColor: '#5B5FFF !important',
                              color: '#FFFFFF !important',
                            },
                            '&.Mui-focused': {
                              backgroundColor: 'rgba(91, 95, 255, 0.2) !important',
                            },
                          },
                        },
                      },
                    },
                  },
                }}
                ListboxProps={{
                  sx: {
                    backgroundColor: '#1A2140',
                    color: '#FFFFFF',
                    '& .MuiAutocomplete-option': {
                      backgroundColor: '#1A2140',
                      color: '#FFFFFF !important',
                      '&:hover': {
                        backgroundColor: 'rgba(91, 95, 255, 0.3) !important',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: '#5B5FFF !important',
                        color: '#FFFFFF !important',
                      },
                      '&.Mui-focused': {
                        backgroundColor: 'rgba(91, 95, 255, 0.2) !important',
                      },
                    },
                  },
                }}
              />
            </div>
            <div className={styles.formActions}>
              <button
                type="button"
                onClick={() => {
                  setShowAddSubjectsModal(null);
                  setSelectedSubjectsForCourse([]);
                }}
                className={styles.cancelButton}
              >
                Отмена
              </button>
              <button
                onClick={() => handleAddSubjectsToCourse(showAddSubjectsModal)}
                className={styles.submitButton}
              >
                Добавить предметы
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CoursesAndSubjects;
