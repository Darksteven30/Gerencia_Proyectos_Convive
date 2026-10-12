/** Reservas (RF-03): zonas comunes, bloqueos por mantenimiento y gestión de reservas. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Bloqueo, Reserva, Zona } from '../api/tipos';
import { Alerta, Badge, BotonCarga, Campo, confirmar, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { formatoCOP, formatoFecha, formatoFechaHora, localColombiaAISO } from '../utils/formato';

export function Reservas() {
  const [pestana, setPestana] = useState<'zonas' | 'reservas'>('zonas');
  return (
    <>
      <EncabezadoPagina titulo="Reservas" descripcion="Zonas comunes, reglamento, bloqueos y reservas de los habitantes" />
      <div className="pestanas" role="tablist">
        <button className={`pestana ${pestana === 'zonas' ? 'activa' : ''}`} onClick={() => setPestana('zonas')} role="tab">
          Zonas comunes
        </button>
        <button className={`pestana ${pestana === 'reservas' ? 'activa' : ''}`} onClick={() => setPestana('reservas')} role="tab">
          Reservas
        </button>
      </div>
      {pestana === 'zonas' ? <Zonas /> : <ListaReservas />}
    </>
  );
}

// --- Zonas comunes ---

function Zonas() {
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Zona[]>('/api/zonas'));
  const [editando, setEditando] = useState<Zona | 'nueva' | null>(null);
  const [bloqueosDe, setBloqueosDe] = useState<Zona | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  return (
    <>
      <div className="acciones" style={{ marginBottom: '1rem' }}>
        <button className="btn btn-prim" onClick={() => setEditando('nueva')}>
          Nueva zona común
        </button>
      </div>
      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
          {mensaje}
        </Alerta>
      )}
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay zonas comunes registradas.">
        {(zonas) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Horario</th>
                  <th className="numero">Aforo</th>
                  <th className="numero">Costo</th>
                  <th>Reglas</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {zonas.map((z) => (
                  <tr key={z.id_zona}>
                    <td>
                      <strong>{z.nombre}</strong>
                      {z.descripcion && <div className="texto-suave">{z.descripcion}</div>}
                    </td>
                    <td className="nowrap">
                      {z.hora_apertura} – {z.hora_cierre}
                    </td>
                    <td className="numero">{z.aforo_maximo}</td>
                    <td className="numero">{Number(z.costo_reserva) > 0 ? formatoCOP(z.costo_reserva) : 'Gratis'}</td>
                    <td className="texto-suave">
                      Máx. {z.duracion_max_horas} h · hasta {z.anticipacion_max_dias} días antes
                    </td>
                    <td>
                      <Badge valor={z.estado} />
                    </td>
                    <td>
                      <div className="celda-acciones">
                        <button className="btn btn-sec btn-sm" onClick={() => setEditando(z)}>
                          Editar
                        </button>
                        <button className="btn btn-sec btn-sm" onClick={() => setBloqueosDe(z)}>
                          Bloqueos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>
      <Modal titulo={editando === 'nueva' ? 'Nueva zona común' : 'Editar zona común'} abierto={!!editando} onCerrar={() => setEditando(null)} ancho={720}>
        {editando && (
          <FormZona
            zona={editando === 'nueva' ? null : editando}
            onExito={(texto) => {
              setEditando(null);
              setMensaje(texto);
              void recargar();
            }}
          />
        )}
      </Modal>
      <Modal titulo={`Bloqueos · ${bloqueosDe?.nombre ?? ''}`} abierto={!!bloqueosDe} onCerrar={() => setBloqueosDe(null)} ancho={720}>
        {bloqueosDe && <BloqueosZona zona={bloqueosDe} />}
      </Modal>
    </>
  );
}

function FormZona({ zona, onExito }: { zona: Zona | null; onExito: (mensaje: string) => void }) {
  const [f, setF] = useState({
    nombre: zona?.nombre ?? '',
    descripcion: zona?.descripcion ?? '',
    aforo_maximo: String(zona?.aforo_maximo ?? ''),
    costo_reserva: String(zona?.costo_reserva ?? 0),
    hora_apertura: zona?.hora_apertura ?? '08:00',
    hora_cierre: zona?.hora_cierre ?? '20:00',
    duracion_max_horas: String(zona?.duracion_max_horas ?? 2),
    anticipacion_max_dias: String(zona?.anticipacion_max_dias ?? 15),
    reglamento: zona?.reglamento ?? '',
    estado: zona?.estado ?? 'ACTIVA',
  });
  const { enviando, error, ejecutar } = useAccion();
  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [campo]: e.target.value });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const cuerpo = {
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim() || null,
      aforo_maximo: Number(f.aforo_maximo),
      costo_reserva: Number(f.costo_reserva || 0),
      hora_apertura: f.hora_apertura,
      hora_cierre: f.hora_cierre,
      duracion_max_horas: Number(f.duracion_max_horas),
      anticipacion_max_dias: Number(f.anticipacion_max_dias),
      reglamento: f.reglamento.trim() || null,
      estado: f.estado,
    };
    const r = await ejecutar(() => (zona ? http.put(`/api/zonas/${zona.id_zona}`, cuerpo) : http.post('/api/zonas', cuerpo)));
    if (r) onExito(zona ? 'Zona común actualizada.' : 'Zona común creada.');
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Nombre">
          <input required minLength={3} maxLength={60} value={f.nombre} onChange={cambiar('nombre')} />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={f.estado} onChange={cambiar('estado')}>
            <option value="ACTIVA">Activa</option>
            <option value="MANTENIMIENTO">Mantenimiento</option>
            <option value="INACTIVA">Inactiva</option>
          </select>
        </Campo>
        <Campo etiqueta="Hora de apertura">
          <input type="time" required value={f.hora_apertura} onChange={cambiar('hora_apertura')} />
        </Campo>
        <Campo etiqueta="Hora de cierre">
          <input type="time" required value={f.hora_cierre} onChange={cambiar('hora_cierre')} />
        </Campo>
        <Campo etiqueta="Aforo máximo">
          <input type="number" min={1} max={1000} required value={f.aforo_maximo} onChange={cambiar('aforo_maximo')} />
        </Campo>
        <Campo etiqueta="Costo de la reserva (COP)" ayuda={formatoCOP(Number(f.costo_reserva || 0))}>
          <input type="number" min={0} step={1} value={f.costo_reserva} onChange={cambiar('costo_reserva')} />
        </Campo>
        <Campo etiqueta="Duración máxima (horas)">
          <input type="number" min={1} max={24} required value={f.duracion_max_horas} onChange={cambiar('duracion_max_horas')} />
        </Campo>
        <Campo etiqueta="Anticipación máxima (días)">
          <input type="number" min={1} max={365} required value={f.anticipacion_max_dias} onChange={cambiar('anticipacion_max_dias')} />
        </Campo>
        <Campo etiqueta="Descripción" ancho="completo">
          <input maxLength={300} value={f.descripcion} onChange={cambiar('descripcion')} />
        </Campo>
        <Campo etiqueta="Reglamento de uso" ancho="completo">
          <textarea value={f.reglamento} onChange={cambiar('reglamento')} />
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          {zona ? 'Guardar cambios' : 'Crear zona'}
        </BotonCarga>
      </div>
    </form>
  );
}

function BloqueosZona({ zona }: { zona: Zona }) {
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Bloqueo[]>(`/api/zonas/${zona.id_zona}/bloqueos`), [zona.id_zona]);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const accion = useAccion();

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    const r = await accion.ejecutar(() =>
      http.post<{ reservas_afectadas: number }>(`/api/zonas/${zona.id_zona}/bloqueos`, {
        fecha_inicio: localColombiaAISO(inicio),
        fecha_fin: localColombiaAISO(fin),
        motivo: motivo.trim(),
      }),
    );
    if (r) {
      setAviso(
        r.reservas_afectadas
          ? `Bloqueo creado. Se notificó a ${r.reservas_afectadas} reserva(s) afectada(s).`
          : 'Bloqueo creado. No hay reservas confirmadas afectadas.',
      );
      setInicio('');
      setFin('');
      setMotivo('');
      void recargar();
    }
  };

  const eliminar = async (b: Bloqueo) => {
    const ok = await confirmar({
      titulo: 'Eliminar bloqueo',
      mensaje: `¿Eliminar el bloqueo "${b.motivo}"? La zona volverá a estar disponible en ese horario.`,
      textoConfirmar: 'Eliminar',
      peligro: true,
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.del(`/api/bloqueos/${b.id_bloqueo}`));
    if (r) {
      setAviso('Bloqueo eliminado.');
      void recargar();
    }
  };

  return (
    <>
      {aviso && (
        <Alerta tipo="exito" onCerrar={() => setAviso(null)}>
          {aviso}
        </Alerta>
      )}
      {accion.error && <Alerta tipo="error">{accion.error}</Alerta>}
      <form onSubmit={crear} className="tarjeta" style={{ boxShadow: 'none' }}>
        <h3 style={{ marginBottom: '0.8rem' }}>Nuevo bloqueo</h3>
        <div className="formulario">
          <Campo etiqueta="Inicio (hora de Colombia)">
            <input type="datetime-local" required value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </Campo>
          <Campo etiqueta="Fin (hora de Colombia)">
            <input type="datetime-local" required value={fin} onChange={(e) => setFin(e.target.value)} />
          </Campo>
          <Campo etiqueta="Motivo" ancho="completo">
            <input required minLength={3} maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Mantenimiento preventivo" />
          </Campo>
        </div>
        <div className="form-acciones">
          <BotonCarga type="submit" cargando={accion.enviando}>
            Crear bloqueo
          </BotonCarga>
        </div>
      </form>
      <h3 style={{ margin: '0.5rem 0 0.6rem' }}>Bloqueos vigentes y futuros</h3>
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="La zona no tiene bloqueos vigentes.">
        {(bloqueos) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Motivo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bloqueos.map((b) => (
                  <tr key={b.id_bloqueo}>
                    <td className="nowrap">{formatoFechaHora(b.fecha_inicio)}</td>
                    <td className="nowrap">{formatoFechaHora(b.fecha_fin)}</td>
                    <td>{b.motivo}</td>
                    <td>
                      <button className="btn btn-peligro btn-sm" onClick={() => eliminar(b)}>
                        Eliminar
                      </button>
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

// --- Reservas ---

function ListaReservas() {
  const [fecha, setFecha] = useState('');
  const [zona, setZona] = useState('');
  const [estado, setEstado] = useState('');
  const zonas = useCarga(() => http.get<Zona[]>('/api/zonas'));
  const { datos, cargando, error, recargar } = useCarga(() => {
    const q = new URLSearchParams();
    if (fecha) q.set('fecha', fecha);
    if (zona) q.set('id_zona', zona);
    if (estado) q.set('estado', estado);
    return http.get<Reserva[]>(`/api/reservas?${q}`);
  }, [fecha, zona, estado]);
  const accion = useAccion();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cancelar = async (r: Reserva) => {
    const ok = await confirmar({
      titulo: 'Cancelar reserva',
      mensaje: `¿Cancelar la reserva de ${r.zona} del ${formatoFecha(r.fecha)} (${r.hora_inicio}–${r.hora_fin}) a nombre de ${r.solicitante}?`,
      textoConfirmar: 'Cancelar reserva',
      peligro: true,
    });
    if (!ok) return;
    const res = await accion.ejecutar(() => http.post(`/api/reservas/${r.id_reserva}/cancelar`));
    if (res) {
      setMensaje('Reserva cancelada.');
      void recargar();
    }
  };

  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
        <Campo etiqueta="Zona">
          <select value={zona} onChange={(e) => setZona(e.target.value)}>
            <option value="">Todas</option>
            {zonas.datos?.map((z) => (
              <option key={z.id_zona} value={z.id_zona}>
                {z.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="CANCELADA">Cancelada</option>
            <option value="FINALIZADA">Finalizada</option>
          </select>
        </Campo>
      </div>
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
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay reservas con los filtros seleccionados.">
        {(reservas) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Zona</th>
                  <th>Unidad</th>
                  <th>Solicitante</th>
                  <th className="numero">Asistentes</th>
                  <th className="numero">Valor</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reservas.map((r) => (
                  <tr key={r.id_reserva}>
                    <td className="nowrap">{formatoFecha(r.fecha)}</td>
                    <td className="nowrap">
                      {r.hora_inicio} – {r.hora_fin}
                    </td>
                    <td>{r.zona}</td>
                    <td>{r.unidad}</td>
                    <td>
                      {r.solicitante}
                      {r.observaciones && <div className="texto-suave">{r.observaciones}</div>}
                    </td>
                    <td className="numero">{r.numero_asistentes}</td>
                    <td className="numero">{formatoCOP(r.valor)}</td>
                    <td>
                      <Badge valor={r.estado} />
                    </td>
                    <td>
                      {r.estado === 'CONFIRMADA' && (
                        <button className="btn btn-peligro btn-sm" onClick={() => cancelar(r)} disabled={accion.enviando}>
                          Cancelar
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
