/**
 * Componentes reutilizables de interfaz: badges de estado, estados de carga/vacío/error,
 * modales, confirmaciones, alertas y encabezados de página.
 */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { etiqueta } from '../utils/formato';

// --- Badges de estado ---

type Tono = 'verde' | 'rojo' | 'ambar' | 'azul' | 'gris' | 'morado';

const TONOS: Record<string, Tono> = {
  // Cuotas y pagos
  PAGADA: 'verde',
  APROBADO: 'verde',
  PENDIENTE: 'ambar',
  PARCIAL: 'azul',
  VENCIDA: 'rojo',
  RECHAZADO: 'rojo',
  ANULADO: 'gris',
  // Usuarios y zonas
  ACTIVO: 'verde',
  ACTIVA: 'verde',
  INACTIVO: 'gris',
  INACTIVA: 'gris',
  MANTENIMIENTO: 'ambar',
  OCUPADA: 'azul',
  DESOCUPADA: 'gris',
  // Reservas
  CONFIRMADA: 'verde',
  CANCELADA: 'gris',
  FINALIZADA: 'gris',
  // PQRS
  RADICADA: 'azul',
  EN_TRAMITE: 'ambar',
  RESPONDIDA: 'verde',
  CERRADA: 'gris',
  ALTA: 'rojo',
  MEDIA: 'ambar',
  BAJA: 'gris',
  // Noticias
  BORRADOR: 'ambar',
  PUBLICADA: 'verde',
  ARCHIVADA: 'gris',
  URGENTE: 'rojo',
  COMUNICADO: 'morado',
  NOTICIA: 'azul',
  // Visitas y parqueaderos
  PREREGISTRADA: 'azul',
  INGRESADA: 'verde',
  DISPONIBLE: 'verde',
  OCUPADO: 'rojo',
};

export function Badge({ valor, tono, children }: { valor?: string | null; tono?: Tono; children?: ReactNode }) {
  const t = tono ?? (valor ? TONOS[valor] : undefined) ?? 'gris';
  return <span className={`badge badge-${t}`}>{children ?? etiqueta(valor)}</span>;
}

// --- Estados de carga, vacío y error ---

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="estado-vista" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  );
}

export function Vacio({ texto = 'No hay registros para mostrar.' }: { texto?: string }) {
  return (
    <div className="estado-vista vacio">
      <span aria-hidden="true">∅</span>
      <span>{texto}</span>
    </div>
  );
}

export function ErrorVista({ mensaje, reintentar }: { mensaje: string; reintentar?: () => void }) {
  return (
    <div className="estado-vista error" role="alert">
      <strong>No fue posible cargar la información.</strong>
      <span>{mensaje}</span>
      {reintentar && (
        <button className="btn btn-sec" onClick={reintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Envoltorio que muestra cargando / error / vacío y, si hay datos, el contenido. */
export function Contenido<T>({
  cargando,
  error,
  datos,
  reintentar,
  vacio,
  children,
}: {
  cargando: boolean;
  error: string | null;
  datos: T[] | null;
  reintentar?: () => void;
  vacio?: string;
  children: (datos: T[]) => ReactNode;
}) {
  if (cargando && !datos) return <Cargando />;
  if (error) return <ErrorVista mensaje={error} reintentar={reintentar} />;
  if (!datos || datos.length === 0) return <Vacio texto={vacio} />;
  return <>{children(datos)}</>;
}

export function Alerta({ tipo = 'info', children, onCerrar }: { tipo?: 'info' | 'exito' | 'error' | 'aviso'; children: ReactNode; onCerrar?: () => void }) {
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {onCerrar && (
        <button className="alerta-cerrar" onClick={onCerrar} aria-label="Cerrar mensaje">
          ×
        </button>
      )}
    </div>
  );
}

export function EncabezadoPagina({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <header className="encabezado-pagina">
      <div>
        <h1>{titulo}</h1>
        {descripcion && <p className="texto-suave">{descripcion}</p>}
      </div>
      {acciones && <div className="acciones">{acciones}</div>}
    </header>
  );
}

// --- Modal ---

export function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
  ancho = 560,
}: {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    ref.current?.focus();
    return () => window.removeEventListener('keydown', tecla);
  }, [abierto, onCerrar]);
  if (!abierto) return null;
  return (
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo} style={{ maxWidth: ancho }} ref={ref} tabIndex={-1}>
        <div className="modal-cabecera">
          <h2>{titulo}</h2>
          <button className="btn-icono" onClick={onCerrar} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-cuerpo">{children}</div>
      </div>
    </div>
  );
}

// --- Confirmación antes de acciones destructivas ---

interface PeticionConfirmacion {
  titulo: string;
  mensaje: ReactNode;
  textoConfirmar?: string;
  peligro?: boolean;
  resolver: (ok: boolean) => void;
}

let abrirConfirmacion: ((p: PeticionConfirmacion) => void) | null = null;

/** Muestra un cuadro de confirmación y resuelve true si el usuario acepta. */
export function confirmar(opciones: Omit<PeticionConfirmacion, 'resolver'>): Promise<boolean> {
  return new Promise((resolver) => {
    if (abrirConfirmacion) abrirConfirmacion({ ...opciones, resolver });
    else resolver(window.confirm(typeof opciones.mensaje === 'string' ? opciones.mensaje : opciones.titulo));
  });
}

/** Componente que se monta una vez en la aplicación para atender `confirmar()`. */
export function ProveedorConfirmacion() {
  const [peticion, setPeticion] = useState<PeticionConfirmacion | null>(null);
  useEffect(() => {
    abrirConfirmacion = setPeticion;
    return () => {
      abrirConfirmacion = null;
    };
  }, []);
  if (!peticion) return null;
  const cerrar = (ok: boolean) => {
    peticion.resolver(ok);
    setPeticion(null);
  };
  return (
    <Modal titulo={peticion.titulo} abierto onCerrar={() => cerrar(false)} ancho={440}>
      <div className="confirmacion-mensaje">{peticion.mensaje}</div>
      <div className="form-acciones">
        <button className="btn btn-sec" onClick={() => cerrar(false)}>
          Cancelar
        </button>
        <button className={`btn ${peticion.peligro ? 'btn-peligro' : 'btn-prim'}`} onClick={() => cerrar(true)} autoFocus>
          {peticion.textoConfirmar ?? 'Confirmar'}
        </button>
      </div>
    </Modal>
  );
}

// --- Campos de formulario ---

export function Campo({ etiqueta: texto, children, ayuda, ancho }: { etiqueta: string; children: ReactNode; ayuda?: string; ancho?: 'completo' }) {
  return (
    <label className={`campo ${ancho === 'completo' ? 'campo-completo' : ''}`}>
      <span className="campo-etiqueta">{texto}</span>
      {children}
      {ayuda && <span className="campo-ayuda">{ayuda}</span>}
    </label>
  );
}

export function BotonCarga({
  cargando,
  children,
  className = 'btn btn-prim',
  ...resto
}: ButtonHTMLAttributes<HTMLButtonElement> & { cargando?: boolean }) {
  return (
    <button {...resto} className={className} disabled={cargando || resto.disabled}>
      {cargando && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}
