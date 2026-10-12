/** Finanzas (RF-02): cuotas, generación del periodo, intereses de mora, pagos manuales, comprobantes y recordatorios. */
import { useState, type FormEvent } from 'react';
import { descargarArchivo, http } from '../api/client';
import type { Cuota, Pago } from '../api/tipos';
import { SelectorUnidad } from '../components/SelectorUnidad';
import { Alerta, Badge, BotonCarga, Campo, confirmar, Contenido, EncabezadoPagina, Modal } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { etiqueta, formatoCOP, formatoFecha, formatoFechaHora, periodoActual } from '../utils/formato';

type Pestana = 'cuotas' | 'pagos';
type ModalAbierto = null | 'generar' | 'intereses' | 'pago';

export function Finanzas() {
  const [pestana, setPestana] = useState<Pestana>('cuotas');
  const [modal, setModal] = useState<ModalAbierto>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [version, setVersion] = useState(0); // fuerza la recarga de las listas tras una acción
  const recordatorios = useAccion();

  const exito = (texto: string) => {
    setMensaje({ tipo: 'exito', texto });
    setModal(null);
    setVersion((v) => v + 1);
  };

  const enviarRecordatorios = async () => {
    const ok = await confirmar({
      titulo: 'Enviar recordatorios',
      mensaje: 'Se enviará ahora una notificación a los responsables de pago de las cuotas abiertas. ¿Desea continuar?',
      textoConfirmar: 'Enviar',
    });
    if (!ok) return;
    const r = await recordatorios.ejecutar(() => http.post<{ cuotas: number; notificaciones: number }>('/api/cuotas/recordatorios'));
    if (r) setMensaje({ tipo: 'exito', texto: `Recordatorios enviados: ${r.notificaciones} notificación(es) sobre ${r.cuotas} cuota(s).` });
  };

  return (
    <>
      <EncabezadoPagina
        titulo="Finanzas"
        descripcion="Cuotas de administración, pagos y cartera"
        acciones={
          <>
            <button className="btn btn-prim" onClick={() => setModal('generar')}>
              Generar cuotas
            </button>
            <button className="btn btn-sec" onClick={() => setModal('intereses')}>
              Liquidar intereses
            </button>
            <button className="btn btn-sec" onClick={() => setModal('pago')}>
              Registrar pago manual
            </button>
            <BotonCarga className="btn btn-sec" cargando={recordatorios.enviando} onClick={enviarRecordatorios}>
              Enviar recordatorios
            </BotonCarga>
          </>
        }
      />
      {mensaje && (
        <Alerta tipo={mensaje.tipo} onCerrar={() => setMensaje(null)}>
          {mensaje.texto}
        </Alerta>
      )}
      {recordatorios.error && (
        <Alerta tipo="error" onCerrar={() => recordatorios.setError(null)}>
          {recordatorios.error}
        </Alerta>
      )}
      <div className="pestanas" role="tablist">
        <button className={`pestana ${pestana === 'cuotas' ? 'activa' : ''}`} onClick={() => setPestana('cuotas')} role="tab">
          Cuotas
        </button>
        <button className={`pestana ${pestana === 'pagos' ? 'activa' : ''}`} onClick={() => setPestana('pagos')} role="tab">
          Historial de pagos
        </button>
      </div>
      {pestana === 'cuotas' ? <ListaCuotas version={version} /> : <ListaPagos version={version} />}

      <Modal titulo="Generar cuotas del periodo" abierto={modal === 'generar'} onCerrar={() => setModal(null)}>
        <FormGenerar onExito={(r) => exito(`Cuotas generadas: ${r.generadas}. Omitidas (ya existían): ${r.omitidas}.`)} />
      </Modal>
      <Modal titulo="Liquidar intereses de mora" abierto={modal === 'intereses'} onCerrar={() => setModal(null)}>
        <FormIntereses onExito={(r) => exito(`Se crearon ${r.creadas} cuota(s) de interés de mora.`)} />
      </Modal>
      <Modal titulo="Registrar pago manual" abierto={modal === 'pago'} onCerrar={() => setModal(null)}>
        <FormPagoManual onExito={() => exito('Pago registrado y aplicado a las cuotas abiertas de la unidad.')} />
      </Modal>
    </>
  );
}

function ListaCuotas({ version }: { version: number }) {
  const [estado, setEstado] = useState('');
  const [periodo, setPeriodo] = useState('');
  const { datos, cargando, error, recargar } = useCarga(() => {
    const q = new URLSearchParams();
    if (estado) q.set('estado', estado);
    if (periodo) q.set('periodo', periodo);
    return http.get<Cuota[]>(`/api/cuotas?${q}`);
  }, [estado, periodo, version]);

  const totalSaldo = datos?.reduce((s, c) => s + Number(c.saldo), 0) ?? 0;

  return (
    <>
      <div className="filtros">
        <Campo etiqueta="Estado">
          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="ABIERTAS">Abiertas (pendiente, parcial, vencida)</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="VENCIDA">Vencida</option>
            <option value="PAGADA">Pagada</option>
          </select>
        </Campo>
        <Campo etiqueta="Periodo">
          <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </Campo>
        {(estado || periodo) && (
          <button
            className="btn btn-sec"
            onClick={() => {
              setEstado('');
              setPeriodo('');
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="No hay cuotas con los filtros seleccionados.">
        {(cuotas) => (
          <>
            <p className="texto-suave">
              {cuotas.length} cuota(s) · Saldo total: <strong>{formatoCOP(totalSaldo)}</strong>
            </p>
            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Periodo</th>
                    <th>Concepto</th>
                    <th>Vence</th>
                    <th className="numero">Valor</th>
                    <th className="numero">Saldo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {cuotas.map((c) => (
                    <tr key={c.id_cuota}>
                      <td>{c.unidad}</td>
                      <td>{c.periodo}</td>
                      <td>{etiqueta(c.concepto)}</td>
                      <td className="nowrap">{formatoFecha(c.fecha_vencimiento)}</td>
                      <td className="numero">{formatoCOP(c.valor)}</td>
                      <td className="numero">{formatoCOP(c.saldo)}</td>
                      <td>
                        <Badge valor={c.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Contenido>
    </>
  );
}

function ListaPagos({ version }: { version: number }) {
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Pago[]>('/api/pagos'), [version]);
  const [descargando, setDescargando] = useState<number | null>(null);
  const [errorDescarga, setErrorDescarga] = useState<string | null>(null);

  const descargar = async (p: Pago) => {
    setDescargando(p.id_pago);
    setErrorDescarga(null);
    try {
      const nombre = typeof p.comprobante === 'string' ? p.comprobante : `comprobante-${p.id_pago}`;
      await descargarArchivo(`/api/pagos/${p.id_pago}/comprobante`, `${nombre}.pdf`);
    } catch (e) {
      setErrorDescarga(e instanceof Error ? e.message : 'No fue posible descargar el comprobante');
    } finally {
      setDescargando(null);
    }
  };

  return (
    <>
      {errorDescarga && (
        <Alerta tipo="error" onCerrar={() => setErrorDescarga(null)}>
          {errorDescarga}
        </Alerta>
      )}
      <Contenido cargando={cargando} error={error} datos={datos} reintentar={recargar} vacio="Aún no hay pagos registrados.">
        {(pagos) => (
          <div className="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Unidad</th>
                  <th>Pagador</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th>Cuotas</th>
                  <th className="numero">Valor</th>
                  <th>Estado</th>
                  <th>Comprobante</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id_pago}>
                    <td className="nowrap">{formatoFechaHora(p.fecha_confirmacion ?? p.fecha_creacion)}</td>
                    <td>{p.unidad}</td>
                    <td>{p.pagador ?? '—'}</td>
                    <td>{etiqueta(p.metodo_pago)}</td>
                    <td className="mono recortar" title={p.referencia ?? ''}>
                      {p.referencia ?? '—'}
                    </td>
                    <td>{p.cuotas.map((c) => `${c.periodo} (${etiqueta(c.concepto)})`).join(', ') || '—'}</td>
                    <td className="numero">{formatoCOP(p.valor_total)}</td>
                    <td>
                      <Badge valor={p.estado} />
                    </td>
                    <td>
                      {p.comprobante ? (
                        <BotonCarga className="btn btn-sec btn-sm" cargando={descargando === p.id_pago} onClick={() => descargar(p)}>
                          PDF
                        </BotonCarga>
                      ) : (
                        <span className="texto-suave">—</span>
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

function FormGenerar({ onExito }: { onExito: (r: { generadas: number; omitidas: number }) => void }) {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [presupuesto, setPresupuesto] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [concepto, setConcepto] = useState('ORDINARIA');
  const { enviando, error, ejecutar } = useAccion();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post<{ generadas: number; omitidas: number }>('/api/cuotas/generar', {
        periodo,
        presupuesto_mensual: Number(presupuesto),
        fecha_vencimiento: vencimiento,
        concepto,
      }),
    );
    if (r) onExito(r);
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <p className="texto-suave" style={{ marginBottom: '1rem' }}>
        El presupuesto mensual se distribuye entre las unidades según su coeficiente de copropiedad.
      </p>
      <div className="formulario">
        <Campo etiqueta="Periodo">
          <input type="month" required value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Concepto">
          <select value={concepto} onChange={(e) => setConcepto(e.target.value)}>
            <option value="ORDINARIA">Ordinaria</option>
            <option value="EXTRAORDINARIA">Extraordinaria</option>
          </select>
        </Campo>
        <Campo etiqueta="Presupuesto mensual (COP)" ayuda={presupuesto ? formatoCOP(Number(presupuesto)) : undefined}>
          <input type="number" min={1} step={1} required value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} />
        </Campo>
        <Campo etiqueta="Fecha de vencimiento">
          <input type="date" required value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Generar cuotas
        </BotonCarga>
      </div>
    </form>
  );
}

function FormIntereses({ onExito }: { onExito: (r: { creadas: number }) => void }) {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [tasa, setTasa] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const { enviando, error, ejecutar } = useAccion();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await confirmar({
      titulo: 'Liquidar intereses',
      mensaje: `Se crearán cuotas de interés de mora (${tasa}% mensual) sobre el saldo vencido de cada unidad para el periodo ${periodo}. ¿Continuar?`,
      textoConfirmar: 'Liquidar',
    });
    if (!ok) return;
    const r = await ejecutar(() =>
      http.post<{ creadas: number }>('/api/cuotas/intereses', { periodo, tasa_mensual: Number(tasa), fecha_vencimiento: vencimiento }),
    );
    if (r) onExito(r);
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <p className="texto-suave" style={{ marginBottom: '1rem' }}>
        Ley 675 de 2001: la tasa de mora no puede superar 1,5 veces el interés bancario corriente certificado por la Superintendencia Financiera.
      </p>
      <div className="formulario">
        <Campo etiqueta="Periodo">
          <input type="month" required value={periodo} onChange={(e) => setPeriodo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Tasa mensual (%)">
          <input type="number" min={0.01} max={5} step={0.01} required value={tasa} onChange={(e) => setTasa(e.target.value)} />
        </Campo>
        <Campo etiqueta="Fecha de vencimiento">
          <input type="date" required value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Liquidar intereses
        </BotonCarga>
      </div>
    </form>
  );
}

function FormPagoManual({ onExito }: { onExito: () => void }) {
  const [unidad, setUnidad] = useState('');
  const [valor, setValor] = useState('');
  const [metodo, setMetodo] = useState('TRANSFERENCIA');
  const [referencia, setReferencia] = useState('');
  const { enviando, error, ejecutar } = useAccion();

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post('/api/pagos/manual', {
        id_unidad: Number(unidad),
        valor: Number(valor),
        metodo_pago: metodo,
        referencia: referencia.trim() || undefined,
      }),
    );
    if (r) onExito();
  };

  return (
    <form onSubmit={enviar}>
      {error && <Alerta tipo="error">{error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Unidad">
          <SelectorUnidad valor={unidad} onCambio={setUnidad} requerido />
        </Campo>
        <Campo etiqueta="Valor (COP)" ayuda={valor ? formatoCOP(Number(valor)) : undefined}>
          <input type="number" min={1} step={1} required value={valor} onChange={(e) => setValor(e.target.value)} />
        </Campo>
        <Campo etiqueta="Método de pago">
          <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="EFECTIVO">Efectivo</option>
          </select>
        </Campo>
        <Campo etiqueta="Referencia (opcional)">
          <input maxLength={60} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Registrar pago
        </BotonCarga>
      </div>
    </form>
  );
}
