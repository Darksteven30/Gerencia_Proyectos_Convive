/**
 * Generación y verificación de los códigos QR de acceso de visitantes (CU-42, CU-46, RN-05).
 * El código es "<nonce>.<firma>", donde la firma es un HMAC-SHA256 del nonce con QR_SECRET.
 * Un código alterado o inventado se rechaza antes de consultar la base de datos.
 */
import crypto from 'node:crypto';
import { env } from '../config/env';

const firmar = (nonce: string) => crypto.createHmac('sha256', env.qrSecret).update(nonce).digest('base64url').slice(0, 32);

export function generarCodigoQR(): string {
  const nonce = crypto.randomBytes(16).toString('base64url');
  return `${nonce}.${firmar(nonce)}`;
}

export function firmaQRValida(codigo: string): boolean {
  const [nonce, firma, ...resto] = codigo.trim().split('.');
  if (!nonce || !firma || resto.length > 0) return false;
  const esperada = Buffer.from(firmar(nonce));
  const recibida = Buffer.from(firma);
  return esperada.length === recibida.length && crypto.timingSafeEqual(esperada, recibida);
}
