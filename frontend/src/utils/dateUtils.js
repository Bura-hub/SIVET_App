/**
 * Utilidades para manejo de fechas en zona horaria de Colombia
 * Zona horaria: America/Bogota (UTC-5)
 */

// Zona horaria de Colombia
const COLOMBIA_TIMEZONE = 'America/Bogota';

/**
 * Obtiene la fecha actual en zona horaria de Colombia
 * @returns {Date} Fecha actual en Colombia
 */
export const getCurrentDateInColombia = () => {
  return new Date().toLocaleString("en-US", {timeZone: COLOMBIA_TIMEZONE});
};

/**
 * Convierte una fecha a zona horaria de Colombia
 * @param {Date|string} date - Fecha a convertir
 * @returns {Date} Fecha en zona horaria de Colombia
 */
export const toColombiaTime = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.toLocaleString("en-US", {timeZone: COLOMBIA_TIMEZONE}));
};

/**
 * Formatea una fecha para envío a la API (formato YYYY-MM-DD)
 * @param {Date} date - Fecha a formatear
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
export const formatDateForAPI = (date) => {
  const colombiaDate = toColombiaTime(date);
  return colombiaDate.toISOString().split('T')[0];
};

/**
 * Formatea una fecha para mostrar en la interfaz (formato DD/MM/YYYY)
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha en formato DD/MM/YYYY
 */
export const formatDateForDisplay = (date) => {
  const colombiaDate = toColombiaTime(date);
  const day = String(colombiaDate.getDate()).padStart(2, '0');
  const month = String(colombiaDate.getMonth() + 1).padStart(2, '0');
  const year = colombiaDate.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Obtiene el primer día del mes actual en Colombia
 * @returns {Date} Primer día del mes actual
 */
export const getCurrentMonthStart = () => {
  const now = new Date();
  const colombiaDate = toColombiaTime(now);
  return new Date(colombiaDate.getFullYear(), colombiaDate.getMonth(), 1);
};

/**
 * Obtiene el último día del mes actual en Colombia
 * @returns {Date} Último día del mes actual
 */
export const getCurrentMonthEnd = () => {
  const now = new Date();
  const colombiaDate = toColombiaTime(now);
  return new Date(colombiaDate.getFullYear(), colombiaDate.getMonth() + 1, 0);
};

/**
 * Obtiene el último día del mes anterior en Colombia
 * @returns {Date} Último día del mes anterior
 */
export const getPreviousMonthEnd = () => {
  const now = new Date();
  const colombiaDate = toColombiaTime(now);
  return new Date(colombiaDate.getFullYear(), colombiaDate.getMonth(), 0);
};

/**
 * Obtiene el primer día del mes anterior en Colombia
 * @returns {Date} Primer día del mes anterior
 */
export const getPreviousMonthStart = () => {
  const now = new Date();
  const colombiaDate = toColombiaTime(now);
  return new Date(colombiaDate.getFullYear(), colombiaDate.getMonth() - 1, 1);
};

/**
 * Convierte una fecha ISO string a fecha en Colombia
 * @param {string} isoString - Fecha en formato ISO
 * @returns {Date} Fecha en zona horaria de Colombia
 */
export const parseISODateToColombia = (isoString) => {
  return toColombiaTime(new Date(isoString));
};

/**
 * Obtiene la fecha actual en Colombia como string ISO
 * @returns {string} Fecha actual en formato ISO
 */
export const getCurrentDateISO = () => {
  const colombiaDate = toColombiaTime(new Date());
  return colombiaDate.toISOString();
};

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {Date} date1 - Primera fecha
 * @param {Date} date2 - Segunda fecha
 * @returns {number} Diferencia en días
 */
export const getDaysDifference = (date1, date2) => {
  const colombiaDate1 = toColombiaTime(date1);
  const colombiaDate2 = toColombiaTime(date2);
  const diffTime = Math.abs(colombiaDate2 - colombiaDate1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Verifica si una fecha es hoy en Colombia
 * @param {Date|string} date - Fecha a verificar
 * @returns {boolean} True si es hoy
 */
export const isTodayInColombia = (date) => {
  const colombiaDate = toColombiaTime(date);
  const today = toColombiaTime(new Date());
  return colombiaDate.toDateString() === today.toDateString();
}; 