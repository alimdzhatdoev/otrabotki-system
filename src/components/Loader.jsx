import React from 'react';
import styles from './Loader.module.css';

/**
 * Универсальный компонент лоадера
 * @param {string} message - Текст сообщения (опционально)
 * @param {string} size - Размер лоадера: 'small', 'medium', 'large' (по умолчанию 'medium')
 * @param {boolean} fullScreen - Показывать ли на весь экран (по умолчанию false)
 */
function Loader({ message, size = 'medium', fullScreen = false }) {
  const containerClass = fullScreen 
    ? `${styles.container} ${styles.fullScreen}`
    : styles.container;

  return (
    <div className={containerClass}>
      <div className={`${styles.spinner} ${styles[size]}`}></div>
      {message && <div className={styles.message}>{message}</div>}
    </div>
  );
}

export default Loader;

