/**
 * Contador de notificaciones no leídas (se muestra en la pestaña "Avisos").
 * Se refresca al iniciar sesión, cada minuto y cuando la app vuelve al primer plano.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { notificaciones } from '../api/servicios';
import { useAuth } from './AuthContext';

interface ValorNotificaciones {
  noLeidas: number;
  refrescarContador: () => Promise<void>;
  fijarNoLeidas: (n: number) => void;
}

const NotificacionesContext = createContext<ValorNotificaciones>({
  noLeidas: 0,
  refrescarContador: async () => undefined,
  fijarNoLeidas: () => undefined,
});

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const { perfil } = useAuth();
  const [noLeidas, setNoLeidas] = useState(0);

  const refrescarContador = useCallback(async () => {
    if (!perfil) return;
    try {
      const b = await notificaciones.bandeja();
      setNoLeidas(b.no_leidas);
    } catch {
      // El contador es informativo; los errores se muestran en la bandeja
    }
  }, [perfil]);

  useEffect(() => {
    if (!perfil) {
      setNoLeidas(0);
      return;
    }
    void refrescarContador();
    const intervalo = setInterval(refrescarContador, 60_000);
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') void refrescarContador();
    });
    return () => {
      clearInterval(intervalo);
      sub.remove();
    };
  }, [perfil, refrescarContador]);

  const valor = useMemo(() => ({ noLeidas, refrescarContador, fijarNoLeidas: setNoLeidas }), [noLeidas, refrescarContador]);
  return <NotificacionesContext.Provider value={valor}>{children}</NotificacionesContext.Provider>;
}

export const useNotificaciones = () => useContext(NotificacionesContext);
