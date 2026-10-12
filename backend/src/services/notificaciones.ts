import { env } from '../config/env';
import { prisma } from '../config/prisma';

export type TipoNotificacion = 'NOTICIA' | 'RECORDATORIO_PAGO' | 'PQRS' | 'RESERVA' | 'VISITA';

export interface MensajeNotificacion {
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  idReferencia?: number | null;
  idNoticia?: number | null;
}

/**
 * Interfaz del servicio de notificaciones push (Entrega 2, criterio de bajo acoplamiento):
 * permite cambiar de proveedor sin modificar la lógica de negocio.
 */
interface ProveedorPush {
  enviar(tokens: string[], titulo: string, cuerpo: string, datos: Record<string, unknown>): Promise<{ fallidos: string[] }>;
}

/** Solo deja la notificación en la bandeja de la aplicación (sin push). */
const proveedorLog: ProveedorPush = {
  async enviar() {
    return { fallidos: [] };
  },
};

/** Envío push mediante el servicio de Expo, que entrega por FCM (Android) y APNs (iOS). */
const proveedorExpo: ProveedorPush = {
  async enviar(tokens, titulo, cuerpo, datos) {
    const fallidos: string[] = [];
    // Expo admite lotes de hasta 100 mensajes por solicitud (DS-05: envío por lotes).
    for (let i = 0; i < tokens.length; i += 100) {
      const lote = tokens.slice(i, i + 100);
      try {
        const resp = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(lote.map((to) => ({ to, title: titulo, body: cuerpo, data: datos, sound: 'default' }))),
        });
        const json = (await resp.json()) as { data?: { status: string }[] };
        json.data?.forEach((r, idx) => {
          if (r.status !== 'ok') fallidos.push(lote[idx]);
        });
      } catch (err) {
        console.error('Fallo el envío push por lote', err);
        fallidos.push(...lote);
      }
    }
    return { fallidos };
  },
};

const proveedor: ProveedorPush = env.pushProvider === 'expo' ? proveedorExpo : proveedorLog;

/**
 * Crea una notificación por usuario destinatario y la envía por push a sus dispositivos activos.
 * Los tokens rechazados por el proveedor se desactivan (manejo de envíos fallidos, DS-05).
 */
export async function notificar(idsUsuarios: number[], msg: MensajeNotificacion) {
  const destinatarios = [...new Set(idsUsuarios)];
  if (destinatarios.length === 0) return;

  await prisma.notificacion.createMany({
    data: destinatarios.map((id_usuario) => ({
      id_usuario,
      id_noticia: msg.idNoticia ?? null,
      tipo: msg.tipo,
      id_referencia: msg.idReferencia ?? null,
      titulo: msg.titulo.slice(0, 120),
      mensaje: msg.mensaje.slice(0, 300),
      canal: 'PUSH',
      estado: 'ENVIADA',
      fecha_envio: new Date(),
    })),
  });

  const dispositivos = await prisma.dispositivoNotificacion.findMany({
    where: { id_usuario: { in: destinatarios }, activo: true },
  });
  if (dispositivos.length === 0) return;

  const { fallidos } = await proveedor.enviar(
    dispositivos.map((d) => d.token_push),
    msg.titulo,
    msg.mensaje,
    { tipo: msg.tipo, idReferencia: msg.idReferencia ?? null },
  );
  if (fallidos.length > 0) {
    await prisma.dispositivoNotificacion.updateMany({ where: { token_push: { in: fallidos } }, data: { activo: false } });
  }
}

/** Usuarios activos del conjunto con alguno de los roles indicados. */
export async function usuariosConRol(idConjunto: number, roles: string[]): Promise<number[]> {
  const filas = await prisma.usuarioRol.findMany({
    where: { id_conjunto: idConjunto, activo: true, rol: { nombre: { in: roles } }, usuario: { estado: 'ACTIVO' } },
    select: { id_usuario: true },
  });
  return [...new Set(filas.map((f) => f.id_usuario))];
}
