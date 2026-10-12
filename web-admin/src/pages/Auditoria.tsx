/** Bitácora de auditoría (CU-09) con filtros por acción, entidad y cantidad de registros. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { EventoAuditoria } from '../api/tipos';
import { Badge, Campo, Contenido, EncabezadoPagina } from '../components/ui';
import { useCarga } from '../hooks/useCarga';
import { formatoFechaHora } from '../utils/formato';

const ACCIONES = [
  'LOGIN_EXITOSO',
  'LOGIN_FALLIDO',
  'CREAR',
  'ACTUALIZAR',
  'ELIMINAR',
  'PUBLICAR',
  'ARCHIVAR',
  'ASIGNAR',
  'RESPONDER',
  'CERRAR',
  'CANCELAR',
  'LIBERAR',
  'INGRESO_AUTORIZADO',
  'INGRESO_DENEGADO',
  'SALIDA',
  'LIQUIDAR_INTERESES',
];

/** El detalle llega como texto JSON; se muestra de forma compacta. */
function textoDetalle(detalle: unknown): string {
  if (detalle === null || detalle === undefined || detalle === '') return '—';
  let valor = detalle;
  if (typeof detalle === 'string') {
    try {
      valor = JSON.parse(detalle);
    } catch {
      return detalle;
    }
  }
  if (valor && typeof valor === 'object') {
    return Object.entries(valor as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ');
  }
  return String(valor);
}

const tonoAccion = (a: string) => (/FALLIDO|DENEGADO|ELIMINAR|CANCELAR/.test(a) ? 'rojo' : /EXITOSO|AUTORIZADO|CREAR|PUBLICAR/.test(a) ? 'verde' : 'azul');

export function Auditoria() {
  const [accion, setAccion] = useState('');
  const [entidad, setEntidad] = useState('');
  const [entidadAplicada, setEntidadAplicada] = useState('');
  const [limite, setLimite] = useState('100');
  const { datos, cargando, error, recargar } = useCarga(() => {
    const q = new URLSearchParams({ limite });
    if (accion) q.set('accion', accion);
    if (entidadAplicada) q.set('entidad', entidadAplicada);
    return http.get<EventoAuditoria[]>(`/api/admin/auditoria?${q}`);
  }, [accion, entidadAplicada, limite]);

  const aplicar = (e: FormEvent) => {
    e.preventDefault();
    setEntidadAplicada(entidad.trim());
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Auditoría"
        descripcion="Bitácora de eventos del sistema (inicio de sesión, cambios y accesos)"
        acciones={
          <button className="btn btn-sec" onClick={recargar} disabled={cargando}>
            Actualizar
          </button>
        }
      />
      <form className="filtros" onSubmit={aplicar}>
        <Campo etiqueta="Acción">
          <select value={accion} onChange={(e) => setAccion(e.target.value)}>
            <option value="">Todas</option>
            {ACCIONES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Entidad">
          <input list="entidades" value={entidad} onChange={(e) => setEntidad(e.target.value)} onBlur={() => setEntidadAplicada(entidad.trim())} placeholder="usuario, pqrs, visita…" />
          <datalist id="entidades">
            {['usuario', 'pqrs', 'visita', 'noticia', 'pago', 'cuota_administracion', 'reserva', 'zona_comun', 'bloqueo_zona', 'parqueadero', 'unidad_residencial', 'torre', 'conjunto'].map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
        </Campo>
        <Campo etiqueta="Registros">
          <select value={limite} onChange={(e) => setLimite(e.target.value)}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="250">250</option>
            <option value="500">500</option>
          </select>
        </Campo>
        <button className="btn btn-sec" type="submit">
          Filtrar
        </button>
      </form>
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay eventos con los filtros seleccionados.">
        {(eventos) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Entidad</th>
                  <th>Detalle</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map((e) => (
                  <tr key={e.id_log}>
                    <td className="nowrap">{formatoFechaHora(e.fecha_evento)}</td>
                    <td>{e.usuario ?? <span className="texto-suave">Sistema / anónimo</span>}</td>
                    <td>
                      <Badge tono={tonoAccion(e.accion)}>{e.accion}</Badge>
                    </td>
                    <td className="nowrap">
                      {e.entidad}
                      {e.id_entidad !== null && <span className="texto-suave"> #{e.id_entidad}</span>}
                    </td>
                    <td style={{ maxWidth: 420, wordBreak: 'break-word' }}>{textoDetalle(e.detalle)}</td>
                    <td className="mono nowrap">{e.direccion_ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>
    </>
  );
}
