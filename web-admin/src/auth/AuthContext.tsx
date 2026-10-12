/**
 * Contexto de autenticación: guarda el usuario en sesión y expone iniciar y cerrar sesión.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { alExpirarSesion, cerrarSesionRemota, iniciarSesion, sesion, type Rol, type UsuarioSesion } from '../api/client';
import { menuParaRoles } from '../rutas';

/** Roles con acceso al panel web (los habitantes usan la app móvil). */
export const ROLES_PANEL: Rol[] = ['ADMINISTRADOR', 'JUNTA', 'PORTERIA'];

interface ValorAuth {
  usuario: UsuarioSesion | null;
  /** Mensaje que se muestra en el login (por ejemplo, sesión expirada). */
  aviso: string | null;
  entrar: (correo: string, contrasena: string) => Promise<UsuarioSesion>;
  salir: () => Promise<void>;
  tieneRol: (...roles: Rol[]) => boolean;
  limpiarAviso: () => void;
}

const AuthContext = createContext<ValorAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(() => (sesion.accessToken() ? sesion.usuario() : null));
  const [aviso, setAviso] = useState<string | null>(null);

  // Si el cliente HTTP no logra renovar el token, se cierra la sesión en la interfaz
  useEffect(
    () =>
      alExpirarSesion(() => {
        setUsuario(null);
        setAviso('Su sesión expiró. Inicie sesión nuevamente.');
      }),
    [],
  );

  const entrar = useCallback(async (correo: string, contrasena: string) => {
    const r = await iniciarSesion(correo, contrasena);
    const esPanel = menuParaRoles(r.usuario.roles).length > 0;
    if (!esPanel) {
      // Usuario sin secciones en el panel (habitante): se cierra la sesión recién creada y no se conserva
      sesion.guardar(r);
      await cerrarSesionRemota();
      return r.usuario;
    }
    sesion.guardar(r);
    setAviso(null);
    setUsuario(r.usuario);
    return r.usuario;
  }, []);

  const salir = useCallback(async () => {
    await cerrarSesionRemota();
    setUsuario(null);
  }, []);

  const valor = useMemo<ValorAuth>(
    () => ({
      usuario,
      aviso,
      entrar,
      salir,
      tieneRol: (...roles: Rol[]) => !!usuario?.roles.some((r) => roles.includes(r)),
      limpiarAviso: () => setAviso(null),
    }),
    [usuario, aviso, entrar, salir],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
