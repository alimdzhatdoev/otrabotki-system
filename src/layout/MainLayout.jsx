// Компонент: Главный layout только с topbar
import React from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import styles from './MainLayout.module.css';

function MainLayout() {
  return (
    <div className={styles.layout}>
      <Topbar />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

export default MainLayout;

