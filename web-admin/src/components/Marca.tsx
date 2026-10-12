/**
 * Identidad visual compartida con la app móvil: logo de Convive (círculo turquesa con degradado
 * y casa blanca, igual a app-movil/src/componentes/Marca.tsx) e iconos SVG sencillos del menú.
 */
import { useId } from 'react';

/** Logo de Convive. Es decorativo por defecto; con `etiqueta` se anuncia como imagen. */
export function Logo({ tamano = 40, etiqueta }: { tamano?: number; etiqueta?: string }) {
  // Identificador único para que varios logos en la misma página no compartan el degradado
  const id = `degradado-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 100 100"
      role={etiqueta ? 'img' : undefined}
      aria-label={etiqueta}
      aria-hidden={etiqueta ? undefined : true}
      focusable="false"
      className="logo"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3CC6B9" />
          <stop offset="1" stopColor="#0F7B74" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      {/* Casa: techo a dos aguas, cuerpo y puerta */}
      <path d="M50 24 L76 46 L70 46 L70 74 L30 74 L30 46 L24 46 Z" fill="#FFFFFF" />
      <path d="M44 74 L44 58 Q44 55 47 55 L53 55 Q56 55 56 58 L56 74 Z" fill="#1BA39C" />
    </svg>
  );
}

/** Trazos (viewBox 24×24, línea de 2 px) de los iconos usados en el panel. */
const TRAZOS: Record<string, string> = {
  tablero: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
  finanzas: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  reportes: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h8M8 9h2',
  reservas: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 2v4M8 2v4M3 10h18',
  pqrs: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 9h8M8 13h5',
  noticias: 'M3 11l18-8v18L3 13zM11.6 16.8a3 3 0 1 1-5.8-1.6',
  usuarios: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  unidades: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4',
  acceso: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v.01M14 20h.01M20 20h1v1M17 17v4',
  visitas: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17 11l2 2 4-4M1 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2',
  parqueaderos: 'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM9 17V7h4a3 3 0 0 1 0 6H9',
  auditoria: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  conjunto: 'M4 21V10l8-6 8 6v11M9 21v-6h6v6',
  menu: 'M3 6h18M3 12h18M3 18h18',
  cerrar: 'M18 6 6 18M6 6l12 12',
  salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  subir: 'M12 19V5M5 12l7-7 7 7',
  bajar: 'M12 5v14M19 12l-7 7-7-7',
};

/** Icono de línea; si el nombre no existe muestra un punto para no romper la interfaz. */
export function Icono({ nombre, tamano = 18 }: { nombre: string; tamano?: number }) {
  const d = TRAZOS[nombre] ?? 'M12 12h.01';
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="icono"
    >
      <path d={d} />
    </svg>
  );
}
