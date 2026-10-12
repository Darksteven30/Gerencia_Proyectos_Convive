/**
 * Pruebas unitarias de las reglas de negocio del dominio (Entrega 2, Tabla 13).
 */
import { describe, expect, it } from 'vitest';
import {
  ahoraColombia,
  aplicarPago,
  contrasenaValida,
  dateAFecha,
  distribuirPorCoeficiente,
  estadoCuota,
  evaluarIntentoFallido,
  fechaADate,
  horaATime,
  MAX_INTENTOS_FALLIDOS,
  numeroComprobante,
  numeroRadicado,
  seSolapan,
  sumarDiasHabiles,
  timeAHora,
} from '../src/utils/dominio';

describe('RN-01: bloqueo por intentos fallidos', () => {
  const ahora = new Date('2026-10-12T15:00:00Z');

  it('no bloquea antes del quinto intento', () => {
    for (let previos = 0; previos < MAX_INTENTOS_FALLIDOS - 1; previos++) {
      expect(evaluarIntentoFallido(previos, ahora).bloqueadoHasta).toBeNull();
    }
  });

  it('bloquea 15 minutos al quinto intento consecutivo', () => {
    const r = evaluarIntentoFallido(4, ahora);
    expect(r.intentos).toBe(5);
    expect(r.bloqueadoHasta?.toISOString()).toBe('2026-10-12T15:15:00.000Z');
  });
});

describe('Política de contraseñas', () => {
  it.each([
    ['Admin#2026', true],
    ['Clave1234', true],
    ['corta1A', false],
    ['sinmayuscula1', false],
    ['SinNumero', false],
  ])('%s → %s', (pwd, esperado) => expect(contrasenaValida(pwd)).toBe(esperado));
});

describe('RN-02: estado de la cuota', () => {
  it('PAGADA cuando el saldo es cero', () => expect(estadoCuota(100, 0, '2026-10-10', '2026-10-20')).toBe('PAGADA'));
  it('VENCIDA cuando pasó la fecha y hay saldo', () => expect(estadoCuota(100, 100, '2026-10-10', '2026-10-11')).toBe('VENCIDA'));
  it('PARCIAL cuando hay abono y no ha vencido', () => expect(estadoCuota(100, 40, '2026-10-10', '2026-10-10')).toBe('PARCIAL'));
  it('PENDIENTE cuando no hay abono y no ha vencido', () => expect(estadoCuota(100, 100, '2026-10-10', '2026-10-01')).toBe('PENDIENTE'));
});

describe('Distribución de la cuota por coeficiente (Ley 675 de 2001)', () => {
  it('la suma coincide exactamente con el presupuesto', () => {
    const unidades = [
      { id: 1, coeficiente: 0.115 },
      { id: 2, coeficiente: 0.11 },
      { id: 3, coeficiente: 0.14 },
      { id: 4, coeficiente: 0.135 },
      { id: 5, coeficiente: 0.5 },
    ];
    const r = distribuirPorCoeficiente(3_333_333, unidades);
    const suma = [...r.values()].reduce((a, b) => a + b, 0);
    expect(suma).toBe(3_333_333);
    expect(r.get(5)).toBeGreaterThan(r.get(1)!);
  });

  it('reparte proporcionalmente aunque los coeficientes no sumen 1', () => {
    const r = distribuirPorCoeficiente(1000, [
      { id: 1, coeficiente: 1 },
      { id: 2, coeficiente: 3 },
    ]);
    expect(r.get(1)).toBe(250);
    expect(r.get(2)).toBe(750);
  });

  it('sin unidades no genera cuotas', () => expect(distribuirPorCoeficiente(1000, []).size).toBe(0));
});

describe('Aplicación de pagos manuales a las cuotas más antiguas', () => {
  it('cubre primero la cuota más antigua y abona el resto', () => {
    const r = aplicarPago(150, [
      { id: 1, saldo: 100 },
      { id: 2, saldo: 100 },
    ]);
    expect(r).toEqual([
      { id: 1, aplicado: 100 },
      { id: 2, aplicado: 50 },
    ]);
  });

  it('no aplica más del saldo de cada cuota', () => {
    const r = aplicarPago(500, [{ id: 1, saldo: 120 }]);
    expect(r).toEqual([{ id: 1, aplicado: 120 }]);
  });
});

describe('RN-03 y RN-06: solapamiento de franjas', () => {
  it('detecta cruces parciales y totales', () => {
    expect(seSolapan(600, 720, 660, 780)).toBe(true); // 10-12 vs 11-13
    expect(seSolapan(600, 720, 540, 840)).toBe(true); // contenida
  });
  it('franjas contiguas no se solapan', () => {
    expect(seSolapan(600, 720, 720, 840)).toBe(false); // 10-12 y 12-14
    expect(seSolapan(600, 720, 480, 600)).toBe(false);
  });
});

describe('RN-04: plazo de respuesta de PQRS en días hábiles', () => {
  it('15 días hábiles desde un lunes terminan el lunes de la tercera semana', () => {
    expect(dateAFecha(sumarDiasHabiles(fechaADate('2026-10-12'), 15))).toBe('2026-11-02');
  });
  it('omite sábados y domingos', () => {
    expect(dateAFecha(sumarDiasHabiles(fechaADate('2026-10-16'), 1))).toBe('2026-10-19'); // viernes → lunes
  });
});

describe('Consecutivos (RN-08 y radicado de PQRS)', () => {
  it('formatea el radicado de PQRS', () => expect(numeroRadicado(2026, 123)).toBe('PQ-2026-000123'));
  it('formatea el comprobante de pago', () => expect(numeroComprobante(7)).toBe('CP-00000007'));
});

describe('Conversión de fechas y horas', () => {
  it('ida y vuelta de columnas TIME', () => expect(timeAHora(horaATime('08:45'))).toBe('08:45'));
  it('ida y vuelta de columnas DATE', () => expect(dateAFecha(fechaADate('2026-12-31'))).toBe('2026-12-31'));
  it('rechaza formatos inválidos', () => {
    expect(() => horaATime('8:45')).toThrow();
    expect(() => fechaADate('2026/12/31')).toThrow();
  });
  it('hora de Colombia (UTC-5)', () => {
    expect(ahoraColombia(new Date('2026-10-12T03:30:00Z'))).toEqual({ fecha: '2026-10-11', hora: '22:30' });
  });
});
