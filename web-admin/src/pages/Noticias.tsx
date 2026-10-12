/** Noticias y comunicados (RF-05): creación, publicación de borradores y archivo. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Noticia, Torre } from '../api/tipos';
import { Alerta, Badge, BotonCarga, Campo, confirmar, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta, formatoFechaHora, localColombiaAISO } from '../utils/formato';

export function Noticias() {
  const [estado, setEstado] = useState('');
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Noticia[]>('/api/noticias/gestion'));
  const [creando, setCreando] = useState(false);
  const [viendo, setViendo] = useState<Noticia | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accion = useAccion();

  const filtradas = datos?.filter((n) => !estado || n.estado === estado) ?? null;

  const publicar = async (n: Noticia) => {
    const ok = await confirmar({
      titulo: 'Publicar noticia',
      mensaje: `¿Publicar "${n.titulo}"? Se enviará una notificación al público objetivo.`,
      textoConfirmar: 'Publicar',
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.post<{ notificados: number }>(`/api/noticias/${n.id_noticia}/publicar`));
    if (r) {
      setMensaje(`Noticia publicada. Se notificó a ${r.notificados} usuario(s).`);
      void recargar();
    }
  };

  const archivar = async (n: Noticia) => {
    const ok = await confirmar({
      titulo: 'Archivar noticia',
      mensaje: `¿Archivar "${n.titulo}"? Dejará de mostrarse a los habitantes.`,
      textoConfirmar: 'Archivar',
      peligro: true,
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.post(`/api/noticias/${n.id_noticia}/archivar`));
    if (r) {
      setMensaje('Noticia archivada.');
      void recargar();
    }
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Noticias y comunicados"
        descripcion="Publique información para los habitantes del conjunto"
        acciones={
          <button className="btn btn-prim" onClick={() => setCreando(true)}>
            Nueva noticia
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
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="BORRADOR">Borrador</option>
            <option value="PUBLICADA">Publicada</option>
            <option value="ARCHIVADA">Archivada</option>
          </select>
        </Campo>
      </div>
      <Contenido cargando={cargando} error={error} datos={filtradas} reintentar={recargar} vacio="No hay noticias con el filtro seleccionado.">
        {(noticias) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Público</th>
                  <th>Autor</th>
                  <th>Publicación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {noticias.map((n) => (
                  <tr key={n.id_noticia}>
                    <td>
                      <button className="btn-enlace" onClick={() => setViendo(n)}>
                        {n.titulo}
                      </button>
                    </td>
                    <td>
                      <Badge valor={n.tipo} />
                    </td>
                    <td>{n.publico_objetivo === 'TORRE' ? `Torre: ${n.torre_destino ?? n.id_torre_destino}` : etiqueta(n.publico_objetivo)}</td>
                    <td>{n.autor}</td>
                    <td className="nowrap">{formatoFechaHora(n.fecha_publicacion)}</td>
                    <td>
                      <Badge valor={n.estado} />
                    </td>
                    <td>
                      <div className="celda-acciones">
                        {n.estado !== 'PUBLICADA' && (
                          <button className="btn btn-sec btn-sm" disabled={accion.enviando} onClick={() => publicar(n)}>
                            Publicar
                          </button>
                        )}
                        {n.estado !== 'ARCHIVADA' && (
                          <button className="btn btn-sec btn-sm" disabled={accion.enviando} onClick={() => archivar(n)}>
                            Archivar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>

      <Modal titulo="Nueva noticia" abierto={creando} onCerrar={() => setCreando(false)} ancho={720}>
        {creando && (
          <FormNoticia
            onExito={(texto) => {
              setCreando(false);
              setMensaje(texto);
              void recargar();
            }}
          />
        )}
      </Modal>
      <Modal titulo={viendo?.titulo ?? ''} abierto={!!viendo} onCerrar={() => setViendo(null)} ancho={680}>
        {viendo && (
          <>
            <div className="acciones" style={{ marginBottom: '0.8rem' }}>
              <Badge valor={viendo.tipo} />
              <Badge valor={viendo.estado} />
            </div>
            <p className="caja-texto">{viendo.contenido}</p>
            <dl className="lista-def">
              <dt>Autor</dt>
              <dd>{viendo.autor}</dd>
              <dt>Creada</dt>
              <dd>{formatoFechaHora(viendo.fecha_creacion)}</dd>
              <dt>Publicada</dt>
              <dd>{formatoFechaHora(viendo.fecha_publicacion)}</dd>
              <dt>Expira</dt>
              <dd>{viendo.fecha_expiracion ? formatoFechaHora(viendo.fecha_expiracion) : 'Sin expiración'}</dd>
            </dl>
          </>
        )}
      </Modal>
    </>
  );
}

function FormNoticia({ onExito }: { onExito: (texto: string) => void }) {
  const torres = useCarga(() => http.get<Torre[]>('/api/admin/torres'));
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [tipo, setTipo] = useState('NOTICIA');
  const [publico, setPublico] = useState('TODOS');
  const [torre, setTorre] = useState('');
  const [expiracion, setExpiracion] = useState('');
  const [publicarYa, setPublicarYa] = useState(true);
  const { enviando, error, ejecutar } = useAccion();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post<{ estado: string; notificados: number }>('/api/noticias', {
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        tipo,
        publico_objetivo: publico,
        id_torre_destino: publico === 'TORRE' ? Number(torre) : undefined,
        fecha_expiracion: expiracion ? localColombiaAISO(expiracion) : undefined,
        publicar: publicarYa,
      }),
    );
    if (r) onExito(r.estado === 'PUBLICADA' ? `Noticia publicada. Se notificó a ${r.notificados} usuario(s).` : 'Noticia guardada como borrador.');
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Título" ancho="completo">
          <input required minLength={5} maxLength={150} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Contenido" ancho="completo">
          <textarea required minLength={10} rows={6} value={contenido} onChange={(e) => setContenido(e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="NOTICIA">Noticia</option>
            <option value="COMUNICADO">Comunicado</option>
            <option value="URGENTE">Urgente</option>
          </select>
        </Campo>
        <Campo etiqueta="Público objetivo">
          <select value={publico} onChange={(e) => setPublico(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="PROPIETARIOS">Propietarios</option>
            <option value="RESIDENTES">Residentes</option>
            <option value="TORRE">Una torre</option>
          </select>
        </Campo>
        {publico === 'TORRE' && (
          <Campo etiqueta="Torre destino">
            <select required value={torre} onChange={(e) => setTorre(e.target.value)} disabled={torres.cargando}>
              <option value="">{torres.cargando ? 'Cargando…' : 'Seleccione la torre'}</option>
              {torres.datos?.map((t) => (
                <option key={t.id_torre} value={t.id_torre}>
                  {t.nombre}
                </option>
              ))}
            </select>
          </Campo>
        )}
        <Campo etiqueta="Expira (opcional)">
          <input type="datetime-local" value={expiracion} onChange={(e) => setExpiracion(e.target.value)} />
        </Campo>
        <label className="casilla campo-completo">
          <input type="checkbox" checked={publicarYa} onChange={(e) => setPublicarYa(e.target.checked)} />
          Publicar de inmediato (si no se marca, queda como borrador)
        </label>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          {publicarYa ? 'Publicar' : 'Guardar borrador'}
        </BotonCarga>
      </div>
    </form>
  );
}
