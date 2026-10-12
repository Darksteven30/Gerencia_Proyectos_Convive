/** Tablero con los indicadores principales del conjunto (RF-09) y el resumen financiero de la pantalla General de la app. */
import { useState } from 'react';
import { http } from '../api/client';
import type { Tablero as TipoTablero } from '../api/tipos';
import { Icono } from '../components/Marca';
import { Cargando, EncabezadoPagina, ErrorVista } from '../components/ui';
import { useCarga } from '../hooks/useCarga';
import { formatoCOP, formatoNumero, formatoFecha, hoyColombia } from '../utils/formato';

export function Tablero() {
  const { datos, cargando, error, recargar } = useCarga(() => http.get<TipoTablero>('/api/admin/tablero'));

  return (
    <>
      <EncabezadoPagina
        titulo="Tablero"
        descripcion={`Resumen del conjunto al ${formatoFecha(hoyColombia())}`}
        acciones={
          <button className="btn btn-sec" onClick={recargar} disabled={cargando}>
            Actualizar
          </button>
        }
      />
      <ResumenFinanciero />
      {cargando && !datos && <Cargando />}
      {error && <ErrorVista mensaje={error} reintentar={recargar} />}
      {datos && !error && (
        <div className="indicadores">
          <Indicador titulo="Recaudo del mes" valor={formatoCOP(datos.recaudoMes)} icono="subir" tono="verde" detalle="Pagos aprobados en el mes" />
          <Indicador
            titulo="Cartera pendiente"
            valor={formatoCOP(datos.carteraPendiente)}
            icono="bajar"
            tono="rojo"
            detalle={`${formatoNumero(datos.cuotasPendientes)} cuota(s) abiertas`}
          />
          <Indicador titulo="PQRS abiertas" valor={formatoNumero(datos.pqrsAbiertas)} icono="pqrs" tono="ambar" detalle="Radicadas o en trámite" />
          <Indicador titulo="Reservas de hoy" valor={formatoNumero(datos.reservasHoy)} icono="reservas" tono="azul" detalle="Confirmadas" />
          <Indicador titulo="Visitas de hoy" valor={formatoNumero(datos.visitasHoy)} icono="visitas" tono="azul" detalle="Programadas para hoy" />
          <Indicador titulo="Unidades" valor={formatoNumero(datos.unidades)} icono="unidades" detalle="Registradas en el conjunto" />
          <Indicador titulo="Usuarios con rol" valor={formatoNumero(datos.usuarios)} icono="usuarios" detalle="Asignaciones de rol activas" />
        </div>
      )}
    </>
  );
}

function Indicador({
  titulo,
  valor,
  detalle,
  icono,
  tono,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
  icono: string;
  tono?: 'verde' | 'rojo' | 'ambar' | 'azul';
}) {
  return (
    <div className={`indicador ${tono ?? ''}`}>
      <span className="indicador-icono">
        <Icono nombre={icono} tamano={16} />
      </span>
      <span className="indicador-titulo">{titulo}</span>
      <strong>{valor}</strong>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}

// --- Resumen financiero (mismo endpoint que la pantalla General de la app móvil) ---

type Periodo = 'mes' | 'trimestre' | 'semestre' | 'anio';

interface Resumen {
  periodo: Periodo;
  desde: string;
  hasta: string;
  recaudo_periodo: number;
  facturado_periodo: number;
  cartera_pendiente: number;
  movimientos: { mes: string; recaudado: number; pendiente: number }[];
}

const PERIODOS: { valor: Periodo; texto: string }[] = [
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'trimestre', texto: 'Último trimestre' },
  { valor: 'semestre', texto: 'Último semestre' },
  { valor: 'anio', texto: 'Último año' },
];

function ResumenFinanciero() {
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const { datos, cargando, error, recargar } = useCarga(() => http.get<Resumen>(`/api/admin/resumen?periodo=${periodo}`), [periodo]);
  const recaudo = Number(datos?.recaudo_periodo ?? 0);
  const facturado = Number(datos?.facturado_periodo ?? 0);
  const porcentaje = facturado > 0 ? Math.min(100, Math.round((recaudo / facturado) * 100)) : 0;

  return (
    <section className="tarjeta" aria-labelledby="titulo-resumen">
      <div className="tarjeta-titulo">
        <h2 id="titulo-resumen">Resumen financiero</h2>
        <label className="campo campo-en-linea">
          <span className="campo-etiqueta">Periodo</span>
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
            {PERIODOS.map((p) => (
              <option key={p.valor} value={p.valor}>
                {p.texto}
              </option>
            ))}
          </select>
        </label>
      </div>
      {cargando && !datos && <Cargando />}
      {error && <ErrorVista mensaje={error} reintentar={recargar} />}
      {datos && !error && (
        <div className="resumen-financiero">
          <div className="resumen-cifras">
            <div className="cifra-principal">
              <span>Recaudo del periodo</span>
              <strong>{formatoCOP(recaudo)}</strong>
              <small>Facturado {formatoCOP(facturado)}</small>
              <div
                className="barra-progreso"
                role="progressbar"
                aria-valuenow={porcentaje}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Porcentaje recaudado de lo facturado"
              >
                <span style={{ width: `${porcentaje}%` }} />
              </div>
              <small>{porcentaje} % de lo facturado</small>
            </div>
            <div className="cifra-par">
              <div className="cifra-mini">
                <span className="indicador-icono verde">
                  <Icono nombre="subir" tamano={16} />
                </span>
                <span>Total recaudado</span>
                <strong>{formatoCOP(recaudo)}</strong>
              </div>
              <div className="cifra-mini">
                <span className="indicador-icono rojo">
                  <Icono nombre="bajar" tamano={16} />
                </span>
                <span>Cartera pendiente</span>
                <strong>{formatoCOP(datos.cartera_pendiente)}</strong>
              </div>
            </div>
          </div>
          <GraficoMovimientos movimientos={datos.movimientos} />
        </div>
      )}
    </section>
  );
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const nombreMes = (aaaamm: string) => `${MESES[Number(aaaamm.slice(5, 7)) - 1] ?? aaaamm} ${aaaamm.slice(2, 4)}`;

/** Abrevia montos para el eje: 1.500.000 → $1,5 M. */
function abreviar(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)} mil`;
  return `$${v}`;
}

/** Barras agrupadas de recaudado frente a pendiente por mes (SVG sin dependencias), con leyenda y tabla equivalente. */
function GraficoMovimientos({ movimientos }: { movimientos: Resumen['movimientos'] }) {
  const [verTabla, setVerTabla] = useState(false);
  const datos = movimientos.map((m) => ({ ...m, recaudado: Number(m.recaudado), pendiente: Number(m.pendiente) }));
  const maximo = Math.max(1, ...datos.flatMap((m) => [m.recaudado, m.pendiente]));
  // Escala "redonda" para el eje: cuatro divisiones de 1; 2; 2,5 o 5 × 10^n
  const crudo = maximo / 4;
  const potencia = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 2.5, 5, 10].map((f) => f * potencia).find((v) => v >= crudo) ?? crudo;
  const tope = paso * 4;
  const ancho = 640;
  const alto = 220;
  const margen = { izq: 64, der: 12, arr: 12, abj: 28 };
  const areaAncho = ancho - margen.izq - margen.der;
  const areaAlto = alto - margen.arr - margen.abj;
  const grupo = areaAncho / Math.max(1, datos.length);
  const barra = Math.min(28, (grupo - 16) / 2);
  const y = (v: number) => margen.arr + areaAlto - (v / tope) * areaAlto;
  const marcas = [0, 1, 2, 3, 4].map((f) => f * paso);

  /** Barra con extremo superior redondeado (4 px) anclada a la línea base. */
  const rect = (x: number, valor: number) => {
    const h = Math.max(0, (valor / tope) * areaAlto);
    if (h === 0) return '';
    const r = Math.min(4, h, barra / 2);
    const base = margen.arr + areaAlto;
    return `M${x},${base} V${base - h + r} Q${x},${base - h} ${x + r},${base - h} H${x + barra - r} Q${x + barra},${base - h} ${x + barra},${base - h + r} V${base} Z`;
  };

  return (
    <div className="grafico">
      <div className="grafico-cabecera">
        <h3>Movimiento de fondos</h3>
        <ul className="grafico-leyenda">
          <li>
            <span className="muestra recaudado" aria-hidden="true" /> Recaudado
          </li>
          <li>
            <span className="muestra pendiente" aria-hidden="true" /> Pendiente
          </li>
        </ul>
        <button className="btn-enlace" type="button" onClick={() => setVerTabla((v) => !v)} aria-pressed={verTabla}>
          {verTabla ? 'Ver gráfico' : 'Ver como tabla'}
        </button>
      </div>
      {verTabla ? (
        <div className="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th className="numero">Recaudado</th>
                <th className="numero">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {datos.map((m) => (
                <tr key={m.mes}>
                  <td>{nombreMes(m.mes)}</td>
                  <td className="numero">{formatoCOP(m.recaudado)}</td>
                  <td className="numero">{formatoCOP(m.pendiente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <svg viewBox={`0 0 ${ancho} ${alto}`} className="grafico-svg" role="img" aria-label="Recaudado frente a pendiente por mes">
          {marcas.map((v) => (
            <g key={v}>
              <line x1={margen.izq} x2={ancho - margen.der} y1={y(v)} y2={y(v)} className="grafico-rejilla" />
              <text x={margen.izq - 8} y={y(v) + 4} textAnchor="end" className="grafico-eje">
                {abreviar(v)}
              </text>
            </g>
          ))}
          {datos.map((m, i) => {
            const centro = margen.izq + grupo * i + grupo / 2;
            const x1 = centro - barra - 1; // 2 px de separación entre barras del mismo mes
            const x2 = centro + 1;
            return (
              <g key={m.mes}>
                <path d={rect(x1, m.recaudado)} className="barra-recaudado">
                  <title>{`${nombreMes(m.mes)} · Recaudado ${formatoCOP(m.recaudado)}`}</title>
                </path>
                <path d={rect(x2, m.pendiente)} className="barra-pendiente">
                  <title>{`${nombreMes(m.mes)} · Pendiente ${formatoCOP(m.pendiente)}`}</title>
                </path>
                {/* Zona de interacción más grande que las barras para mostrar el detalle al pasar el cursor */}
                <rect x={centro - grupo / 2} y={margen.arr} width={grupo} height={areaAlto} className="grafico-zona">
                  <title>{`${nombreMes(m.mes)}: recaudado ${formatoCOP(m.recaudado)}, pendiente ${formatoCOP(m.pendiente)}`}</title>
                </rect>
                <text x={centro} y={alto - 8} textAnchor="middle" className="grafico-eje">
                  {nombreMes(m.mes)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
