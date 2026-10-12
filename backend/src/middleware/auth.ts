import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { forbidden, unauthorized } from '../utils/errors';

export type NombreRol = 'ADMINISTRADOR' | 'JUNTA' | 'PROPIETARIO' | 'RESIDENTE' | 'PORTERIA';

export interface UsuarioAutenticado {
  id: number;
  correo: string;
  nombre: string;
  roles: NombreRol[];
  idConjunto: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function firmarTokenAcceso(u: UsuarioAutenticado): string {
  return jwt.sign(
    { sub: String(u.id), correo: u.correo, nombre: u.nombre, roles: u.roles, conjunto: u.idConjunto },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

/** Exige un token de acceso válido en el encabezado Authorization: Bearer <token>. */
export function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(unauthorized());
  try {
    const p = jwt.verify(token, env.jwtSecret) as jwt.JwtPayload;
    req.usuario = {
      id: Number(p.sub),
      correo: p.correo,
      nombre: p.nombre,
      roles: p.roles,
      idConjunto: p.conjunto,
    };
    next();
  } catch {
    next(unauthorized('La sesión expiró o el token no es válido'));
  }
}

/** Exige que el usuario tenga al menos uno de los roles indicados. */
export function requiereRol(...roles: NombreRol[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) return next(unauthorized());
    if (!req.usuario.roles.some((r) => roles.includes(r))) return next(forbidden());
    next();
  };
}

export function tieneRol(req: Request, ...roles: NombreRol[]): boolean {
  return !!req.usuario?.roles.some((r) => roles.includes(r));
}

/** Usuario autenticado (lanza 401 si no existe; úsese después de `autenticar`). */
export function usuarioActual(req: Request): UsuarioAutenticado {
  if (!req.usuario) throw unauthorized();
  return req.usuario;
}
