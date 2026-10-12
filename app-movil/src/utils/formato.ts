/**
 * Utilidades de formato y validación (moneda COP, fechas y horas de Colombia).
 */

const formatoPesos = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatoCOP(valor: number | null | undefined): string {
  return formatoPesos.format(Number(valor ?? 0));
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Fecha AAAA-MM-DD → "28 oct 2026". */
export function formatoFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—';
  const [a, m, d] = fecha.slice(0, 10).split('-').map(Number);
  if (!a || !m || !d) return fecha;
  return `${d} ${MESES[m - 1]} ${a}`;
}

/** Periodo AAAA-MM → "octubre 2026". */
export function formatoPeriodo(periodo: string): string {
  const [a, m] = periodo.split('-').map(Number);
  if (!a || !m) return periodo;
  return `${MESES_LARGOS[m - 1]} ${a}`;
}

/** Desplaza una marca de tiempo UTC a la hora de Colombia (UTC-5, sin horario de verano). */
function aColombia(fecha: Date): Date {
  return new Date(fecha.getTime() - 5 * 3600_000);
}

/** Marca de tiempo ISO → "28 oct 2026, 14:05" (hora de Colombia). */
export function formatoFechaHora(iso: string | null | undefined): string {
  if (!iso) return '—';
  const f = new Date(iso);
  if (isNaN(f.getTime())) return iso;
  const c = aColombia(f).toISOString();
  return `${formatoFecha(c.slice(0, 10))}, ${c.slice(11, 16)}`;
}

/** Fecha de hoy en Colombia (AAAA-MM-DD). */
export function hoyColombia(): string {
  return aColombia(new Date()).toISOString().slice(0, 10);
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const f = new Date(`${fecha}T12:00:00Z`);
  f.setUTCDate(f.getUTCDate() + dias);
  return f.toISOString().slice(0, 10);
}

export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const f = new Date(`${fecha}T12:00:00Z`);
  return !isNaN(f.getTime()) && f.toISOString().slice(0, 10) === fecha;
}

export function horaValida(hora: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);
}

/** "HH:MM" → minutos desde la medianoche. */
export function minutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

/** Política de contraseñas de la API: 8 caracteres, una mayúscula y un número. */
export function contrasenaSegura(c: string): boolean {
  return c.length >= 8 && /[A-Z]/.test(c) && /\d/.test(c);
}

export function correoValido(c: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
}

/** Texto con la primera letra en mayúscula y el resto en minúscula ("EN_TRAMITE" → "En trámite"). */
export function etiquetaEstado(estado: string): string {
  const especiales: Record<string, string> = {
    EN_TRAMITE: 'En trámite',
    PETICION: 'Petición',
    PREREGISTRADA: 'Pre-registrada',
  };
  if (especiales[estado]) return especiales[estado];
  const t = estado.replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Máscara de entrada para horas: "1430" → "14:30". */
export function mascaraHora(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
}

/** Máscara de entrada para fechas: "20261028" → "2026-10-28". */
export function mascaraFecha(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8);
  if (d.length > 6) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`;
  if (d.length > 4) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return d;
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

/** Etiqueta corta de un día para los selectores: "Hoy", "Mañana" o "mié 14". */
export function etiquetaDia(fecha: string): string {
  const hoy = hoyColombia();
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDias(hoy, 1)) return 'Mañana';
  const f = new Date(`${fecha}T12:00:00Z`);
  return `${DIAS[f.getUTCDay()]} ${f.getUTCDate()}`;
}
