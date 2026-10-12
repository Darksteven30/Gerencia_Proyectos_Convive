/**
 * Pruebas unitarias de los mecanismos de seguridad: códigos QR firmados (RN-05) y
 * verificación de las firmas de la pasarela de pagos (DS-02, flujo alterno A4).
 */
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { firmaSimulador, simulador, wompi } from '../src/services/pasarela';
import { firmaQRValida, generarCodigoQR } from '../src/services/qr';

describe('RN-05: código QR de visitantes', () => {
  it('acepta un código generado por el sistema', () => {
    expect(firmaQRValida(generarCodigoQR())).toBe(true);
  });

  it('genera códigos distintos y de longitud compatible con la columna (≤120)', () => {
    const a = generarCodigoQR();
    const b = generarCodigoQR();
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(120);
  });

  it('rechaza códigos alterados o inventados', () => {
    const codigo = generarCodigoQR();
    const [nonce, firma] = codigo.split('.');
    expect(firmaQRValida(`${nonce}x.${firma}`)).toBe(false);
    expect(firmaQRValida(`${nonce}.${firma.slice(0, -1)}A`)).toBe(false);
    expect(firmaQRValida('inventado')).toBe(false);
    expect(firmaQRValida(`${codigo}.extra`)).toBe(false);
  });
});

describe('Simulador de pasarela', () => {
  it('acepta eventos con firma válida', () => {
    const ev = simulador.validarEvento({ referencia: 'CNV-1', resultado: 'APROBADO', firma: firmaSimulador('CNV-1', 'APROBADO') });
    expect(ev).toEqual({ referencia: 'CNV-1', aprobado: true, estado: 'APROBADO' });
  });

  it('rechaza un resultado manipulado (A4: firma inválida)', () => {
    const firmaRechazo = firmaSimulador('CNV-1', 'RECHAZADO');
    expect(simulador.validarEvento({ referencia: 'CNV-1', resultado: 'APROBADO', firma: firmaRechazo })).toBeNull();
  });
});

describe('Wompi (sandbox)', () => {
  it('construye el checkout con la firma de integridad', () => {
    const { url } = wompi.crearCheckout({ referencia: 'CNV-9', valor: 368000, correo: 'a@b.co' });
    const p = new URL(url).searchParams;
    expect(p.get('amount-in-cents')).toBe('36800000');
    expect(p.get('currency')).toBe('COP');
    const esperada = crypto.createHash('sha256').update('CNV-936800000COPtest_integrity_secreto').digest('hex');
    expect(p.get('signature:integrity')).toBe(esperada);
  });

  it('valida el checksum de un evento transaction.updated', () => {
    const transaction = { id: '1234-5678', status: 'APPROVED', amount_in_cents: 36800000, reference: 'CNV-9' };
    const timestamp = 1791779790;
    const checksum = crypto
      .createHash('sha256')
      .update(`${transaction.id}${transaction.status}${transaction.amount_in_cents}${timestamp}test_events_secreto`)
      .digest('hex');
    const evento = {
      event: 'transaction.updated',
      data: { transaction },
      signature: { properties: ['transaction.id', 'transaction.status', 'transaction.amount_in_cents'], checksum },
      timestamp,
    };
    expect(wompi.validarEvento(evento)).toEqual({ referencia: 'CNV-9', aprobado: true, estado: 'APPROVED', idTransaccion: '1234-5678' });
    expect(wompi.validarEvento({ ...evento, signature: { ...evento.signature, checksum: 'abc' } })).toBeNull();
  });
});
