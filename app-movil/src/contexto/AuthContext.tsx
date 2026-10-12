/**
 * Contexto de sesión: usuario autenticado, perfil (/api/auth/me), inicio y cierre de sesión.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { almacenamientoPlataforma } from '../api/almacenamiento';
import {
  alCerrarseSesion,
  borrarSesion,
  cargarTokens,
  configurarAlmacenamiento,
  obtenerTokenRefresco,
} from '../api/cliente';
import { auth, Plataforma } from '../api/servicios';
import type { Perfil } from '../api/tipos';
import { registrarNotificacionesPush } from '../utils/push';

configurarAlmacenamiento(almacenamientoPlataforma);

interface ValorAuth {
  /** Perfil del usuario autenticado; null si no hay sesión. */
  perfil: Perfil | null;
  /** true mientras se restaura la sesión guardada al abrir la app. */
  iniciando: boolean;
  iniciarSesion: (correo: string, contrasena: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  recargarPerfil: () => Promise<void>;
  /** true si el usuario puede pagar las cuotas de la unidad (propietario o responsable de pago). */
  puedePagar: (idUnidad: number) => boolean;
}

const AuthContext = createContext<ValorAuth | null>(null);

const plataforma: Plataforma = Platform.OS === 'android' ? 'ANDROID' : Platform.OS === 'ios' ? 'IOS' : 'WEB';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [iniciando, setIniciando] = useState(true);

  // Si la renovación del token falla en cualquier petición, se vuelve a la pantalla de ingreso
  useEffect(() => {
    alCerrarseSesion(() => setPerfil(null));
    return () => alCerrarseSesion(null);
  }, []);

  // Restaurar la sesión guardada
  useEffect(() => {
    (async () => {
      try {
        if (await cargarTokens()) setPerfil(await auth.perfil());
      } catch {
        await borrarSesion();
        setPerfil(null);
      } finally {
        setIniciando(false);
      }
    })();
  }, []);

  const iniciarSesion = useCallback(async (correo: string, contrasena: string) => {
    await auth.iniciarSesion(correo, contrasena, plataforma, `App Convive (${Platform.OS})`);
    setPerfil(await auth.perfil());
    // Registro push opcional, sin bloquear el ingreso
    void registrarNotificacionesPush();
  }, []);

  const cerrarSesion = useCallback(async () => {
    const refresco = obtenerTokenRefresco();
    try {
      if (refresco) await auth.cerrarSesion(refresco);
    } catch {
      // Aunque el servidor no responda, la sesión local se cierra
    }
    await borrarSesion();
    setPerfil(null);
  }, []);

  const recargarPerfil = useCallback(async () => {
    setPerfil(await auth.perfil());
  }, []);

  const puedePagar = useCallback(
    (idUnidad: number) => {
      const u = perfil?.unidades.find((x) => x.idUnidad === idUnidad);
      return !!u && (u.esResponsablePago || u.tipoRelacion === 'PROPIETARIO');
    },
    [perfil],
  );

  const valor = useMemo(
    () => ({ perfil, iniciando, iniciarSesion, cerrarSesion, recargarPerfil, puedePagar }),
    [perfil, iniciando, iniciarSesion, cerrarSesion, recargarPerfil, puedePagar],
  );
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): ValorAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
