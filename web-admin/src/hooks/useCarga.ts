import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Carga datos asíncronos y expone los estados de carga, error y los datos.
 * `deps` controla cuándo se vuelve a ejecutar la carga (por ejemplo, al cambiar un filtro).
 */
export function useCarga<T>(cargar: () => Promise<T>, deps: unknown[] = []) {
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ultimo = useRef(0);

  const recargar = useCallback(async () => {
    const id = ++ultimo.current;
    setCargando(true);
    setError(null);
    try {
      const r = await cargar();
      if (id === ultimo.current) setDatos(r);
    } catch (e) {
      if (id === ultimo.current) setError(e instanceof Error ? e.message : 'Error inesperado');
    } finally {
      if (id === ultimo.current) setCargando(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, error, recargar, setDatos };
}

/** Ejecuta una acción (petición de escritura) controlando el estado "enviando" y el error. */
export function useAccion() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    setEnviando(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado');
      return undefined;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviando, error, setError, ejecutar };
}
