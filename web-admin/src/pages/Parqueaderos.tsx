/** Parqueaderos (RF-07): cuadrícula de celdas, asignación (residente o visitante), liberación y mantenimiento. */
import { useState, type FormEvent } from 'react';
import { http } from '../api/client';
import type { Parqueadero, Visita } from '../api/tipos';
import { useAuth } from '../auth/AuthContext';
import { SelectorUnidad } from '../components/SelectorUnidad';
import { Alerta, Badge, BotonCarga, Campo, confirmar, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta, formatoFechaHora } from '../utils/formato';

export function Parqueaderos() {
  const { tieneRol } = useAuth();
  const esAdmin = tieneRol('ADMINISTRADOR');
  const [tipo, setTipo] = useState('');
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Parqueadero[]>(`/api/parqueaderos${tipo ? `?tipo=${tipo}` : ''}`), [tipo]);
  const [asignando, setAsignando] = useState<Parqueadero | null>(null);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const accion = useAccion();

  const conteo = (estado: string) => datos?.filter((p) => p.estado === estado).length ?? 0;
  const exito = (texto: string) => {
    setMensaje(texto);
    setAsignando(null);
    setCreando(false);
    void recargar();
  };

  const liberar = async (p: Parqueadero) => {
    if (!p.asignacion) return;
    const ok = await confirmar({
      titulo: 'Liberar parqueadero',
      mensaje: `¿Liberar la celda ${p.codigo} (placa ${p.asignacion.placa})?`,
      textoConfirmar: 'Liberar',
      peligro: true,
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.post(`/api/parqueaderos/asignaciones/${p.asignacion!.id_asignacion}/liberar`));
    if (r) exito(`Celda ${p.codigo} liberada.`);
  };

  const cambiarMantenimiento = async (p: Parqueadero) => {
    const aMantenimiento = p.estado !== 'MANTENIMIENTO';
    const ok = await confirmar({
      titulo: aMantenimiento ? 'Marcar en mantenimiento' : 'Habilitar celda',
      mensaje: aMantenimiento
        ? `¿Marcar la celda ${p.codigo} en mantenimiento? No podrá asignarse mientras tanto.`
        : `¿Habilitar nuevamente la celda ${p.codigo}?`,
      textoConfirmar: aMantenimiento ? 'Marcar' : 'Habilitar',
      peligro: aMantenimiento,
    });
    if (!ok) return;
    const r = await accion.ejecutar(() => http.put(`/api/parqueaderos/${p.id_parqueadero}`, { estado: aMantenimiento ? 'MANTENIMIENTO' : 'DISPONIBLE' }));
    if (r) exito(aMantenimiento ? `Celda ${p.codigo} en mantenimiento.` : `Celda ${p.codigo} disponible.`);
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Parqueaderos"
        descripcion="Disponibilidad y asignación de celdas de residentes y visitantes"
        acciones={
          <>
            <button className="btn btn-sec" onClick={recargar} disabled={cargando}>
              Actualizar
            </button>
            {esAdmin && (
              <button className="btn btn-prim" onClick={() => setCreando(true)}>
                Nueva celda
              </button>
            )}
          </>
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
        <Campo etiqueta="Tipo de celda">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todas</option>
            <option value="RESIDENTE">Residentes</option>
            <option value="VISITANTE">Visitantes</option>
          </select>
        </Campo>
      </div>
      {datos && (
        <div className="leyenda">
          <span>
            <Badge valor="DISPONIBLE" /> {conteo('DISPONIBLE')}
          </span>
          <span>
            <Badge valor="OCUPADO" /> {conteo('OCUPADO')}
          </span>
          <span>
            <Badge valor="MANTENIMIENTO" /> {conteo('MANTENIMIENTO')}
          </span>
        </div>
      )}
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay parqueaderos registrados.">
        {(celdas) => (
          <div className="celdas">
            {celdas.map((p) => {
              // Portería solo asigna celdas de visitantes; la administración, ambas
              const puedeAsignar = p.estado === 'DISPONIBLE' && (esAdmin || p.tipo === 'VISITANTE');
              return (
                <div key={p.id_parqueadero} className={`celda ${p.estado}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.3rem' }}>
                    <strong>{p.codigo}</strong>
                    <Badge valor={p.estado} />
                  </div>
                  <span className="texto-suave">
                    {etiqueta(p.tipo)}
                    {p.ubicacion && ` · ${p.ubicacion}`}
                  </span>
                  {p.unidad_propietaria && <span>Unidad: {p.unidad_propietaria}</span>}
                  {p.asignacion && (
                    <span>
                      <strong className="mono" style={{ fontSize: '0.95rem' }}>
                        {p.asignacion.placa}
                      </strong>{' '}
                      ({etiqueta(p.asignacion.tipo_vehiculo)})
                      <br />
                      {p.asignacion.visitante ?? p.asignacion.unidad}
                      <br />
                      <span className="texto-suave">Desde {formatoFechaHora(p.asignacion.fecha_inicio)}</span>
                    </span>
                  )}
                  <div className="celda-acciones">
                    {puedeAsignar && (
                      <button className="btn btn-prim btn-sm" onClick={() => setAsignando(p)}>
                        Asignar
                      </button>
                    )}
                    {p.asignacion && (
                      <button className="btn btn-sec btn-sm" disabled={accion.enviando} onClick={() => liberar(p)}>
                        Liberar
                      </button>
                    )}
                    {esAdmin && p.estado !== 'OCUPADO' && (
                      <button className="btn btn-sec btn-sm" disabled={accion.enviando} onClick={() => cambiarMantenimiento(p)}>
                        {p.estado === 'MANTENIMIENTO' ? 'Habilitar' : 'Mantenimiento'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Contenido>

      <Modal titulo={`Asignar celda ${asignando?.codigo ?? ''}`} abierto={!!asignando} onCerrar={() => setAsignando(null)}>
        {asignando && <FormAsignar celda={asignando} onExito={() => exito(`Celda ${asignando.codigo} asignada.`)} />}
      </Modal>
      <Modal titulo="Nueva celda de parqueadero" abierto={creando} onCerrar={() => setCreando(false)}>
        {creando && <FormCelda onExito={() => exito('Celda creada.')} />}
      </Modal>
    </>
  );
}

function FormAsignar({ celda, onExito }: { celda: Parqueadero; onExito: () => void }) {
  const esVisitante = celda.tipo === 'VISITANTE';
  const visitas = useCarga(() => (esVisitante ? http.get<Visita[]>('/api/visitas?estado=INGRESADA') : Promise.resolve([] as Visita[])), [esVisitante]);
  const [idVisita, setIdVisita] = useState('');
  const [idUnidad, setIdUnidad] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('CARRO');
  const { enviando, error, ejecutar } = useAccion();

  // Visitas ingresadas que aún no tienen parqueadero
  const disponibles = visitas.datos?.filter((v) => !v.parqueadero) ?? [];

  const elegirVisita = (id: string) => {
    setIdVisita(id);
    const v = disponibles.find((x) => String(x.id_visita) === id);
    if (v?.visitante.placa_vehiculo) setPlaca(v.visitante.placa_vehiculo);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post(`/api/parqueaderos/${celda.id_parqueadero}/asignar`, {
        placa: placa.trim().toUpperCase(),
        tipo_vehiculo: tipoVehiculo,
        ...(esVisitante ? { id_visita: Number(idVisita) } : { id_unidad: Number(idUnidad) }),
      }),
    );
    if (r) onExito();
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        {esVisitante ? (
          <Campo etiqueta="Visita ingresada" ancho="completo" ayuda="Solo visitas con ingreso registrado y sin parqueadero.">
            <select required value={idVisita} onChange={(e) => elegirVisita(e.target.value)} disabled={visitas.cargando}>
              <option value="">{visitas.cargando ? 'Cargando visitas…' : disponibles.length ? 'Seleccione la visita' : 'No hay visitas ingresadas sin parqueadero'}</option>
              {disponibles.map((v) => (
                <option key={v.id_visita} value={v.id_visita}>
                  {v.visitante.nombre} → {v.unidad}
                  {v.visitante.placa_vehiculo ? ` (${v.visitante.placa_vehiculo})` : ''}
                </option>
              ))}
            </select>
          </Campo>
        ) : (
          <Campo etiqueta="Unidad" ancho="completo">
            <SelectorUnidad valor={idUnidad} onCambio={setIdUnidad} requerido />
          </Campo>
        )}
        <Campo etiqueta="Placa">
          <input required pattern="[A-Za-z0-9\-]{5,10}" title="5 a 10 letras o números" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
        </Campo>
        <Campo etiqueta="Tipo de vehículo">
          <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)}>
            <option value="CARRO">Carro</option>
            <option value="MOTO">Moto</option>
          </select>
        </Campo>
      </div>
      {visitas.error && <Alerta tipo="error">{visitas.error}</Alerta>}
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Asignar
        </BotonCarga>
      </div>
    </form>
  );
}

function FormCelda({ onExito }: { onExito: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState('VISITANTE');
  const [ubicacion, setUbicacion] = useState('');
  const [unidad, setUnidad] = useState('');
  const { enviando, error, ejecutar } = useAccion();
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post('/api/parqueaderos', {
        codigo: codigo.trim(),
        tipo,
        ubicacion: ubicacion.trim() || undefined,
        id_unidad_propietaria: tipo === 'RESIDENTE' && unidad ? Number(unidad) : undefined,
      }),
    );
    if (r) onExito();
  };
  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Código">
          <input required maxLength={10} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="V-05" />
        </Campo>
        <Campo etiqueta="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="VISITANTE">Visitante</option>
            <option value="RESIDENTE">Residente</option>
          </select>
        </Campo>
        <Campo etiqueta="Ubicación (opcional)">
          <input maxLength={60} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Sótano 1" />
        </Campo>
        {tipo === 'RESIDENTE' && (
          <Campo etiqueta="Unidad propietaria (opcional)">
            <SelectorUnidad valor={unidad} onCambio={setUnidad} opcionVacia="Sin unidad propietaria" />
          </Campo>
        )}
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Crear celda
        </BotonCarga>
      </div>
    </form>
  );
}
