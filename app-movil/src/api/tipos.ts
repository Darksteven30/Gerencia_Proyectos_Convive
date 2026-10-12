/**
 * Tipos de datos que devuelve la API de Convive (ver docs/API.md).
 */

export type Rol = 'ADMINISTRADOR' | 'JUNTA' | 'PROPIETARIO' | 'RESIDENTE' | 'PORTERIA';

export interface UsuarioSesion {
  id: number;
  correo: string;
  nombre: string;
  roles: Rol[];
  idConjunto: number;
}

export interface RespuestaSesion {
  accessToken: string;
  refreshToken: string;
  usuario: UsuarioSesion;
}

export interface UnidadPerfil {
  idUnidad: number;
  numero: string;
  torre: string | null;
  tipoRelacion: string;
  esResponsablePago: boolean;
}

export interface Perfil {
  id: number;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  roles: Rol[];
  conjunto: { id_conjunto: number; nombre: string } | null;
  unidades: UnidadPerfil[];
  ultimoAcceso: string | null;
}

export interface RespuestaOk {
  ok: boolean;
  mensaje?: string;
}

export interface RespuestaRecuperar extends RespuestaOk {
  codigoDemo?: string;
}

// --- Pagos y finanzas ---
export type EstadoCuota = 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';

export interface Cuota {
  id_cuota: number;
  id_unidad: number;
  unidad: string;
  periodo: string;
  concepto: string;
  valor: number;
  saldo: number;
  fecha_vencimiento: string;
  estado: EstadoCuota;
}

export interface EstadoCuentaUnidad {
  id_unidad: number;
  unidad: string;
  es_responsable_pago: boolean;
  saldo_total: number;
  cuotas_vencidas: number;
  cuotas: Cuota[];
}

export type EstadoPago = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'ANULADO';

export interface PagoCreado {
  id_pago: number;
  referencia: string;
  valor_total: number;
  checkout_url: string;
  pasarela: string;
}

export interface Pago {
  id_pago: number;
  id_unidad: number;
  unidad: string;
  pagador: string;
  valor_total: number;
  metodo_pago: string;
  referencia: string | null;
  estado: EstadoPago;
  fecha_creacion: string;
  fecha_confirmacion: string | null;
  comprobante: string | null;
  cuotas: { periodo: string; concepto: string; valor_aplicado: number }[];
}

export interface PagoResumen {
  id_pago: number;
  estado: EstadoPago;
  valor_total: number;
  referencia: string | null;
  comprobante: string | null;
}

// --- Reservas ---
export interface Zona {
  id_zona: number;
  nombre: string;
  descripcion: string | null;
  aforo_maximo: number;
  costo_reserva: number;
  hora_apertura: string;
  hora_cierre: string;
  duracion_max_horas: number;
  anticipacion_max_dias: number;
  reglamento: string | null;
  estado: string;
}

export interface FranjaOcupada {
  tipo: 'RESERVA' | 'BLOQUEO';
  inicio: string;
  fin: string;
  detalle: string | null;
}

export interface Disponibilidad {
  zona: Zona;
  fecha: string;
  ocupado: FranjaOcupada[];
}

export interface Reserva {
  id_reserva: number;
  id_zona: number;
  zona: string;
  id_unidad: number;
  unidad: string;
  solicitante: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  numero_asistentes: number;
  valor: number;
  estado: 'CONFIRMADA' | 'CANCELADA' | 'FINALIZADA';
  observaciones: string | null;
  fecha_creacion: string;
}

export interface NuevaReserva {
  id_zona: number;
  id_unidad?: number;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  numero_asistentes: number;
  observaciones?: string;
}

// --- PQRS ---
export type TipoPqrs = 'PETICION' | 'QUEJA' | 'RECLAMO' | 'SUGERENCIA';
export type EstadoPqrs = 'RADICADA' | 'EN_TRAMITE' | 'RESPONDIDA' | 'CERRADA';

export interface Pqrs {
  id_pqrs: number;
  numero_radicado: string;
  tipo: TipoPqrs;
  categoria: string;
  asunto: string;
  descripcion: string;
  prioridad: string;
  estado: EstadoPqrs;
  respuesta: string | null;
  calificacion: number | null;
  fecha_radicacion: string;
  fecha_limite: string;
  fecha_cierre: string | null;
  vencida: boolean;
  solicitante: string;
  unidad: string | null;
  responsable: string | null;
  id_responsable: number | null;
  adjuntos: number;
}

export interface PqrsDetalle extends Pqrs {
  seguimientos: {
    estado_anterior: string | null;
    estado_nuevo: string;
    comentario: string | null;
    fecha_registro: string;
    usuario: string | null;
  }[];
  lista_adjuntos: { id_adjunto: number; nombre_archivo: string; tipo_mime: string; tamano_kb: number }[];
}

export interface PqrsCreada {
  id_pqrs: number;
  numero_radicado: string;
  fecha_limite: string;
}

/** Archivo adjunto seleccionado en el dispositivo (o en el navegador). */
export interface ArchivoAdjunto {
  uri: string;
  nombre: string;
  tipo: string;
  tamano?: number;
  /** Solo en web: el objeto File/Blob real del navegador. */
  archivoWeb?: Blob;
}

// --- Noticias y notificaciones ---
export interface Noticia {
  id_noticia: number;
  titulo: string;
  contenido: string;
  tipo: 'NOTICIA' | 'COMUNICADO' | 'URGENTE';
  publico_objetivo: string;
  id_torre_destino: number | null;
  torre_destino: string | null;
  estado: string;
  autor: string | null;
  fecha_publicacion: string | null;
  fecha_expiracion: string | null;
  fecha_creacion: string;
}

export interface Notificacion {
  id_notificacion: number;
  tipo: string;
  id_referencia: number | null;
  id_noticia: number | null;
  titulo: string;
  mensaje: string;
  estado: string;
  fecha_creacion: string;
  fecha_lectura: string | null;
}

export interface BandejaNotificaciones {
  no_leidas: number;
  notificaciones: Notificacion[];
}

// --- Visitantes ---
export type EstadoVisita = 'PREREGISTRADA' | 'INGRESADA' | 'FINALIZADA' | 'VENCIDA' | 'CANCELADA';

export interface Visita {
  id_visita: number;
  visitante: {
    id_visitante: number;
    nombre: string;
    tipo_documento: string;
    numero_documento: string;
    telefono: string | null;
    placa_vehiculo: string | null;
  };
  id_unidad: number;
  unidad: string;
  anfitrion: string;
  anfitrion_telefono: string | null;
  fecha_programada: string;
  hora_desde: string;
  hora_hasta: string;
  motivo: string | null;
  ingresa_vehiculo: boolean;
  estado: EstadoVisita;
  codigo_qr?: string;
  qr_expira: string;
  fecha_hora_ingreso: string | null;
  fecha_hora_salida: string | null;
  vigilante: string | null;
  parqueadero: string | null;
}

export interface NuevaVisita {
  id_unidad?: number;
  tipo_documento: 'CC' | 'CE' | 'PA' | 'TI';
  numero_documento: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  placa_vehiculo?: string;
  fecha_programada: string;
  hora_desde: string;
  hora_hasta: string;
  motivo?: string;
}
