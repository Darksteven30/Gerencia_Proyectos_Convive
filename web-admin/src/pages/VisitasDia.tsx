/** Visitas del día (CU-47/CU-48): listado de las visitas programadas y registro de salida. */
import { useState } from 'react';
import { http } from '../api/client';
import type { Visita } from '../api/tipos';
import { Alerta, Badge, Campo, confirmar, Contenido, EncabezadoPagina } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { formatoFecha, formatoFechaHora, hoyColombia } from '../utils/formato';

export function VisitasDia() {
  const [fecha, setFecha] = useState(hoyColombia());
  const [estado, setEstado] = useState('');
  // La API exige la fecha en formato AAAA-MM-DD; se calcula el "hoy" de Colombia en el cliente
  const { datos, cargando, error, recargar } = useCarga(() => {
    const q = new URLSearchParams({ fecha });
    if (estado) q.set('estado', estado);
    return http.get<Visita[]>(`/api/visitas?${q}`);
  }, [fecha, estado]);
  const accion = useAccion();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const registrarSalida = async (v: Visita) => {
    const ok = await confirmar({
      titulo: 'Registrar salida',
      mensaje: `¿Registrar la salida de ${v.visitante.nombre}${v.parqueadero ? ` y liberar el parqueadero ${v.parqueadero}` : ''}?`,
      textoConfirmar: 'Registrar salida',
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.post(`/api/visitas/${v.id_visita}/salida`));
    if (r) {
      setMensaje(`Salida registrada para ${v.visitante.nombre}.`);
      void recargar();
    }
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Visitas del día"
        descripcion={`Visitas programadas para el ${formatoFecha(fecha)}`}
        acciones={
          <button className="btn btn-sec" onClick={recargar} disabled={cargando}>
            Actualizar
          </button>
        }
      />
      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
          {mensaje}
        </Alerta>
      )}
      {accion.error && (
        <Alerta tipo="error" onCerrar={() => accion.setError(null)}>
          {accion.error}
        </Alerta>
      )}
      <div className="filtros">
        <Campo etiqueta="Fecha">
          <input type="date" required value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="PREREGISTRADA">Pre-registrada</option>
            <option value="INGRESADA">Ingresada</option>
            <option value="FINALIZADA">Finalizada</option>
            <option value="VENCIDA">Vencida</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </Campo>
      </div>
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay visitas para la fecha seleccionada.">
        {(visitas) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Franja</th>
                  <th>Visitante</th>
                  <th>Unidad / anfitrión</th>
                  <th>Vehículo</th>
                  <th>Ingreso</th>
                  <th>Salida</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visitas.map((v) => (
                  <tr key={v.id_visita}>
                    <td className="nowrap">
                      {v.hora_desde} – {v.hora_hasta}
                    </td>
                    <td>
                      <strong>{v.visitante.nombre}</strong>
                      <div className="texto-suave">
                        {v.visitante.tipo_documento} {v.visitante.numero_documento}
                      </div>
                      {v.motivo && <div className="texto-suave">{v.motivo}</div>}
                    </td>
                    <td>
                      {v.unidad}
                      <div className="texto-suave">{v.anfitrion}</div>
                    </td>
                    <td>
                      {v.visitante.placa_vehiculo ? <span className="mono">{v.visitante.placa_vehiculo}</span> : '—'}
                      {v.parqueadero && <div className="texto-suave">Celda {v.parqueadero}</div>}
                    </td>
                    <td className="nowrap">{formatoFechaHora(v.fecha_hora_ingreso)}</td>
                    <td className="nowrap">{formatoFechaHora(v.fecha_hora_salida)}</td>
                    <td>
                      <Badge valor={v.estado} />
                    </td>
                    <td>
                      {v.estado === 'INGRESADA' && (
                        <button className="btn btn-prim btn-sm" disabled={accion.enviando} onClick={() => registrarSalida(v)}>
                          Registrar salida
                        </button>
                      )}
                    </td>
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
