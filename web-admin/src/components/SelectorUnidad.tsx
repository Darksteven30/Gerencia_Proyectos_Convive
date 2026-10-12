/** Lista desplegable de unidades residenciales del conjunto (GET /api/admin/unidades). */
import { http } from '../api/client';
import type { Unidad } from '../api/tipos';
import { useCarga } from '../hooks/useCarga';

export const nombreUnidad = (u: Pick<Unidad, 'torre' | 'numero'>) => `${u.torre ? u.torre + ' - ' : ''}${u.numero}`;

export function SelectorUnidad({
  valor,
  onCambio,
  requerido,
  opcionVacia = 'Seleccione una unidad',
}: {
  valor: string;
  onCambio: (v: string) => void;
  requerido?: boolean;
  opcionVacia?: string;
}) {
  const { datos, cargando, error } = useCarga(() => http.get<Unidad[]>('/api/admin/unidades'));
  return (
    <select value={valor} onChange={(e) => onCambio(e.target.value)} required={requerido} disabled={cargando}>
      <option value="">{cargando ? 'Cargando unidades…' : error ? 'Error al cargar unidades' : opcionVacia}</option>
      {datos?.map((u) => (
        <option key={u.id_unidad} value={u.id_unidad}>
          {nombreUnidad(u)}
        </option>
      ))}
    </select>
  );
}
