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
  { ruta: '/usuarios', titulo: 'Usuarios', icono: '☺', roles: [R.A], grupo: 'Gestión' }, // @RF-01
];

export const menuParaRoles = (roles: Rol[]) => MENU.filter((m) => m.roles.some((r) => roles.includes(r)));

/** Primera ruta disponible para el usuario (página de inicio tras el login). */
export const rutaInicial = (roles: Rol[]) => menuParaRoles(roles)[0]?.ruta ?? '/login';
