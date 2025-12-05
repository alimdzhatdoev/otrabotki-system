import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Настройка для корректной работы с путями
  base: '/',
  build: {
    // Копируем файл _redirects в dist для Render
    copyPublicDir: true,
  },
});



