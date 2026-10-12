/** Tipos de datos del contrato de la API de Convive (docs/API.md). */

export interface Tablero {
  unidades: number;
  usuarios: number;
  carteraPendiente: number;
  cuotasPendientes: number;
  recaudoMes: number;
  pqrsAbiertas: number;
  reservasHoy: number;
  visitasHoy: number;
}

export interface Conjunto {
  id_conjunto: number;
  nombre: string;
  nit: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string | null;
  correo_contacto: string | null;
  numero_unidades: number;
}

export interface Torre {
  id_torre: number;
  nombre: string;
  numero_pisos: number | null;
  unidades: number;
}

export interface Ocupante {
  id_ocupacion: number;
  id_usuario: number;
  nombre: string;
  correo: string;
  tipo_relacion: string;
  es_responsable_pago: boolean;
}

export interface Unidad {
  id_unidad: number;
  numero: string;
  torre: string | null;
  id_torre: number | null;
  tipo: 'APARTAMENTO' | 'CASA' | 'LOCAL';
  piso: number | null;
  area_m2: number | null;
  coeficiente: number;
  estado: string;
  ocupantes: Ocupante[];
}

export interface Usuario {
  id_usuario: number;
  tipo_documento: string;
  numero_documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string | null;
  estado: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE' | string;
  codigo_invitacion: string | null;
  acepta_tratamiento_datos: boolean;
  ultimo_acceso: string | null;
  roles: string[];
  unidades: { id_unidad: number; unidad: string; tipo_relacion: string; es_responsable_pago: boolean }[];
}

export interface Cuota {
  id_cuota: number;
  id_unidad: number;
  unidad: string;
  periodo: string;
  concepto: string;
  valor: number;
  saldo: number;
  fecha_vencimiento: string;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADA' | 'VENCIDA';
}

export interface Pago {
  id_pago: number;
  id_unidad: number;
  unidad: string;
  pagador: string | null;
  valor_total: number;
  metodo_pago: string;
  referencia: string | null;
  estado: string;
  fecha_creacion: string;
  fecha_confirmacion: string | null;
  comprobante: string | { numero_comprobante?: string } | null;
  cuotas: { periodo: string; concepto: string; valor_aplicado: number }[];
}

export interface Reporte {
  tipo: string;
  titulo: string;
  subtitulo: string;
  columnas: string[];
  filas: (string | number | null)[][];
  resumen: Record<string, string | number>;
}

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
  estado: 'ACTIVA' | 'MANTENIMIENTO' | 'INACTIVA';
}

export interface Bloqueo {
  id_bloqueo: number;
  id_zona: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string;
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

export interface Pqrs {
  id_pqrs: number;
  numero_radicado: string;
  tipo: string;
  categoria: string;
  asunto: string;
  descripcion: string;
  prioridad: string;
  estado: 'RADICADA' | 'EN_TRAMITE' | 'RESPONDIDA' | 'CERRADA';
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
  seguimientos: { estado_anterior: string | null; estado_nuevo: string; comentario: string | null; fecha_registro: string; usuario: string }[];
  lista_adjuntos: { id_adjunto: number; nombre_archivo: string; tipo_mime: string; tamano_kb: number }[];
}

export interface Noticia {
  id_noticia: number;
  titulo: string;
  contenido: string;
  tipo: 'NOTICIA' | 'COMUNICADO' | 'URGENTE';
  publico_objetivo: 'TODOS' | 'PROPIETARIOS' | 'RESIDENTES' | 'TORRE';
  id_torre_destino: number | null;
  torre_destino: string | null;
  estado: 'BORRADOR' | 'PUBLICADA' | 'ARCHIVADA';
  autor: string;
  fecha_publicacion: string | null;
  fecha_expiracion: string | null;
  fecha_creacion: string;
}

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
  estado: 'PREREGISTRADA' | 'INGRESADA' | 'FINALIZADA' | 'VENCIDA' | 'CANCELADA';
  codigo_qr?: string;
  qr_expira: string;
  fecha_hora_ingreso: string | null;
  fecha_hora_salida: string | null;
  vigilante: string | null;
  parqueadero: string | null;
}

export interface Parqueadero {
  id_parqueadero: number;
  codigo: string;
  tipo: 'RESIDENTE' | 'VISITANTE';
  ubicacion: string | null;
  estado: 'DISPONIBLE' | 'OCUPADO' | 'MANTENIMIENTO';
  unidad_propietaria: string | null;
  asignacion: {
    id_asignacion: number;
    placa: string;
    tipo_vehiculo: string;
    fecha_inicio: string;
    unidad: string | null;
    visitante: string | null;
  } | null;
}

export interface EventoAuditoria {
  id_log: number;
  fecha_evento: string;
  accion: string;
  entidad: string;
  id_entidad: number | null;
  detalle: unknown;
  direccion_ip: string | null;
  usuario: string | null;
}
