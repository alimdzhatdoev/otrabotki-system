// Компонент: Верхняя панель с навигацией и информацией о пользователе
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Topbar.module.css';

function Topbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleInfo = () => {
    switch (currentUser.role) {
      case 'student':
        return { role: 'Студент', icon: '🎓', path: '/dashboard/student', label: 'Мои отработки' };
      case 'teacher':
        return { role: 'Преподаватель', icon: '👩‍🏫', path: '/dashboard/teacher', label: 'Мои отработки' };
      case 'operator':
        return { role: 'Оператор (Деканат)', icon: '🏫', path: '/dashboard/operator', label: 'Управление' };
      case 'admin':
        return { role: 'Администратор', icon: '⚙️', path: '/dashboard/admin', label: 'Панель управления' };
      default:
        return { role: '', icon: '', path: '', label: '' };
    }
  };

  const { role, icon, path, label } = getRoleInfo();

  return (
    <header className={styles.topbar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>📚</div>
        <div className={styles.logoText}>Отработки</div>
      </div>

      <nav className={styles.nav}>
        <NavLink
          to={path}
          end
          className={({ isActive }) =>
            isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
          }
        >
          {label}
        </NavLink>
        {currentUser.role === 'operator' && (
          <NavLink
            to="/dashboard/operator/courses"
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
            }
          >
            Курсы и предметы
          </NavLink>
        )}
      </nav>

      <div className={styles.rightSection}>
        <div className={styles.userInfo}>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{currentUser.fio}</div>
            <div className={styles.userRole}>
              <span className={styles.roleIcon}>{icon}</span>
              <span>{role}</span>
            </div>
          </div>
        </div>
        
        <button onClick={handleLogout} className={styles.logoutButton}>
          Выход
        </button>
      </div>
    </header>
  );
}

export default Topbar;

