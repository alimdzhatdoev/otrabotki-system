// Начальная инициализация данных (админ, оператор и т.п.)
import { getUsers, saveUsers } from './fileDb.js';
import { generateId } from '../utils/idGenerator.js';

/**
 * Гарантирует наличие базовых учётных записей (админ, оператор)
 * Вызывается один раз при старте сервера.
 */
export async function bootstrapData() {
  const users = await getUsers();

  let changed = false;

  // Администратор системы
  const adminLogin = process.env.ADMIN_LOGIN || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';

  if (!users.find(u => u.role === 'admin')) {
    users.push({
      id: generateId('admin'),
      login: adminLogin,
      password: adminPassword,
      role: 'admin',
      fio: 'Администратор системы'
    });
    changed = true;
  }

  // Оператор
  const operatorLogin = process.env.OPERATOR_LOGIN || 'operator';
  const operatorPassword = process.env.OPERATOR_PASSWORD || 'operator';

  if (!users.find(u => u.role === 'operator')) {
    users.push({
      id: generateId('operator'),
      login: operatorLogin,
      password: operatorPassword,
      role: 'operator',
      fio: 'Оператор деканата'
    });
    changed = true;
  }

  if (changed) {
    await saveUsers(users);
  }
}

















