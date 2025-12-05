// Middleware для обработки ошибок

export function errorHandler(err, req, res, next) {
  console.error('Ошибка:', err);

  // Ошибка валидации
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Ошибка базы данных (файловой)
  if (err.code === 'ENOENT') {
    return res.status(500).json({ error: 'Ошибка доступа к данным' });
  }

  // Общая ошибка сервера
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}


