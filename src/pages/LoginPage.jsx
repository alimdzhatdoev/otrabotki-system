// Компонент: Страница авторизации
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [formData, setFormData] = useState({
    login: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!formData.login || !formData.password) {
      setError('Заполните все поля');
      return;
    }

    const result = login(formData.login, formData.password);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Демо-подсказки
  const demoAccounts = [
    { role: '🎓 Студент', login: 'ivanov', password: '123' },
    { role: '👩‍🏫 Преподаватель', login: 'petrova', password: '123' },
    { role: '🏫 Оператор', login: 'operator', password: '123' },
    { role: '⚙️ Админ', login: 'admin', password: '123' }
  ];

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
          <h2 className={styles.formTitle}>Вход в систему</h2>
          
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.error}>{error}</div>
            )}
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Логин</label>
              <input
                type="text"
                name="login"
                value={formData.login}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите логин"
                autoFocus
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Пароль</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={styles.input}
                placeholder="Введите пароль"
              />
            </div>
            
            <button type="submit" className={styles.submitButton}>
              Войти
            </button>
          </form>

          <div className={styles.demo}>
            <p className={styles.demoTitle}>Демо-аккаунты для тестирования:</p>
            <div className={styles.demoGrid}>
              {demoAccounts.map((account, index) => (
                <div
                  key={index}
                  className={styles.demoCard}
                  onClick={() => setFormData({ login: account.login, password: account.password })}
                >
                  <div className={styles.demoRole}>{account.role}</div>
                  <div className={styles.demoCredentials}>
                    {account.login} / {account.password}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;



