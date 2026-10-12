/** PQRS (RF-04): listado, detalle con seguimiento y adjuntos, y gestión (asignar, responder, cerrar). */
import { useState, type FormEvent } from 'react';
import { descargarArchivo, http } from '../api/client';
import type { Pqrs, PqrsDetalle, Usuario } from '../api/tipos';
import { useAuth } from '../auth/AuthContext';
import { Alerta, Badge, BotonCarga, Campo, Cargando, confirmar, Contenido, EncabezadoPagina, ErrorVista, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta, formatoFecha, formatoFechaHora } from '../utils/formato';

export function PqrsPagina() {
  const { tieneRol } = useAuth();
  const esAdmin = tieneRol('ADMINISTRADOR');
  const [estado, setEstado] = useState('');
  const [tipo, setTipo] = useState('');
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const { datos, cargando, error, recargar } = useCarga(() => {
    const q = new URLSearchParams();
    if (estado) q.set('estado', estado);
    if (tipo) q.set('tipo', tipo);
    return http.get<Pqrs[]>(`/api/pqrs?${q}`);
  }, [estado, tipo]);

  return (
    <>
      <EncabezadoPagina
        titulo="PQRS"
        descripcion={esAdmin ? 'Peticiones, quejas, reclamos y sugerencias de los habitantes' : 'Consulta de PQRS (solo lectura)'}
      />
      <div className="filtros">
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="ABIERTAS">Abiertas (radicada o en trámite)</option>
            <option value="RADICADA">Radicada</option>
            <option value="EN_TRAMITE">En trámite</option>
            <option value="RESPONDIDA">Respondida</option>
            <option value="CERRADA">Cerrada</option>
          </select>
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            <option value="PETICION">Petición</option>
            <option value="QUEJA">Queja</option>
            <option value="RECLAMO">Reclamo</option>
            <option value="SUGERENCIA">Sugerencia</option>
          </select>
        </Campo>
      </div>
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay PQRS con los filtros seleccionados.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Radicado</th>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Asunto</th>
                  <th>Solicitante</th>
                  <th>Prioridad</th>
                  <th>Límite</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((p) => (
                  <tr key={p.id_pqrs} className="fila-clic" onClick={() => setSeleccionada(p.id_pqrs)}>
                    <td className="mono nowrap">
                      <button className="btn-enlace" onClick={() => setSeleccionada(p.id_pqrs)}>
                        {p.numero_radicado}
                      </button>
                    </td>
                    <td className="nowrap">{formatoFecha(p.fecha_radicacion)}</td>
                    <td>{etiqueta(p.tipo)}</td>
                    <td>
                      {p.asunto}
                      <div className="texto-suave">
                        {p.categoria}
                        {p.adjuntos > 0 && ` · ${p.adjuntos} adjunto(s)`}
                      </div>
                    </td>
                    <td>
                      {p.solicitante}
                      {p.unidad && <div className="texto-suave">{p.unidad}</div>}
                    </td>
                    <td>
                      <Badge valor={p.prioridad} />
                    </td>
                    <td className="nowrap">
                      {formatoFecha(p.fecha_limite)} {p.vencida && <Badge tono="rojo">Vencida</Badge>}
                    </td>
                    <td>
                      <Badge valor={p.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>
      <Modal titulo="Detalle de la PQRS" abierto={seleccionada !== null} onCerrar={() => setSeleccionada(null)} ancho={820}>
        {seleccionada !== null && <DetallePqrs id={seleccionada} esAdmin={esAdmin} onCambio={recargar} />}
      </Modal>
    </>
  );
}

function DetallePqrs({ id, esAdmin, onCambio }: { id: number; esAdmin: boolean; onCambio: () => void }) {
  const { datos: p, cargando, error, recargar } = useCarga(() => http.get<PqrsDetalle>(`/api/pqrs/${id}`), [id]);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const actualizado = (texto: string) => {
    setMensaje(texto);
    void recargar();
    onCambio();
  };

  const descargar = async (idAdjunto: number, nombre: string) => {
    setErrorDescarga(null);
    try {
      await descargarArchivo(`/api/pqrs/${id}/adjuntos/${idAdjunto}`, nombre);
    } catch (e) {
      setErrorDescarga(e instanceof Error ? e.message : 'No fue posible descargar el adjunto');
    }
  };

  if (cargando && !p) return <Cargando />;
  if (error) return <ErrorVista mensaje={error} reintentar={recargar} />;
  if (!p) return null;

  return (
    <>
      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
          {mensaje}
        </Alerta>
      )}
      <div className="tarjeta-titulo">
        <div>
          <h2>{p.asunto}</h2>
          <p className="texto-suave mono">{p.numero_radicado}</p>
        </div>
        <div className="acciones">
          <Badge valor={p.estado} />
          {p.vencida && <Badge tono="rojo">Vencida</Badge>}
        </div>
      </div>
      <dl className="lista-def">
        <dt>Tipo</dt>
        <dd>
          {etiqueta(p.tipo)} · {p.categoria}
        </dd>
        <dt>Solicitante</dt>
        <dd>
          {p.solicitante}
          {p.unidad && ` (${p.unidad})`}
        </dd>
        <dt>Radicación</dt>
        <dd>{formatoFechaHora(p.fecha_radicacion)}</dd>
        <dt>Fecha límite</dt>
        <dd>{formatoFecha(p.fecha_limite)}</dd>
        <dt>Prioridad</dt>
        <dd>
          <Badge valor={p.prioridad} />
        </dd>
        <dt>Responsable</dt>
        <dd>{p.responsable ?? 'Sin asignar'}</dd>
        {p.calificacion !== null && (
          <>
            <dt>Calificación</dt>
            <dd>{'★'.repeat(p.calificacion) + '☆'.repeat(5 - p.calificacion)}</dd>
          </>
        )}
      </dl>
      <h3>Descripción</h3>
      <p className="caja-texto">{p.descripcion}</p>
      {p.respuesta && (
        <>
          <h3>Respuesta</h3>
          <p className="caja-texto">{p.respuesta}</p>
        </>
      )}

      {p.lista_adjuntos.length > 0 && (
        <>
          <h3 style={{ marginBottom: '0.5rem' }}>Adjuntos</h3>
          {errorDescarga && <Alerta tipo="error">{errorDescarga}</Alerta>}
          <div className="acciones" style={{ marginBottom: '1rem' }}>
            {p.lista_adjuntos.map((a) => (
              <button key={a.id_adjunto} className="btn btn-sec btn-sm" onClick={() => descargar(a.id_adjunto, a.nombre_archivo)}>
                ⬇ {a.nombre_archivo} ({a.tamano_kb} KB)
              </button>
            ))}
          </div>
        </>
      )}

      <h3 style={{ marginBottom: '0.6rem' }}>Historial de seguimiento</h3>
      {p.seguimientos.length === 0 ? (
        <p className="texto-suave">Sin movimientos registrados.</p>
      ) : (
        <ol className="linea-tiempo">
          {p.seguimientos.map((s, i) => (
            <li key={i}>
              <strong>
                {s.estado_anterior ? `${etiqueta(s.estado_anterior)} → ` : ''}
                {etiqueta(s.estado_nuevo)}
              </strong>{' '}
              <span className="texto-suave">
                · {formatoFechaHora(s.fecha_registro)} · {s.usuario}
              </span>
              {s.comentario && <div>{s.comentario}</div>}
            </li>
          ))}
        </ol>
      )}

      {esAdmin && p.estado !== 'CERRADA' && <AccionesPqrs p={p} onExito={actualizado} />}
    </>
  );
}

function AccionesPqrs({ p, onExito }: { p: PqrsDetalle; onExito: (texto: string) => void }) {
  const accion = useAccion();
  const [responsable, setResponsable] = useState(p.id_responsable ? String(p.id_responsable) : '');
  const [prioridad, setPrioridad] = useState(p.prioridad);
  const [comentario, setComentario] = useState('');
  const [respuesta, setRespuesta] = useState('');
  const [comentarioCierre, setComentarioCierre] = useState('');
  // Posibles responsables: usuarios con rol de gestión
  const usuarios = useCarga(() => http.get<Usuario[]>('/api/admin/usuarios'));
  const gestores = usuarios.datos?.filter((u) => u.estado === 'ACTIVO' && u.roles.some((r) => r === 'ADMINISTRADOR' || r === 'JUNTA')) ?? [];

  const asignar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await accion.ejecutar(() =>
      http.post(`/api/pqrs/${p.id_pqrs}/asignar`, {
        id_responsable: responsable ? Number(responsable) : undefined,
        prioridad,
        comentario: comentario.trim() || undefined,
      }),
    );
    if (r) {
      setComentario('');
      onExito('PQRS asignada: pasó a estado En trámite.');
    }
  };

  const responder = async (e: FormEvent) => {
    e.preventDefault();
    const r = await accion.ejecutar(() => http.post(`/api/pqrs/${p.id_pqrs}/responder`, { respuesta: respuesta.trim() }));
    if (r) {
      setRespuesta('');
      onExito('Respuesta registrada y notificada al solicitante.');
    }
  };

  const cerrar = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await confirmar({
      titulo: 'Cerrar PQRS',
      mensaje: `¿Cerrar la PQRS ${p.numero_radicado}? Esta acción finaliza el trámite.`,
      textoConfirmar: 'Cerrar PQRS',
      peligro: true,
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.post(`/api/pqrs/${p.id_pqrs}/cerrar`, { comentario: comentarioCierre.trim() || undefined }));
    if (r) onExito('PQRS cerrada.');
  };

  return (
    <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--borde)', paddingTop: '1rem' }}>
      <h3 style={{ marginBottom: '0.8rem' }}>Gestión</h3>
      {accion.error && (
        <Alerta tipo="error" onCerrar={() => accion.setError(null)}>
          {accion.error}
        </Alerta>
      )}
      {(p.estado === 'RADICADA' || p.estado === 'EN_TRAMITE') && (
        <form onSubmit={asignar} className="tarjeta" style={{ boxShadow: 'none' }}>
          <h3 style={{ marginBottom: '0.6rem' }}>{p.estado === 'RADICADA' ? 'Asignar (pasa a En trámite)' : 'Reasignar'}</h3>
          <div className="formulario">
            <Campo etiqueta="Responsable">
              <select value={responsable} onChange={(e) => setResponsable(e.target.value)}>
                <option value="">Yo mismo / sin cambio</option>
                {gestores.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {u.nombres} {u.apellidos}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Prioridad">
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
              </select>
            </Campo>
            <Campo etiqueta="Comentario (opcional)" ancho="completo">
              <input maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            </Campo>
          </div>
          <div className="form-acciones">
            <BotonCarga type="submit" cargando={accion.enviando}>
              Asignar
            </BotonCarga>
          </div>
        </form>
      )}
      <div className="dos-columnas">
        {p.estado !== 'RESPONDIDA' && (
          <form onSubmit={responder} className="tarjeta" style={{ boxShadow: 'none' }}>
            <h3 style={{ marginBottom: '0.6rem' }}>Responder</h3>
            <Campo etiqueta="Respuesta al solicitante">
              <textarea required minLength={5} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />
            </Campo>
            <div className="form-acciones">
              <BotonCarga type="submit" cargando={accion.enviando}>
                Enviar respuesta
              </BotonCarga>
            </div>
          </form>
        )}
        <form onSubmit={cerrar} className="tarjeta" style={{ boxShadow: 'none' }}>
          <h3 style={{ marginBottom: '0.6rem' }}>Cerrar</h3>
          {!p.respuesta && <p className="texto-suave">Para cerrar la PQRS primero debe registrar una respuesta.</p>}
          <Campo etiqueta="Comentario de cierre (opcional)">
            <input maxLength={500} value={comentarioCierre} onChange={(e) => setComentarioCierre(e.target.value)} />
          </Campo>
          <div className="form-acciones">
            <BotonCarga type="submit" className="btn btn-peligro" cargando={accion.enviando} disabled={!p.respuesta}>
              Cerrar PQRS
            </BotonCarga>
          </div>
        </form>
      </div>
    </div>
  );
}
