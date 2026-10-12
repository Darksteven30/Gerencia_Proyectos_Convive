/** Unidades residenciales y torres (CU-08): listado con ocupantes, creación de torres y edición de unidades. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Torre, Unidad } from '../api/tipos';
import { nombreUnidad } from '../components/SelectorUnidad';
import { Alerta, Badge, BotonCarga, Campo, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta } from '../utils/formato';

export function Unidades() {
  const unidades = useCarga(() => http.get<Unidad[]>('/api/admin/unidades'));
  const torres = useCarga(() => http.get<Torre[]>('/api/admin/torres'));
  const [filtroTorre, setFiltroTorre] = useState('');
  const [editando, setEditando] = useState<Unidad | 'nueva' | null>(null);
  const [creandoTorre, setCreandoTorre] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const filtradas = unidades.datos?.filter((u) => !filtroTorre || String(u.id_torre ?? '') === filtroTorre) ?? null;
  const exito = (texto: string) => {
    setMensaje(texto);
    setEditando(null);
    setCreandoTorre(false);
    void unidades.recargar();
    void torres.recargar();
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Unidades y torres"
        descripcion="Estructura del conjunto y ocupantes de cada unidad"
        acciones={
          <>
            <button className="btn btn-prim" onClick={() => setEditando('nueva')}>
              Nueva unidad
            </button>
            <button className="btn btn-sec" onClick={() => setCreandoTorre(true)}>
              Nueva torre
            </button>
          </>
        }
      />
      {mensaje && (
        <Alerta tipo="exito" onCerrar={() => setMensaje(null)}>
          {mensaje}
        </Alerta>
      )}

      <div className="tarjeta">
        <div className="tarjeta-titulo">
          <h2>Torres</h2>
        </div>
        <Contenido cargando={torres.cargando} error={torres.error} datos={torres.datos} reintentar={torres.recargar} vacio="Aún no hay torres registradas.">
          {(lista) => (
            <div className="resumen" style={{ marginBottom: 0 }}>
              {lista.map((t) => (
                <div key={t.id_torre}>
                  <span>{t.numero_pisos ? `${t.numero_pisos} pisos` : 'Pisos sin definir'}</span>
                  <strong>{t.nombre}</strong>
                  <span>{t.unidades} unidad(es)</span>
                </div>
              ))}
            </div>
          )}
        </Contenido>
      </div>

      <div className="filtros">
        <Campo etiqueta="Torre">
          <select value={filtroTorre} onChange={(e) => setFiltroTorre(e.target.value)}>
            <option value="">Todas</option>
            {torres.datos?.map((t) => (
              <option key={t.id_torre} value={t.id_torre}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </div>
      <Contenido cargando={unidades.cargando} error={unidades.error} datos={filtradas} reintentar={unidades.recargar} vacio="No hay unidades registradas.">
        {(lista) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Tipo</th>
                  <th className="numero">Piso</th>
                  <th className="numero">Área (m²)</th>
                  <th className="numero">Coeficiente</th>
                  <th>Estado</th>
                  <th>Ocupantes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lista.map((u) => (
                  <tr key={u.id_unidad}>
                    <td>
                      <strong>{nombreUnidad(u)}</strong>
                    </td>
                    <td>{etiqueta(u.tipo)}</td>
                    <td className="numero">{u.piso ?? '—'}</td>
                    <td className="numero">{u.area_m2 ?? '—'}</td>
                    <td className="numero">{Number(u.coeficiente).toFixed(4)}</td>
                    <td>
                      <Badge valor={u.estado} />
                    </td>
                    <td>
                      {u.ocupantes.length === 0 ? (
                        <span className="texto-suave">Sin ocupantes</span>
                      ) : (
                        <ul className="ocupantes">
                          {u.ocupantes.map((o) => (
                            <li key={o.id_ocupacion}>
                              {o.nombre} <span className="texto-suave">({etiqueta(o.tipo_relacion)})</span>
                              {o.es_responsable_pago && <Badge tono="verde">Responsable de pago</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td>
                      <button className="btn btn-sec btn-sm" onClick={() => setEditando(u)}>
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Contenido>

      <Modal titulo={editando === 'nueva' ? 'Nueva unidad' : 'Editar unidad'} abierto={!!editando} onCerrar={() => setEditando(null)} ancho={640}>
        {editando && <FormUnidad unidad={editando === 'nueva' ? null : editando} torres={torres.datos ?? []} onExito={exito} />}
      </Modal>
      <Modal titulo="Nueva torre" abierto={creandoTorre} onCerrar={() => setCreandoTorre(false)} ancho={440}>
        {creandoTorre && <FormTorre onExito={exito} />}
      </Modal>
    </>
  );
}

function FormUnidad({ unidad, torres, onExito }: { unidad: Unidad | null; torres: Torre[]; onExito: (t: string) => void }) {
  const [f, setF] = useState({
    id_torre: unidad?.id_torre ? String(unidad.id_torre) : '',
    numero: unidad?.numero ?? '',
    tipo: unidad?.tipo ?? 'APARTAMENTO',
    piso: unidad?.piso != null ? String(unidad.piso) : '',
    area_m2: unidad?.area_m2 != null ? String(unidad.area_m2) : '',
    coeficiente: unidad ? String(unidad.coeficiente) : '',
    estado: unidad?.estado ?? 'OCUPADA',
  });
  const { enviando, error, ejecutar } = useAccion();
  const cambiar = (campo: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [campo]: e.target.value });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const cuerpo = {
      id_torre: f.id_torre ? Number(f.id_torre) : null,
      numero: f.numero.trim(),
      tipo: f.tipo,
      piso: f.piso !== '' ? Number(f.piso) : null,
      area_m2: f.area_m2 !== '' ? Number(f.area_m2) : null,
      coeficiente: Number(f.coeficiente),
      estado: f.estado,
    };
    const r = await ejecutar(() => (unidad ? http.put(`/api/admin/unidades/${unidad.id_unidad}`, cuerpo) : http.post('/api/admin/unidades', cuerpo)));
    if (r) onExito(unidad ? 'Unidad actualizada.' : 'Unidad creada.');
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Torre">
          <select value={f.id_torre} onChange={cambiar('id_torre')}>
            <option value="">Sin torre (casa / local)</option>
            {torres.map((t) => (
              <option key={t.id_torre} value={t.id_torre}>
                {t.nombre}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Número">
          <input required maxLength={20} value={f.numero} onChange={cambiar('numero')} />
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={f.tipo} onChange={cambiar('tipo')}>
            <option value="APARTAMENTO">Apartamento</option>
            <option value="CASA">Casa</option>
            <option value="LOCAL">Local</option>
          </select>
        </Campo>
        <Campo etiqueta="Piso">
          <input type="number" step={1} value={f.piso} onChange={cambiar('piso')} />
        </Campo>
        <Campo etiqueta="Área (m²)">
          <input type="number" min={0.01} step={0.01} value={f.area_m2} onChange={cambiar('area_m2')} />
        </Campo>
        <Campo etiqueta="Coeficiente de copropiedad" ayuda="Valor entre 0 y 1 (p. ej. 0,0500)">
          <input type="number" min={0.0001} max={1} step={0.0001} required value={f.coeficiente} onChange={cambiar('coeficiente')} />
        </Campo>
        <Campo etiqueta="Estado">
          <select value={f.estado} onChange={cambiar('estado')}>
            <option value="OCUPADA">Ocupada</option>
            <option value="DESOCUPADA">Desocupada</option>
          </select>
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          {unidad ? 'Guardar cambios' : 'Crear unidad'}
        </BotonCarga>
      </div>
    </form>
  );
}

function FormTorre({ onExito }: { onExito: (t: string) => void }) {
  const [nombre, setNombre] = useState('');
  const [pisos, setPisos] = useState('');
  const { enviando, error, ejecutar } = useAccion();
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() => http.post('/api/admin/torres', { nombre: nombre.trim(), numero_pisos: pisos ? Number(pisos) : undefined }));
    if (r) onExito('Torre creada.');
  };
  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Nombre">
          <input required maxLength={50} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Torre C" />
        </Campo>
        <Campo etiqueta="Número de pisos (opcional)">
          <input type="number" min={1} max={80} value={pisos} onChange={(e) => setPisos(e.target.value)} />
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Crear torre
        </BotonCarga>
      </div>
    </form>
  );
}
