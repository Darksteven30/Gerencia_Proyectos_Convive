/**
 * Paleta y medidas comunes de la interfaz de Convive.
 */
export const colores = {
  primario: '#1D4ED8',
  primarioOscuro: '#1E3A8A',
  primarioClaro: '#DBEAFE',
  primarioSuave: '#EFF6FF',
  fondo: '#F1F5F9',
  tarjeta: '#FFFFFF',
  texto: '#0F172A',
  textoSecundario: '#64748B',
  borde: '#E2E8F0',
  exito: '#15803D',
  exitoClaro: '#DCFCE7',
  peligro: '#B91C1C',
  peligroClaro: '#FEE2E2',
  advertencia: '#B45309',
  advertenciaClaro: '#FEF3C7',
  neutroClaro: '#E2E8F0',
  blanco: '#FFFFFF',
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const radio = { s: 8, m: 12, l: 16, xl: 24 };

export const sombra = {
  shadowColor: '#0F172A',
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const;
