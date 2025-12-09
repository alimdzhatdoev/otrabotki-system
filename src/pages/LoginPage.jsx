// Компонент: Страница авторизации и регистрации
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Select, MenuItem, FormControl } from '@mui/material';
import styles from './LoginPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const { login, register, firstSetup } = useAuth();
  
  const [mode, setMode] = useState('login'); // 'login' или 'register'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [setupData, setSetupData] = useState({
    course: '',
    newPassword: ''
  });
  const [showMemo, setShowMemo] = useState(false);
  const [memoDontShow, setMemoDontShow] = useState(false);
  
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
    } else if (result.needsSetup) {
      setNeedsSetup(true);
      setPendingUser({ login: loginData.login, oldPassword: loginData.password, fio: result.user?.fio });
    } else {
      setError(result.message);
    }
  };

  // Показать памятку при загрузке, если не скрыта
  useEffect(() => {
    const hidden = localStorage.getItem('hideAuthMemo') === '1';
    if (!hidden) setShowMemo(true);
  }, []);

  const handleCloseMemo = () => {
    if (memoDontShow) {
      localStorage.setItem('hideAuthMemo', '1');
    }
    setShowMemo(false);
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

  const handleFirstSetup = async (e) => {
    e.preventDefault();
    setError('');
    if (!setupData.course || !setupData.newPassword) {
      setError('Укажите курс и новый пароль');
      return;
    }
    if (setupData.newPassword.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }
    setLoading(true);
    const result = await firstSetup({
      login: pendingUser.login,
      oldPassword: pendingUser.oldPassword,
      newPassword: setupData.newPassword,
      course: setupData.course
    });
    setLoading(false);
    if (result.success) {
      setNeedsSetup(false);
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
      {showMemo && (
        <div className={styles.memoOverlay}>
          <div className={styles.memoModal}>
            <h3 className={styles.memoTitle}>Важно: вход для студентов</h3>
            <ol className={styles.memoList}>
              <li>Регистрацию отключили — вход только по выданным данным.</li>
              <li>По умолчанию логин и пароль студента = номеру его зачетки.</li>
              <li>Если логин совпадает с паролем и курс не указан, при первом входе появится окно: введите курс и новый пароль.</li>
              <li>Без ввода курса и нового пароля дальше не пустит.</li>
            </ol>
            <label className={styles.memoCheckbox}>
              <input
                type="checkbox"
                checked={memoDontShow}
                onChange={(e) => setMemoDontShow(e.target.checked)}
              />
              <span>Больше не показывать</span>
            </label>
            <button className={styles.memoButton} onClick={handleCloseMemo}>
              Понятно
            </button>
          </div>
        </div>
      )}
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
          {needsSetup ? (
            <>
              <h2 className={styles.formTitle}>Первый вход</h2>
              <p className={styles.registerHint}>
                Для продолжения укажите курс и придумайте новый пароль.
              </p>
              <form onSubmit={handleFirstSetup} className={styles.form}>
                {error && (
                  <div className={styles.error}>{error}</div>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>ФИО</label>
                  <div className={styles.input} style={{ background: 'rgba(255,255,255,0.05)' }}>
                    {pendingUser?.fio || pendingUser?.login}
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Курс</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={setupData.course}
                    onChange={(e) => setSetupData(prev => ({ ...prev, course: e.target.value }))}
                    className={styles.input}
                    placeholder="Введите курс"
                    disabled={loading}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Новый пароль</label>
                  <input
                    type="password"
                    value={setupData.newPassword}
                    onChange={(e) => setSetupData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className={styles.input}
                    placeholder="Минимум 6 символов"
                    disabled={loading}
                  />
                </div>
                <button type="submit" className={styles.submitButton} disabled={loading}>
                  {loading ? 'Сохранение...' : 'Сохранить и войти'}
                </button>
              </form>
            </>
          ) : (
        <>
          {/* Переключатель режима - закомментирован */}
          {/* <div className={styles.modeToggle}>
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
          </div> */}

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

          {/* Регистрация закомментирована */}
        </>
      )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;



