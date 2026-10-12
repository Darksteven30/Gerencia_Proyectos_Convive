/**
 * Utilidades del pago en línea (RF-02): apertura del checkout y agrupación de cuotas por concepto.
 */
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { API_URL } from '../api/cliente';
import type { Cuota } from '../api/tipos';
import { avisar } from './dialogos';

/**
 * El simulador de pagos del backend arma la URL con su PUBLIC_API_URL (por defecto localhost).
 * Si la app usa otra dirección (p. ej. la IP local desde un teléfono), se reemplaza el origen
 * para que el checkout abra en el dispositivo.
 */
export function ajustarUrlCheckout(url: string): string {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
  if (local.test(url) && !local.test(API_URL)) return url.replace(local, API_URL);
  return url;
}

/** Abre el checkout: en web, en una pestaña nueva; en el teléfono, en el navegador del sistema. */
export async function abrirCheckout(url: string) {
  if (Platform.OS === 'web') {
    const ventana = globalThis.open?.(url, '_blank');
    if (!ventana) avisar('Ventana bloqueada', 'Permita las ventanas emergentes o use el botón "Abrir pasarela de pago".');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export type ClaveConcepto = 'ADMINISTRACION' | 'EXTRAORDINARIA' | 'OTROS';

/** Conceptos del paso 1 del pago, en el orden del mockup. */
export const CONCEPTOS_PAGO: { clave: ClaveConcepto; nombre: string; conceptos: string[] }[] = [
  { clave: 'ADMINISTRACION', nombre: 'Cuota de administración', conceptos: ['ORDINARIA'] },
  { clave: 'EXTRAORDINARIA', nombre: 'Cuota extraordinaria', conceptos: ['EXTRAORDINARIA'] },
  { clave: 'OTROS', nombre: 'Otros conceptos', conceptos: ['MULTA', 'INTERES_MORA'] },
];

/** Clave del grupo al que pertenece una cuota (los conceptos desconocidos van a "Otros conceptos"). */
export function grupoDeCuota(c: Pick<Cuota, 'concepto'>): ClaveConcepto {
  return CONCEPTOS_PAGO.find((g) => g.conceptos.includes(c.concepto))?.clave ?? 'OTROS';
}
