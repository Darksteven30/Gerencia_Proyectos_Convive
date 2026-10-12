import type { Request } from 'express';
import { prisma } from '../config/prisma';

/** Registra un evento en la bitácora de auditoría (auditoria_log). Nunca interrumpe la operación. */
export async function auditar(
  req: Request | null,
  accion: string,
  entidad: string,
  idEntidad?: number | null,
  detalle?: unknown,
  idUsuario?: number | null,
) {
  try {
    await prisma.auditoriaLog.create({
      data: {
        id_usuario: idUsuario ?? req?.usuario?.id ?? null,
        accion,
        entidad,
        id_entidad: idEntidad ?? null,
        detalle: detalle === undefined ? null : typeof detalle === 'string' ? detalle : JSON.stringify(detalle),
        direccion_ip: req?.ip ?? null,
      },
    });
  } catch (err) {
    console.error('No se pudo registrar la auditoría', err);
  }
}
