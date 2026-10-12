/**
 * Hook para cargar datos de la API con estados de carga, error y "jalar para refrescar".
 * Por defecto vuelve a cargar cada vez que la pantalla recibe el foco.
 */
import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { mensajeError } from '../api/cliente';

export function useCarga<T>(cargar: () => Promise<T>, opciones: { alEnfocar?: boolean } = {}) {
  const { alEnfocar = true } = opciones;
  const [datos, setDatos] = useState<T | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const funcion = useRef(cargar);
  funcion.current = cargar;
  const primeraVez = useRef(true);

  const ejecutar = useCallback(async (modo: 'inicial' | 'refresco' | 'silencioso') => {
    if (modo === 'inicial') setCargando(true);
    if (modo === 'refresco') setRefrescando(true);
    try {
      setDatos(await funcion.current());
      setError(null);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (primeraVez.current) {
        primeraVez.current = false;
        void ejecutar('inicial');
      } else if (alEnfocar) {
        void ejecutar('silencioso');
      }
    }, [ejecutar, alEnfocar]),
  );

  const refrescar = useCallback(() => ejecutar('refresco'), [ejecutar]);
  const recargar = useCallback(() => ejecutar('inicial'), [ejecutar]);

  return { datos, setDatos, cargando, refrescando, error, refrescar, recargar };
}
