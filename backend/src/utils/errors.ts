import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

/** Error de negocio con código HTTP y mensaje apto para mostrar al usuario. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, code?: string) => new AppError(400, msg, code);
export const unauthorized = (msg = 'No autenticado') => new AppError(401, msg, 'NO_AUTENTICADO');
export const forbidden = (msg = 'No tiene permisos para esta acción') => new AppError(403, msg, 'SIN_PERMISO');
export const notFound = (msg = 'Recurso no encontrado') => new AppError(404, msg, 'NO_ENCONTRADO');
export const conflict = (msg: string, code?: string) => new AppError(409, msg, code);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, code: err.code });
  }
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Datos inválidos',
      code: 'VALIDACION',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos', code: 'DUPLICADO' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Recurso no encontrado', code: 'NO_ENCONTRADO' });
    }
  }
  if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'El archivo supera el tamaño máximo de 5 MB (RN-09)', code: 'ARCHIVO_GRANDE' });
  }
  console.error(err);
  return res.status(500).json({ error: 'Error interno del servidor', code: 'ERROR_INTERNO' });
}
