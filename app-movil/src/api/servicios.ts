/**
 * Funciones de acceso a cada recurso de la API (contrato en docs/API.md).
 */
import { guardarSesion, solicitud } from './cliente';
import type {
  BandejaNotificaciones,
  Disponibilidad,
  EstadoCuentaUnidad,
  Noticia,
  NuevaReserva,
  NuevaVisita,
  Pago,
  PagoCreado,
  PagoResumen,
  Perfil,
  Pqrs,
  PqrsCreada,
  PqrsDetalle,
  Reserva,
  RespuestaOk,
  RespuestaRecuperar,
  RespuestaSesion,
  Visita,
  Zona,
} from './tipos';

export type Plataforma = 'ANDROID' | 'IOS' | 'WEB';

// --- Autenticación ---
export const auth = {
  async iniciarSesion(correo: string, contrasena: string, plataforma: Plataforma, dispositivo?: string) {
    const r = await solicitud<RespuestaSesion>('/api/auth/login', {
      metodo: 'POST',
      cuerpo: { correo: correo.trim(), contrasena, plataforma, dispositivo },
      autenticada: false,
    });
    await guardarSesion(r);
    return r;
  },
  cerrarSesion: (refreshToken: string) =>
    solicitud<RespuestaOk>('/api/auth/logout', { metodo: 'POST', cuerpo: { refreshToken }, autenticada: false }),
  activar: (correo: string, codigo: string, contrasena: string) =>
    solicitud<RespuestaOk>('/api/auth/activar', {
      metodo: 'POST',
      cuerpo: { correo: correo.trim(), codigo: codigo.trim(), contrasena, aceptaTratamientoDatos: true },
      autenticada: false,
    }),
  recuperar: (correo: string) =>
    solicitud<RespuestaRecuperar>('/api/auth/recuperar', { metodo: 'POST', cuerpo: { correo: correo.trim() }, autenticada: false }),
  restablecer: (correo: string, codigo: string, contrasena: string) =>
    solicitud<RespuestaOk>('/api/auth/restablecer', {
      metodo: 'POST',
      cuerpo: { correo: correo.trim(), codigo: codigo.trim(), contrasena },
      autenticada: false,
    }),
  perfil: () => solicitud<Perfil>('/api/auth/me'),
  actualizarPerfil: (datos: { telefono?: string; contrasenaActual?: string; contrasenaNueva?: string }) =>
    solicitud<RespuestaOk>('/api/auth/me', { metodo: 'PUT', cuerpo: datos }),
  registrarDispositivo: (token: string, plataforma: 'ANDROID' | 'IOS') =>
    solicitud<RespuestaOk>('/api/auth/dispositivos', { metodo: 'POST', cuerpo: { token, plataforma } }),
};

// --- Pagos ---
export const pagos = {
  estadoCuenta: () => solicitud<EstadoCuentaUnidad[]>('/api/estado-cuenta'),
  crear: (idUnidad: number, cuotas: number[]) =>
    solicitud<PagoCreado>('/api/pagos', { metodo: 'POST', cuerpo: { id_unidad: idUnidad, cuotas } }),
  historial: () => solicitud<Pago[]>('/api/pagos'),
  consultar: (idPago: number) => solicitud<PagoResumen>(`/api/pagos/${idPago}`),
  rutaComprobante: (idPago: number) => `/api/pagos/${idPago}/comprobante`,
};

// --- Reservas ---
export const reservas = {
  zonas: () => solicitud<Zona[]>('/api/zonas'),
  disponibilidad: (idZona: number, fecha: string) =>
    solicitud<Disponibilidad>(`/api/zonas/${idZona}/disponibilidad?fecha=${encodeURIComponent(fecha)}`),
  crear: (datos: NuevaReserva) =>
    solicitud<{ id_reserva: number; estado: string; valor: number }>('/api/reservas', { metodo: 'POST', cuerpo: datos }),
  mias: () => solicitud<Reserva[]>('/api/reservas/mias'),
  cancelar: (idReserva: number) => solicitud<RespuestaOk>(`/api/reservas/${idReserva}/cancelar`, { metodo: 'POST', cuerpo: {} }),
};

// --- PQRS ---
export const pqrs = {
  mias: () => solicitud<Pqrs[]>('/api/pqrs'),
  detalle: (id: number) => solicitud<PqrsDetalle>(`/api/pqrs/${id}`),
  crear: (formulario: FormData) => solicitud<PqrsCreada>('/api/pqrs', { metodo: 'POST', formulario }),
  calificar: (id: number, calificacion: number) =>
    solicitud<RespuestaOk>(`/api/pqrs/${id}/calificar`, { metodo: 'POST', cuerpo: { calificacion } }),
};

// --- Noticias y notificaciones ---
export const noticias = {
  listar: () => solicitud<Noticia[]>('/api/noticias'),
  detalle: (id: number) => solicitud<Noticia>(`/api/noticias/${id}`),
};

export const notificaciones = {
  bandeja: () => solicitud<BandejaNotificaciones>('/api/notificaciones'),
  marcarLeida: (id: number) => solicitud<RespuestaOk>(`/api/notificaciones/${id}/leer`, { metodo: 'POST', cuerpo: {} }),
  marcarTodas: () => solicitud<RespuestaOk>('/api/notificaciones/leer-todas', { metodo: 'POST', cuerpo: {} }),
};

// --- Visitantes ---
export const visitas = {
  mias: () => solicitud<Visita[]>('/api/visitas/mias'),
  crear: (datos: NuevaVisita) => solicitud<Visita>('/api/visitas', { metodo: 'POST', cuerpo: datos }),
  cancelar: (id: number) => solicitud<RespuestaOk>(`/api/visitas/${id}/cancelar`, { metodo: 'POST', cuerpo: {} }),
};
