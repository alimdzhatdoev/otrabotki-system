// Компонент: Боковое меню навигации
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Sidebar.module.css';

function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!currentUser) return null;

  // Меню для разных ролей
  const menuItems = {
    student: [
      { path: '/dashboard/student', label: 'Мои отработки', icon: '🎓' }
    ],
    operator: [
      { path: '/dashboard/operator', label: 'Управление слотами', icon: '📋' }
    ],
    admin: [
      { path: '/dashboard/admin', label: 'Настройки системы', icon: '⚙️' }
    ],
    teacher: [
      { path: '/dashboard/teacher', label: 'Мои отработки', icon: '👩‍🏫' }
    ]
  };

  const items = menuItems[currentUser.role] || [];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>📚</div>
        <h2 className={styles.logoText}>Отработки</h2>
      </div>
      <nav className={styles.nav}>
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className={styles.footer}>
        <button onClick={handleLogout} className={styles.logoutButton}>
          <span className={styles.navIcon}>🚪</span>
          <span className={styles.navLabel}>Выход</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;

