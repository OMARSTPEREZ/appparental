/**
 * Format timestamp or ISO string to friendly relative time in Spanish.
 * Examples: "Ahora mismo", "Hace 2 min", "Hace 1 h", "Ayer 4:15 PM", "12 Oct"
 */
export const formatRelativeTime = (isoString?: string | number): string => {
  if (!isoString) return 'Reciente';

  const date = typeof isoString === 'number' ? new Date(isoString) : new Date(isoString);
  const timestamp = date.getTime();
  if (isNaN(timestamp)) return 'Reciente';

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 60) {
    return 'Ahora mismo';
  }
  if (diffMin < 60) {
    return `Hace ${diffMin} min`;
  }
  if (diffHours < 24) {
    return `Hace ${diffHours} h`;
  }

  // Format 12h time string with AM/PM
  const hours = date.getHours();
  const mins = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  const timeStr = `${hour12}:${mins} ${ampm}`;

  const now = new Date();
  const isYesterday =
    now.getDate() - date.getDate() === 1 &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  if (isYesterday) {
    return `Ayer ${timeStr}`;
  }

  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate()} ${months[date.getMonth()]} • ${timeStr}`;
};
