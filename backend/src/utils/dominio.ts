/**
 * Funciones puras con las reglas de negocio del dominio (Entrega 2, Tabla 13).
 * Se mantienen sin dependencias de base de datos para poder probarlas con pruebas unitarias.
 */

export const ZONA_HORARIA = 'America/Bogota';

/** Convierte "HH:MM" en un Date de 1970-01-01 (UTC), formato que Prisma usa para columnas TIME. */
export function horaATime(hhmm: string): Date {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) throw new Error(`Hora inválida: ${hhmm}`);
  return new Date(`1970-01-01T${hhmm}:00.000Z`);
}

/** Convierte un valor TIME leído de Prisma en "HH:MM". */
export function timeAHora(d: Date): string {
  return d.toISOString().slice(11, 16);
}

/** Convierte "AAAA-MM-DD" en un Date (UTC, medianoche), formato de las columnas DATE. */
export function fechaADate(fecha: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new Error(`Fecha inválida: ${fecha}`);
  return new Date(`${fecha}T00:00:00.000Z`);
}

/** Convierte un valor DATE leído de Prisma en "AAAA-MM-DD". */
export function dateAFecha(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Fecha y hora actuales en la zona horaria de Colombia. */
export function ahoraColombia(base: Date = new Date()): { fecha: string; hora: string } {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(base);
  const get = (t: string) => partes.find((p) => p.type === t)?.value ?? '00';
  return { fecha: `${get('year')}-${get('month')}-${get('day')}`, hora: `${get('hour')}:${get('minute')}` };
}

/** Minutos desde la medianoche para "HH:MM". */
export function minutos(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** RN-03 / RN-06: dos intervalos [a1, a2) y [b1, b2) se solapan. */
export function seSolapan(a1: number, a2: number, b1: number, b2: number): boolean {
  return a1 < b2 && b1 < a2;
}

/** Suma días hábiles (lunes a viernes) a una fecha. Usado para el plazo de PQRS (RN-04). */
export function sumarDiasHabiles(desde: Date, dias: number): Date {
  const d = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate()));
  let restantes = dias;
  while (restantes > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) restantes--;
  }
  return d;
}

/** Número de radicado de PQRS con formato PQ-AAAA-000123. */
export function numeroRadicado(anio: number, consecutivo: number): string {
  return `PQ-${anio}-${String(consecutivo).padStart(6, '0')}`;
}

/** Número de comprobante de pago consecutivo (RN-08). */
export function numeroComprobante(consecutivo: number): string {
  return `CP-${String(consecutivo).padStart(8, '0')}`;
}

/**
 * Distribuye el presupuesto mensual del conjunto entre las unidades según su coeficiente de
 * copropiedad (Ley 675 de 2001). Redondea a pesos y asigna la diferencia de redondeo a la
 * unidad de mayor coeficiente, de modo que la suma coincida exactamente con el presupuesto.
 */
export function distribuirPorCoeficiente(
  presupuesto: number,
  unidades: { id: number; coeficiente: number }[],
): Map<number, number> {
  const totalCoef = unidades.reduce((s, u) => s + u.coeficiente, 0);
  if (unidades.length === 0 || totalCoef <= 0) return new Map();
  const resultado = new Map<number, number>();
  let asignado = 0;
  for (const u of unidades) {
    const valor = Math.round((presupuesto * u.coeficiente) / totalCoef);
    resultado.set(u.id, valor);
    asignado += valor;
  }
  const diferencia = Math.round(presupuesto) - asignado;
  if (diferencia !== 0) {
    const mayor = unidades.reduce((a, b) => (b.coeficiente > a.coeficiente ? b : a));
    resultado.set(mayor.id, (resultado.get(mayor.id) ?? 0) + diferencia);
  }
  return resultado;
}

/** RN-02: estado de una cuota según su saldo y su fecha de vencimiento. */
export function estadoCuota(valor: number, saldo: number, vencimiento: string, hoy: string): string {
  if (saldo <= 0) return 'PAGADA';
  if (hoy > vencimiento) return 'VENCIDA';
  if (saldo < valor) return 'PARCIAL';
  return 'PENDIENTE';
}

/**
 * Aplica un valor pagado a una lista de cuotas en orden (la más antigua primero).
 * Devuelve el valor aplicado a cada cuota.
 */
export function aplicarPago(
  valorPagado: number,
  cuotas: { id: number; saldo: number }[],
): { id: number; aplicado: number }[] {
  let restante = valorPagado;
  const aplicaciones: { id: number; aplicado: number }[] = [];
  for (const c of cuotas) {
    if (restante <= 0) break;
    const aplicado = Math.min(restante, c.saldo);
    if (aplicado > 0) {
      aplicaciones.push({ id: c.id, aplicado });
      restante -= aplicado;
    }
  }
  return aplicaciones;
}

/** RN-01: política de bloqueo por intentos fallidos. */
export const MAX_INTENTOS_FALLIDOS = 5;
export const MINUTOS_BLOQUEO = 15;

export function evaluarIntentoFallido(intentosPrevios: number, ahora: Date) {
  const intentos = intentosPrevios + 1;
  if (intentos >= MAX_INTENTOS_FALLIDOS) {
    return { intentos, bloqueadoHasta: new Date(ahora.getTime() + MINUTOS_BLOQUEO * 60_000) };
  }
  return { intentos, bloqueadoHasta: null as Date | null };
}

/** Requisitos mínimos de contraseña (manual de usuario, sección 5.4). */
export function contrasenaValida(pwd: string): boolean {
  return pwd.length >= 8 && /[A-Z]/.test(pwd) && /\d/.test(pwd);
}
