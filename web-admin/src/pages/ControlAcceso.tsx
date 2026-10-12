/** Control de acceso en portería (CU-45/CU-46): validación del código QR y asignación de parqueadero de visitante. */
import { useState, type FormEvent } from 'react';
import { ApiError, http } from '../api/client';
import type { Parqueadero, Visita } from '../api/tipos';
import { LectorQR } from '../components/LectorQR';
import { Alerta, BotonCarga, Campo, EncabezadoPagina } from '../components/ui';
import { useAccion, useCarga } from '../hooks/useCarga';
import { formatoFecha, formatoFechaHora } from '../utils/formato';

type Resultado = { autorizado: true; visita: Visita } | { autorizado: false; motivo: string };

export function ControlAcceso() {
  const [codigo, setCodigo] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [errorRed, setErrorRed] = useState<string | null>(null);

  const validar = async (valor: string) => {
    const limpio = valor.trim();
    if (!limpio) return;
    setValidando(true);
    setErrorRed(null);
    setResultado(null);
    try {
      const r = await http.post<{ autorizado: true; visita: Visita }>('/api/visitas/validar', { codigo: limpio });
      setResultado({ autorizado: true, visita: r.visita });
    } catch (e) {
      if (e instanceof ApiError && (e.status === 422 || e.status === 400)) {
        // 422 INGRESO_NO_AUTORIZADO trae el motivo; 400 indica un código con formato inválido
        const motivo = e.status === 400 ? 'El código no tiene un formato válido.' : e.message.replace(/^Ingreso no autorizado:\s*/i, '');
        setResultado({ autorizado: false, motivo: motivo.charAt(0).toUpperCase() + motivo.slice(1) });
      } else {
        setErrorRed(e instanceof Error ? e.message : 'Error al validar el código');
      }
    } finally {
      setValidando(false);
    }
  };

  const enviarManual = (e: FormEvent) => {
    e.preventDefault();
    void validar(codigo);
  };

  const nuevaLectura = () => {
    setResultado(null);
    setCodigo('');
    setErrorRed(null);
  };

  return (
    <>
      <EncabezadoPagina titulo="Control de acceso" descripcion="Valide el código QR de los visitantes pre-registrados" />
      <div className="acceso-grid">
        <div>
          <div className="tarjeta">
            <h2 style={{ marginBottom: '0.8rem' }}>Escanear código QR</h2>
            <LectorQR
              pausado={!!resultado || validando}
              onLeido={(texto) => {
                setCodigo(texto);
                void validar(texto);
              }}
            />
          </div>
          <form className="tarjeta" onSubmit={enviarManual}>
            <h2 style={{ marginBottom: '0.8rem' }}>Ingreso manual del código</h2>
            <Campo etiqueta="Código de la visita" ayuda="Use esta opción si la cámara no está disponible o el código no se puede leer.">
              <input className="mono" required minLength={10} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Pegue o escriba el código" />
            </Campo>
            <div className="form-acciones">
              <BotonCarga type="submit" cargando={validando}>
                Validar
              </BotonCarga>
            </div>
          </form>
        </div>
        <div>
          {errorRed && (
            <Alerta tipo="error" onCerrar={() => setErrorRed(null)}>
              {errorRed}
            </Alerta>
          )}
          {!resultado && !validando && (
            <div className="estado-vista" style={{ minHeight: 280, justifyContent: 'center' }}>
              <span style={{ fontSize: '2rem' }} aria-hidden="true">
                ⛨
              </span>
              <span>El resultado de la validación aparecerá aquí.</span>
            </div>
          )}
          {validando && (
            <div className="estado-vista" style={{ minHeight: 280, justifyContent: 'center' }} role="status">
              <span className="spinner" />
              <span>Validando código…</span>
            </div>
          )}
          {resultado && (
            <>
              <ResultadoAcceso resultado={resultado} />
              {resultado.autorizado && resultado.visita.ingresa_vehiculo && <AsignarParqueaderoVisita visita={resultado.visita} />}
              <div className="form-acciones" style={{ justifyContent: 'center' }}>
                <button className="btn btn-prim" onClick={nuevaLectura}>
                  Validar otro código
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function ResultadoAcceso({ resultado }: { resultado: Resultado }) {
  if (!resultado.autorizado) {
    return (
      <div className="resultado-acceso denegado" role="alert" aria-live="assertive">
        <div className="simbolo" aria-hidden="true">
          ✕
        </div>
        <h2>INGRESO NO AUTORIZADO</h2>
        <p className="motivo">{resultado.motivo}</p>
      </div>
    );
  }
  const v = resultado.visita;
  return (
    <div className="resultado-acceso autorizado" role="status" aria-live="assertive">
      <div className="simbolo" aria-hidden="true">
        ✓
      </div>
      <h2>INGRESO AUTORIZADO</h2>
      <dl>
        <dt>Visitante</dt>
        <dd>{v.visitante.nombre}</dd>
        <dt>Documento</dt>
        <dd>
          {v.visitante.tipo_documento} {v.visitante.numero_documento}
        </dd>
        <dt>Unidad</dt>
        <dd>{v.unidad}</dd>
        <dt>Anfitrión</dt>
        <dd>
          {v.anfitrion}
          {v.anfitrion_telefono && ` · ${v.anfitrion_telefono}`}
        </dd>
        <dt>Franja</dt>
        <dd>
          {formatoFecha(v.fecha_programada)} · {v.hora_desde}–{v.hora_hasta}
        </dd>
        {v.motivo && (
          <>
            <dt>Motivo</dt>
            <dd>{v.motivo}</dd>
          </>
        )}
        <dt>Vehículo</dt>
        <dd>{v.visitante.placa_vehiculo ?? 'No'}</dd>
        <dt>Ingreso</dt>
        <dd>{formatoFechaHora(v.fecha_hora_ingreso)}</dd>
      </dl>
    </div>
  );
}

/** Asigna una celda de visitante disponible a la visita que acaba de ingresar con vehículo. */
function AsignarParqueaderoVisita({ visita }: { visita: Visita }) {
  const celdas = useCarga(() => http.get<Parqueadero[]>('/api/parqueaderos?tipo=VISITANTE'));
  const [celda, setCelda] = useState('');
  const [placa, setPlaca] = useState(visita.visitante.placa_vehiculo ?? '');
  const [tipoVehiculo, setTipoVehiculo] = useState('CARRO');
  const [asignada, setAsignada] = useState<string | null>(null);
  const { enviando, error, ejecutar } = useAccion();
  const libres = celdas.datos?.filter((c) => c.estado === 'DISPONIBLE') ?? [];

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    const r = await ejecutar(() =>
      http.post(`/api/parqueaderos/${celda}/asignar`, { placa: placa.trim().toUpperCase(), tipo_vehiculo: tipoVehiculo, id_visita: visita.id_visita }),
    );
    if (r) setAsignada(libres.find((c) => String(c.id_parqueadero) === celda)?.codigo ?? celda);
  };

  if (asignada) {
    return (
      <Alerta tipo="exito">
        Parqueadero <strong>{asignada}</strong> asignado a la placa <strong>{placa.toUpperCase()}</strong>.
      </Alerta>
    );
  }

  return (
    <form className="tarjeta" onSubmit={enviar} style={{ marginTop: '1rem' }}>
      <h2 style={{ marginBottom: '0.8rem' }}>Asignar parqueadero de visitante</h2>
      {error && <Alerta tipo="error">{error}</Alerta>}
      {celdas.error && <Alerta tipo="error">{celdas.error}</Alerta>}
      <div className="formulario">
        <Campo etiqueta="Celda disponible">
          <select required value={celda} onChange={(e) => setCelda(e.target.value)} disabled={celdas.cargando}>
            <option value="">{celdas.cargando ? 'Cargando…' : libres.length ? 'Seleccione la celda' : 'No hay celdas disponibles'}</option>
            {libres.map((c) => (
              <option key={c.id_parqueadero} value={c.id_parqueadero}>
                {c.codigo}
                {c.ubicacion ? ` · ${c.ubicacion}` : ''}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Placa">
          <input required pattern="[A-Za-z0-9\-]{5,10}" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
        </Campo>
        <Campo etiqueta="Tipo de vehículo">
          <select value={tipoVehiculo} onChange={(e) => setTipoVehiculo(e.target.value)}>
            <option value="CARRO">Carro</option>
            <option value="MOTO">Moto</option>
          </select>
        </Campo>
      </div>
      <div className="form-acciones">
        <BotonCarga type="submit" cargando={enviando}>
          Asignar parqueadero
        </BotonCarga>
      </div>
    </form>
  );
}
