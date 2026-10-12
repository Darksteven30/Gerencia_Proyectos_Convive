/** Utilidades de formato para Colombia (moneda COP, fechas es-CO). */

const cop = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const numero = new Intl.NumberFormat('es-CO');

export const formatoCOP = (v: number | string | null | undefined) => (v === null || v === undefined || v === '' ? '—' : cop.format(Number(v)));
export const formatoNumero = (v: number | null | undefined) => (v === null || v === undefined ? '—' : numero.format(v));

/** Formatea una fecha AAAA-MM-DD (sin zona horaria) en formato es-CO. */
export function formatoFecha(valor: string | null | undefined): string {
  if (!valor) return '—';
  const soloFecha = /^\d{4}-\d{2}-\d{2}$/.test(valor);
  // Las fechas sin hora se interpretan como fecha local para no desplazarlas un día
  const d = soloFecha ? new Date(`${valor}T00:00:00`) : new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Formatea una marca de tiempo ISO en fecha y hora de Colombia. */
export function formatoFechaHora(valor: string | null | undefined): string {
  if (!valor) return '—';
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Fecha de hoy en Colombia en formato AAAA-MM-DD. */
export function hoyColombia(): string {
  // en-CA produce el formato AAAA-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/** Periodo actual AAAA-MM en Colombia. */
export const periodoActual = () => hoyColombia().slice(0, 7);

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Convierte un valor de input datetime-local (hora de Colombia) a ISO con desfase -05:00. */
export function localColombiaAISO(valor: string): string {
  return `${valor.length === 16 ? valor + ':00' : valor}-05:00`;
}

/** Texto legible para un valor enumerado: EN_TRAMITE → En trámite. */
const ETIQUETAS: Record<string, string> = {
  EN_TRAMITE: 'En trámite',
  PREREGISTRADA: 'Pre-registrada',
  PETICION: 'Petición',
  ADMINISTRADOR: 'Administrador',
  PORTERIA: 'Portería',
  INTERES_MORA: 'Interés de mora',
};
export function etiqueta(valor: string | null | undefined): string {
  if (!valor) return '—';
  if (ETIQUETAS[valor]) return ETIQUETAS[valor];
  const t = valor.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}
