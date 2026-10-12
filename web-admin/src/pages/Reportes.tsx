/** Reportes (RF-08): consulta en pantalla y exportación a PDF y XLSX. */
import { useState, type FormEvent } from 'react';
import { descargarArchivo, http } from '../api/client';
import type { Reporte } from '../api/tipos';
import { Alerta, BotonCarga, Campo, Cargando, EncabezadoPagina, ErrorVista, Vacio } from '../components/ui';
import { formatoCOP, formatoNumero, hoyColombia } from '../utils/formato';

const TIPOS = [
  { valor: 'recaudo', texto: 'Recaudo' },
  { valor: 'cartera', texto: 'Cartera' },
  { valor: 'pqrs', texto: 'PQRS' },
  { valor: 'reservas', texto: 'Reservas' },
  { valor: 'visitas', texto: 'Visitas' },
];

// Columnas cuyo contenido es monetario (se formatean como COP)
const COLUMNAS_MONEDA = /valor|saldo|total|recaudo|monto|costo|cartera/i;

export function Reportes() {
  const hoy = hoyColombia();
  const [tipo, setTipo] = useState('recaudo');
  const [desde, setDesde] = useState(`${hoy.slice(0, 7)}-01`);
  const [hasta, setHasta] = useState(hoy);
  const [reporte, setReporte] = useState<Reporte | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportando, setExportando] = useState<'pdf' | 'xlsx' | null>(null);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  const consulta = (formato: string) => `/api/reportes/${tipo}?${new URLSearchParams({ desde, hasta, formato })}`;

  const consultar = async (e?: FormEvent) => {
    e?.preventDefault();
    if (desde > hasta) {
      setError('La fecha inicial debe ser anterior o igual a la final.');
      return;
    }
    setCargando(true);
    setError(null);
    try {
      setReporte(await http.get<Reporte>(consulta('json')));
    } catch (err) {
      setReporte(null);
      setError(err instanceof Error ? err.message : 'Error al consultar el reporte');
    } finally {
      setCargando(false);
    }
  };

  const exportar = async (formato: 'pdf' | 'xlsx') => {
    setExportando(formato);
    setErrorExportar(null);
    try {
      await descargarArchivo(consulta(formato), `reporte-${tipo}-${desde}-${hasta}.${formato}`);
    } catch (err) {
      setErrorExportar(err instanceof Error ? err.message : 'No fue posible exportar el reporte');
    } finally {
      setExportando(null);
    }
  };

  const formatoCelda = (columna: string, valor: string | number | null) => {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (typeof valor === 'number') return COLUMNAS_MONEDA.test(columna) ? formatoCOP(valor) : formatoNumero(valor);
    return valor;
  };

  return (
    <>
      <EncabezadoPagina titulo="Reportes" descripcion="Consulte los reportes del conjunto y expórtelos a PDF o Excel" />
      <form className="tarjeta" onSubmit={consultar}>
        <div className="filtros" style={{ marginBottom: 0 }}>
          <Campo etiqueta="Tipo de reporte">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.texto}
                </option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Desde">
            <input type="date" required value={desde} onChange={(e) => setDesde(e.target.value)} />
          </Campo>
          <Campo etiqueta="Hasta">
            <input type="date" required value={hasta} onChange={(e) => setHasta(e.target.value)} />
          </Campo>
          <BotonCarga type="submit" cargando={cargando}>
            Consultar
          </BotonCarga>
        </div>
      </form>

      {errorExportar && (
        <Alerta tipo="error" onCerrar={() => setErrorExportar(null)}>
          {errorExportar}
        </Alerta>
      )}
      {cargando && <Cargando texto="Generando reporte…" />}
      {error && !cargando && <ErrorVista mensaje={error} reintentar={() => consultar()} />}
      {!reporte && !cargando && !error && <Vacio texto="Seleccione el tipo de reporte y el rango de fechas, y pulse Consultar." />}
      {reporte && !cargando && !error && (
        <div className="tarjeta">
          <div className="tarjeta-titulo">
            <div>
              <h2>{reporte.titulo}</h2>
              {reporte.subtitulo && <p className="texto-suave">{reporte.subtitulo}</p>}
            </div>
            <div className="acciones">
              <BotonCarga className="btn btn-sec" cargando={exportando === 'pdf'} onClick={() => exportar('pdf')}>
                Exportar PDF
              </BotonCarga>
              <BotonCarga className="btn btn-sec" cargando={exportando === 'xlsx'} onClick={() => exportar('xlsx')}>
                Exportar Excel
              </BotonCarga>
            </div>
          </div>
          {reporte.resumen && Object.keys(reporte.resumen).length > 0 && (
            <div className="resumen">
              {Object.entries(reporte.resumen).map(([clave, valor]) => (
                <div key={clave}>
                  <span>{clave.replace(/_/g, ' ')}</span>
                  <strong>{formatoCelda(clave, valor)}</strong>
                </div>
              ))}
            </div>
          )}
          {reporte.filas.length === 0 ? (
            <Vacio texto="El reporte no tiene registros en el rango seleccionado." />
          ) : (
            <div className="tabla-contenedor">
              <table>
                <thead>
                  <tr>
                    {reporte.columnas.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reporte.filas.map((fila, i) => (
                    <tr key={i}>
                      {fila.map((celda, j) => (
                        <td key={j} className={typeof celda === 'number' ? 'numero' : undefined}>
                          {formatoCelda(reporte.columnas[j] ?? '', celda)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
