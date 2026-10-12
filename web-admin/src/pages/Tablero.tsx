/** Tablero con los indicadores principales del conjunto (RF-09). */
import { http } from '../api/client';
import type { Tablero as TipoTablero } from '../api/tipos';
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
      {cargando && !datos && <Cargando />}
      {error && <ErrorVista mensaje={error} reintentar={recargar} />}
      {datos && !error && (
        <div className="indicadores">
          <Indicador titulo="Recaudo del mes" valor={formatoCOP(datos.recaudoMes)} tono="verde" detalle="Pagos aprobados en el mes" />
          <Indicador
            titulo="Cartera pendiente"
            valor={formatoCOP(datos.carteraPendiente)}
            tono="rojo"
            detalle={`${formatoNumero(datos.cuotasPendientes)} cuota(s) abiertas`}
          />
          <Indicador titulo="PQRS abiertas" valor={formatoNumero(datos.pqrsAbiertas)} tono="ambar" detalle="Radicadas o en trámite" />
          <Indicador titulo="Reservas de hoy" valor={formatoNumero(datos.reservasHoy)} tono="azul" detalle="Confirmadas" />
          <Indicador titulo="Visitas de hoy" valor={formatoNumero(datos.visitasHoy)} tono="azul" detalle="Programadas para hoy" />
          <Indicador titulo="Unidades" valor={formatoNumero(datos.unidades)} detalle="Registradas en el conjunto" />
          <Indicador titulo="Usuarios con rol" valor={formatoNumero(datos.usuarios)} detalle="Asignaciones de rol activas" />
        </div>
      )}
    </>
  );
}

function Indicador({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: 'verde' | 'rojo' | 'ambar' | 'azul' }) {
  return (
    <div className={`indicador ${tono ?? ''}`}>
      <span>{titulo}</span>
      <strong>{valor}</strong>
      {detalle && <small>{detalle}</small>}
    </div>
  );
}
