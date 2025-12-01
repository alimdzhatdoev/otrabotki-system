// Компонент: Страница авторизации и регистрации
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl } from '@mui/material';
import styles from './LoginPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' или 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Данные для входа
  const [loginData, setLoginData] = useState({
    login: '',
    password: ''
  });
  
  // Данные для регистрации
  const [registerData, setRegisterData] = useState({
    password: '',
    email: '',
    studentCardNumber: '',
    fio: '',
    group: '',
    course: ''
  });

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!loginData.login || !loginData.password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    const result = await login(loginData.login, loginData.password);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Валидация
    if (!registerData.password || !registerData.email || 
        !registerData.studentCardNumber || !registerData.fio || 
        !registerData.group || !registerData.course) {
      setError('Заполните все поля');
      return;
    }

    if (registerData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    const result = await register(registerData);
    setLoading(false);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.logoSection}>
          <div className={styles.logoIcon}>📚</div>
          <h1 className={styles.logoTitle}>Система Отработки</h1>
          <p className={styles.logoSubtitle}>
            Управление отработками для медицинского института
          </p>
        </div>
        
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>✓</span>
            <span>Удобная запись на отработки</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>✓</span>
            <span>Автоматический контроль лимитов</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>✓</span>
            <span>Календарь свободных слотов</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>✓</span>
            <span>Отслеживание посещаемости</span>
          </div>
        </div>
      </div>

      <div className={styles.rightPanel}>
        <div className={styles.formCard}>
          {/* Переключатель режима */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'login' ? styles.active : ''}`}
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Вход
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${mode === 'register' ? styles.active : ''}`}
              onClick={() => {
                setMode('register');
                setError('');
              }}
            >
              Регистрация
            </button>
          </div>

          {mode === 'login' ? (
            <>
              <h2 className={styles.formTitle}>Вход в систему</h2>
              
              <form onSubmit={handleLoginSubmit} className={styles.form}>
                {error && (
                  <div className={styles.error}>{error}</div>
                )}
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Логин / Email</label>
                  <input
                    type="text"
                    name="login"
                    value={loginData.login}
                    onChange={handleLoginChange}
                    className={styles.input}
                    placeholder="Введите логин или email"
                    autoFocus
                    disabled={loading}
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Пароль</label>
                  <input
                    type="password"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className={styles.input}
                    placeholder="Введите пароль"
                    disabled={loading}
                  />
                </div>
                
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>

            </>
          ) : (
            <>
              <h2 className={styles.formTitle}>Регистрация студента</h2>
              <p className={styles.registerHint}>
                Регистрация доступна только для студентов. Укажите номер зачетки для подтверждения личности.
              </p>
              
              <form onSubmit={handleRegisterSubmit} className={styles.form}>
                {error && (
                  <div className={styles.error}>{error}</div>
                )}
                
                {/* ФИО и Номер зачетки */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>ФИО *</label>
                    <input
                      type="text"
                      name="fio"
                      value={registerData.fio}
                      onChange={handleRegisterChange}
                      className={styles.input}
                      placeholder="Иванов Иван Иванович"
                      disabled={loading}
                      required
                    />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Номер зачетки *</label>
                    <input
                      type="text"
                      name="studentCardNumber"
                      value={registerData.studentCardNumber}
                      onChange={handleRegisterChange}
                      className={styles.input}
                      placeholder="123456"
                      disabled={loading}
                      required
                    />
                    <small className={styles.hint}>Уникальный номер</small>
                  </div>
                </div>

                {/* Курс и Группа */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Курс *</label>
                    <FormControl fullWidth className={styles.selectWrapper}>
                      <Select
                        name="course"
                        value={registerData.course}
                        onChange={handleRegisterChange}
                        disabled={loading}
                        required
                        className={styles.select}
                        sx={{
                          backgroundColor: '#1A2140',
                          color: '#FFFFFF',
                          height: '48px',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.04)',
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5B5FFF',
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#5B5FFF',
                          },
                          '& .MuiSvgIcon-root': {
                            color: '#A5B4FC',
                          },
                        }}
                        MenuProps={{
                          PaperProps: {
                            sx: {
                              backgroundColor: '#1A2140',
                              color: '#FFFFFF',
                              '& .MuiMenuItem-root': {
                                color: '#FFFFFF',
                                '&:hover': {
                                  backgroundColor: 'rgba(91, 95, 255, 0.2)',
                                },
                                '&.Mui-selected': {
                                  backgroundColor: '#5B5FFF',
                                  '&:hover': {
                                    backgroundColor: '#4A4FDD',
                                  },
                                },
                              },
                            },
                          },
                        }}
                      >
                        <MenuItem value="">Выберите курс</MenuItem>
                        <MenuItem value="1">1 курс</MenuItem>
                        <MenuItem value="2">2 курс</MenuItem>
                        <MenuItem value="3">3 курс</MenuItem>
                        <MenuItem value="4">4 курс</MenuItem>
                        <MenuItem value="5">5 курс</MenuItem>
                        <MenuItem value="6">6 курс</MenuItem>
                      </Select>
                    </FormControl>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Группа *</label>
                    <input
                      type="text"
                      name="group"
                      value={registerData.group}
                      onChange={handleRegisterChange}
                      className={styles.input}
                      placeholder="М-21-1"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {/* Email и Пароль */}
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={registerData.email}
                      onChange={handleRegisterChange}
                      className={styles.input}
                      placeholder="ivanov@example.com"
                      disabled={loading}
                      required
                    />
                    <small className={styles.hint}>Email для входа</small>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Пароль *</label>
                    <input
                      type="password"
                      name="password"
                      value={registerData.password}
                      onChange={handleRegisterChange}
                      className={styles.input}
                      placeholder="Минимум 6 символов"
                      disabled={loading}
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;



