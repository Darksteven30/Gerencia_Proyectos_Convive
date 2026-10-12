/**
 * Pasarela de pagos encapsulada tras una interfaz (Entrega 2, criterio de bajo acoplamiento;
 * respuesta al riesgo R07). Dos implementaciones:
 *  - simulador: checkout propio servido por la API (plan de contingencia de R07/R21).
 *  - wompi: Web Checkout de Wompi en modo sandbox, con firma de integridad y verificación
 *    de la firma de los eventos (webhook).
 */
import crypto from 'node:crypto';
import { env } from '../config/env';

export interface SolicitudCheckout {
  referencia: string;
  valor: number; // COP
  correo: string;
}

export interface ResultadoEvento {
  referencia: string;
  aprobado: boolean;
  estado: string;
  idTransaccion?: string;
}

export interface PasarelaPago {
  nombre: string;
  crearCheckout(s: SolicitudCheckout): { url: string };
  /** Valida la firma del evento recibido y lo traduce. Devuelve null si la firma es inválida (DS-02, A4). */
  validarEvento(body: unknown): ResultadoEvento | null;
}

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');

export const simulador: PasarelaPago = {
  nombre: 'SIMULADOR',
  crearCheckout(s) {
    return { url: `${env.publicApiUrl}/api/pagos/simulador/${encodeURIComponent(s.referencia)}` };
  },
  validarEvento(body) {
    const b = body as { referencia?: string; resultado?: string; firma?: string };
    if (!b?.referencia || !b.resultado) return null;
    if (b.firma !== firmaSimulador(b.referencia, b.resultado)) return null;
    return { referencia: b.referencia, aprobado: b.resultado === 'APROBADO', estado: b.resultado };
  },
};

/** Firma HMAC que el simulador incluye en su "webhook" para imitar una confirmación firmada. */
export function firmaSimulador(referencia: string, resultado: string) {
  return crypto.createHmac('sha256', env.jwtSecret).update(`${referencia}|${resultado}`).digest('hex');
}

export const wompi: PasarelaPago = {
  nombre: 'WOMPI',
  crearCheckout(s) {
    const centavos = Math.round(s.valor * 100);
    const firma = sha256(`${s.referencia}${centavos}COP${env.wompi.integritySecret}`);
    const params = new URLSearchParams({
      'public-key': env.wompi.publicKey,
      currency: 'COP',
      'amount-in-cents': String(centavos),
      reference: s.referencia,
      'signature:integrity': firma,
      'customer-data:email': s.correo,
    });
    if (env.wompi.redirectUrl) params.set('redirect-url', env.wompi.redirectUrl);
    return { url: `https://checkout.wompi.co/p/?${params.toString()}` };
  },
  validarEvento(body) {
    type EventoWompi = {
      event?: string;
      data?: { transaction?: Record<string, unknown> };
      signature?: { properties?: string[]; checksum?: string };
      timestamp?: number;
    };
    const ev = body as EventoWompi;
    const tx = ev?.data?.transaction;
    if (!tx || !ev.signature?.properties || !ev.signature.checksum || ev.timestamp === undefined) return null;
    // checksum = SHA256(valores de las propiedades indicadas + timestamp + secreto de eventos)
    const valores = ev.signature.properties
      .map((p) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], ev.data))
      .join('');
    const esperado = sha256(`${valores}${ev.timestamp}${env.wompi.eventsSecret}`);
    if (esperado.toUpperCase() !== ev.signature.checksum.toUpperCase()) return null;
    const estado = String(tx.status);
    return {
      referencia: String(tx.reference),
      aprobado: estado === 'APPROVED',
      estado,
      idTransaccion: String(tx.id),
    };
  },
};

export const pasarela: PasarelaPago = env.paymentProvider === 'wompi' ? wompi : simulador;
