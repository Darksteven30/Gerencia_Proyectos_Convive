/**
 * Selector de la unidad residencial cuando el usuario tiene más de una.
 */
import React from 'react';
import type { UnidadPerfil } from '../api/tipos';
import { Opciones } from './ui';

export const nombreUnidad = (u: UnidadPerfil) => (u.torre ? `${u.torre} - ${u.numero}` : u.numero);

export function SelectorUnidad({
  unidades,
  valor,
  alCambiar,
}: {
  unidades: UnidadPerfil[];
  valor: number | null;
  alCambiar: (id: number) => void;
}) {
  if (unidades.length <= 1) return null;
  return (
    <Opciones
      etiqueta="Unidad"
      opciones={unidades.map((u) => ({ valor: u.idUnidad, texto: nombreUnidad(u) }))}
      valor={valor}
      alCambiar={alCambiar}
    />
  );
}
