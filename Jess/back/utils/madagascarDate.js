/**
 * Service centralisé pour la gestion des dates Madagascar (UTC+3 - Africa/Nairobi)
 * 
 * Ce service garantit que toutes les dates utilisées dans le système
 * sont basées sur le fuseau horaire de Madagascar, et non sur la date
 * du poste client.
 */

/**
 * Obtient la date actuelle en heure Madagascar (UTC+3)
 * @returns {Date} Date actuelle en heure Madagascar
 */
function getMadagascarDate() {
  // Créer une date avec le fuseau horaire Madagascar (UTC+3)
  // Madagascar utilise le fuseau horaire Africa/Nairobi (UTC+3)
  const now = new Date();
  
  // Obtenir l'heure UTC
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  
  // Ajouter 3 heures pour Madagascar (UTC+3)
  const madagascarTime = new Date(utcTime + (3 * 3600000));
  
  return madagascarTime;
}

/**
 * Obtient l'année actuelle en heure Madagascar
 * @returns {number} Année actuelle (ex: 2025)
 */
function getMadagascarYear() {
  return getMadagascarDate().getFullYear();
}

/**
 * Obtient le mois actuel en heure Madagascar (1-12)
 * @returns {number} Mois actuel (1 = janvier, 12 = décembre)
 */
function getMadagascarMonth() {
  return getMadagascarDate().getMonth() + 1; // getMonth() retourne 0-11
}

/**
 * Obtient le jour actuel en heure Madagascar (1-31)
 * @returns {number} Jour actuel
 */
function getMadagascarDay() {
  return getMadagascarDate().getDate();
}

/**
 * Obtient la date actuelle formatée en YYYY-MM-DD (heure Madagascar)
 * @returns {string} Date au format YYYY-MM-DD
 */
function getMadagascarDateString() {
  const date = getMadagascarDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Obtient le mois/année actuel formaté en YYYY-MM (heure Madagascar)
 * @returns {string} Mois/année au format YYYY-MM
 */
function getMadagascarMonthYear() {
  const year = getMadagascarYear();
  const month = String(getMadagascarMonth()).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Obtient le premier jour de l'année actuelle en format DATEONLY (YYYY-01-01)
 * Utilisé pour la date de convention
 * @returns {string} Date au format YYYY-01-01
 */
function getMadagascarCurrentYearDateOnly() {
  const year = getMadagascarYear();
  return `${year}-01-01`;
}

/**
 * Compare deux dates en ne regardant que le mois et l'année
 * @param {Date|string} date1 - Première date (Date ou string YYYY-MM-DD)
 * @param {Date|string} date2 - Deuxième date (Date ou string YYYY-MM-DD)
 * @returns {boolean} true si les mois/années sont identiques
 */
function compareMonthYear(date1, date2) {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  const year1 = d1.getFullYear();
  const month1 = d1.getMonth() + 1;
  
  const year2 = d2.getFullYear();
  const month2 = d2.getMonth() + 1;
  
  return year1 === year2 && month1 === month2;
}

/**
 * Vérifie si une date correspond au mois/année actuel en heure Madagascar
 * @param {Date|string} date - Date à vérifier (Date ou string YYYY-MM-DD)
 * @returns {boolean} true si la date correspond au mois/année actuel
 */
function isCurrentMonthYear(date) {
  const currentDate = getMadagascarDate();
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  return compareMonthYear(checkDate, currentDate);
}

/**
 * Obtient le dernier jour d'un mois donné
 * @param {number} year - Année
 * @param {number} month - Mois (1-12)
 * @returns {number} Dernier jour du mois (28-31)
 */
function getLastDayOfMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Formate une date en string YYYY-MM-DD
 * @param {Date} date - Date à formater
 * @returns {string} Date formatée
 */
function formatDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

module.exports = {
  getMadagascarDate,
  getMadagascarYear,
  getMadagascarMonth,
  getMadagascarDay,
  getMadagascarDateString,
  getMadagascarMonthYear,
  getMadagascarCurrentYearDateOnly,
  compareMonthYear,
  isCurrentMonthYear,
  getLastDayOfMonth,
  formatDateString
};

