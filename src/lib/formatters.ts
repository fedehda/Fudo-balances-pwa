// src/lib/formatters.ts

/**
 * Formatea un monto numérico a moneda ARS según especificación:
 * new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount);
 */
export function formatCurrencyARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formatea una fecha ISO o string (YYYY-MM-DD) a formato corto para reportes: DD/MM
 */
export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin fecha';
  try {
    // Si viene en formato YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parts[2].substring(0, 2);
      const month = parts[1];
      return `${day}/${month}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch {
    return dateStr;
  }
}

/**
 * Limpia y normaliza un número de teléfono a solo dígitos.
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Formatea el tiempo relativo transcurrido en español (ej: "Hace 4 minutos", "Recién")
 */
export function formatRelativeTime(isoString: string): string {
  if (!isoString) return 'Desconocido';
  try {
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return 'Recién';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Recién';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  } catch {
    return 'Desconocido';
  }
}
