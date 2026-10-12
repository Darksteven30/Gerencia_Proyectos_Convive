/**
 * Paleta y medidas comunes de la interfaz de Convive (según los mockups de Figma del equipo).
 *
 * Contrastes verificados (WCAG AA, texto normal ≥ 4,5:1):
 * - texto #111111 sobre blanco ≈ 18,9:1; textoSecundario #5F6368 sobre blanco ≈ 6,0:1 (5,4:1 sobre grisClaro).
 * - textoSobreVerde #0B1F0F sobre verde #2DC653 ≈ 7,6:1 (el blanco sobre este verde no alcanza AA).
 * - enlace #0F7B74 sobre blanco ≈ 5,1:1 (4,5:1 sobre grisClaro).
 */
export const colores = {
  // Superficies
  fondo: '#FFFFFF',
  tarjeta: '#FFFFFF',
  borde: '#E6E6E6',
  grisClaro: '#F1F1F1',
  grisMedio: '#D9D9D9',
  // Texto
  texto: '#111111',
  textoSecundario: '#5F6368',
  textoTenue: '#8A8F98', // solo para elementos deshabilitados o decorativos (3,3:1)
  blanco: '#FFFFFF',
  negro: '#111111',
  // Marca
  turquesa: '#1BA39C',
  turquesaClaro: '#3CC6B9',
  turquesaOscuro: '#0F7B74',
  enlace: '#0F7B74',
  // Botón principal
  verde: '#2DC653',
  verdePresionado: '#25A845',
  textoSobreVerde: '#0B1F0F',
  // Estados
  exito: '#146C34', // 5,8:1 sobre grisClaro y exitoClaro
  exitoClaro: '#E7F8EC',
  peligro: '#C62828',
  peligroClaro: '#FDECEC',
  advertencia: '#9A4A07',
  advertenciaClaro: '#FFF4E0',
  info: '#0D47A1',
  infoClaro: '#E3F0FD',
  neutroClaro: '#F1F1F1',
  neutroTexto: '#3C3C3C',
  // Gráficos (paleta categórica validada para daltonismo; orden fijo)
  serie: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#E34948'],
  // Recaudado (verde) frente a pendiente (rojo): ΔE CVD 7,2, por eso siempre van con leyenda, orden fijo, separación y tabla
  graficoRecaudado: '#008300',
  graficoPendiente: '#E34948',
  rejilla: '#ECECEC',
};

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };

export const radio = { s: 8, m: 12, l: 16, xl: 24, pildora: 999 };

/** Área táctil mínima recomendada (WCAG 2.5.5 / guías de Android e iOS). */
export const TACTIL_MIN = 44;

export const sombra = {
  shadowColor: '#000000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 1,
} as const;
