/** Definición del menú lateral y de los roles que pueden ver cada sección. */
import type { Rol } from './api/client';

export interface ItemMenu {
  ruta: string;
  titulo: string;
  icono: string;
  roles: Rol[];
  grupo: 'General' | 'Gestión' | 'Portería' | 'Sistema';
}

const R = { A: 'ADMINISTRADOR', J: 'JUNTA', P: 'PORTERIA' } satisfies Record<string, Rol>;

export const MENU: ItemMenu[] = [
  { ruta: '/tablero', titulo: 'Tablero', icono: '▦', roles: [R.A, R.J], grupo: 'General' }, // @RF-09
  { ruta: '/finanzas', titulo: 'Finanzas', icono: '$', roles: [R.A], grupo: 'Gestión' }, // @RF-02
  { ruta: '/reservas', titulo: 'Reservas', icono: '◷', roles: [R.A], grupo: 'Gestión' }, // @RF-03
  { ruta: '/pqrs', titulo: 'PQRS', icono: '✉', roles: [R.A, R.J], grupo: 'General' }, // @RF-04
  { ruta: '/noticias', titulo: 'Noticias', icono: '✦', roles: [R.A, R.J], grupo: 'General' }, // @RF-05
  { ruta: '/usuarios', titulo: 'Usuarios', icono: '☺', roles: [R.A], grupo: 'Gestión' }, // @RF-01
  { ruta: '/unidades', titulo: 'Unidades y torres', icono: '⌂', roles: [R.A], grupo: 'Gestión' }, // @RF-09
  { ruta: '/auditoria', titulo: 'Auditoría', icono: '⚑', roles: [R.A], grupo: 'Sistema' }, // @RF-09
  { ruta: '/conjunto', titulo: 'Conjunto', icono: '⚙', roles: [R.A], grupo: 'Sistema' }, // @RF-09
];

export const menuParaRoles = (roles: Rol[]) => MENU.filter((m) => m.roles.some((r) => roles.includes(r)));

/** Primera ruta disponible para el usuario (página de inicio tras el login). */
export const rutaInicial = (roles: Rol[]) => menuParaRoles(roles)[0]?.ruta ?? '/login';
