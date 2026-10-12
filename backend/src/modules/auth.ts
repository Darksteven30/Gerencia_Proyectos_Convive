/**
 * Módulo de autenticación y usuarios (RF-01; CU-01 a CU-06 y CU-10; DS-01).
 */
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { autenticar, firmarTokenAcceso, NombreRol, UsuarioAutenticado, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { contrasenaValida, evaluarIntentoFallido } from '../utils/dominio';
import { AppError, badRequest, unauthorized } from '../utils/errors';

export const authRouter = Router();

const sha256 = (v: string) => crypto.createHash('sha256').update(v).digest('hex');
const MSG_CREDENCIALES = 'Correo o contraseña incorrectos';
const MSG_CONTRASENA = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número';

/** Construye el perfil de sesión: roles activos y conjunto del usuario. */
export async function perfilSesion(idUsuario: number): Promise<UsuarioAutenticado> {
  const u = await prisma.usuario.findUniqueOrThrow({
    where: { id_usuario: idUsuario },
    include: { roles: { where: { activo: true }, include: { rol: true } } },
  });
  return {
    id: u.id_usuario,
    correo: u.correo,
    nombre: `${u.nombres} ${u.apellidos}`,
    roles: u.roles.map((r) => r.rol.nombre as NombreRol),
    idConjunto: u.roles[0]?.id_conjunto ?? 0,
  };
}

async function crearSesion(perfil: UsuarioAutenticado, plataforma: string, dispositivo: string | undefined, ip: string | undefined) {
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await prisma.sesion.create({
    data: {
      id_usuario: perfil.id,
      hash_token_refresco: sha256(refreshToken),
      plataforma,
      dispositivo: dispositivo?.slice(0, 120),
      direccion_ip: ip,
      fecha_expiracion: new Date(Date.now() + env.refreshTokenDays * 86_400_000),
    },
  });
  return { accessToken: firmarTokenAcceso(perfil), refreshToken, usuario: perfil };
}

// CU-01 Iniciar sesión (incluye CU-10 Validar credenciales y estado de la cuenta)
const loginSchema = z.object({
  correo: z.string().trim().toLowerCase().email(),
  contrasena: z.string().min(1),
  plataforma: z.enum(['ANDROID', 'IOS', 'WEB']).default('WEB'),
  dispositivo: z.string().optional(),
});

authRouter.post('/login', async (req, res) => {
  const datos = loginSchema.parse(req.body);
  const usuario = await prisma.usuario.findUnique({ where: { correo: datos.correo } });

  if (!usuario || !usuario.hash_contrasena) {
    await auditar(req, 'LOGIN_FALLIDO', 'usuario', usuario?.id_usuario, { correo: datos.correo });
    throw unauthorized(MSG_CREDENCIALES);
  }

  const ahora = new Date();
  // A3: cuenta bloqueada temporalmente (RN-01) o inactiva
  if (usuario.bloqueado_hasta && usuario.bloqueado_hasta > ahora) {
    const min = Math.ceil((usuario.bloqueado_hasta.getTime() - ahora.getTime()) / 60_000);
    throw new AppError(423, `Cuenta bloqueada por intentos fallidos. Intente de nuevo en ${min} minuto(s).`, 'CUENTA_BLOQUEADA');
  }
  if (usuario.estado !== 'ACTIVO') {
    throw new AppError(403, 'La cuenta no está activa. Comuníquese con la administración.', 'CUENTA_INACTIVA');
  }

  const ok = await bcrypt.compare(datos.contrasena, usuario.hash_contrasena);
  if (!ok) {
    // A1 / A2: incrementar intentos y bloquear al quinto intento
    const r = evaluarIntentoFallido(usuario.intentos_fallidos, ahora);
    await prisma.usuario.update({
      where: { id_usuario: usuario.id_usuario },
      data: { intentos_fallidos: r.bloqueadoHasta ? 0 : r.intentos, bloqueado_hasta: r.bloqueadoHasta },
    });
    await auditar(req, 'LOGIN_FALLIDO', 'usuario', usuario.id_usuario, { intentos: r.intentos }, usuario.id_usuario);
    if (r.bloqueadoHasta) {
      throw new AppError(423, 'Cuenta bloqueada durante 15 minutos por cinco intentos fallidos.', 'CUENTA_BLOQUEADA');
    }
    throw unauthorized(MSG_CREDENCIALES);
  }

  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: ahora },
  });
  const perfil = await perfilSesion(usuario.id_usuario);
  const sesion = await crearSesion(perfil, datos.plataforma, datos.dispositivo ?? req.get('user-agent'), req.ip);
  await auditar(req, 'LOGIN_EXITOSO', 'usuario', usuario.id_usuario, { plataforma: datos.plataforma }, usuario.id_usuario);
  res.json(sesion);
});

// Renovación del token de acceso con el token de refresco (rotación del token)
authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().min(10) }).parse(req.body);
  const sesion = await prisma.sesion.findFirst({
    where: { hash_token_refresco: sha256(refreshToken), activa: true, fecha_expiracion: { gt: new Date() } },
    include: { usuario: true },
  });
  if (!sesion || sesion.usuario.estado !== 'ACTIVO') throw unauthorized('La sesión expiró. Inicie sesión nuevamente.');

  const nuevo = crypto.randomBytes(48).toString('base64url');
  await prisma.sesion.update({ where: { id_sesion: sesion.id_sesion }, data: { hash_token_refresco: sha256(nuevo) } });
  const perfil = await perfilSesion(sesion.id_usuario);
  res.json({ accessToken: firmarTokenAcceso(perfil), refreshToken: nuevo, usuario: perfil });
});

// CU-02 Cerrar sesión
authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = z.object({ refreshToken: z.string().optional() }).parse(req.body ?? {});
  if (refreshToken) {
    await prisma.sesion.updateMany({
      where: { hash_token_refresco: sha256(refreshToken), activa: true },
      data: { activa: false, fecha_cierre: new Date() },
    });
  }
  res.json({ ok: true });
});

// CU-05 Activar cuenta por invitación + CU-06 Aceptar tratamiento de datos (RN-10)
const activarSchema = z.object({
  correo: z.string().trim().toLowerCase().email(),
  codigo: z.string().trim().min(4),
  contrasena: z.string(),
  aceptaTratamientoDatos: z.literal(true, {
    errorMap: () => ({ message: 'Debe aceptar la política de tratamiento de datos personales (Ley 1581 de 2012)' }),
  }),
});

authRouter.post('/activar', async (req, res) => {
  const datos = activarSchema.parse(req.body);
  if (!contrasenaValida(datos.contrasena)) throw badRequest(MSG_CONTRASENA, 'CONTRASENA_DEBIL');
  const usuario = await prisma.usuario.findUnique({ where: { correo: datos.correo } });
  if (!usuario || usuario.estado !== 'PENDIENTE' || usuario.codigo_invitacion !== datos.codigo.toUpperCase()) {
    throw badRequest('El código de invitación no es válido para este correo', 'INVITACION_INVALIDA');
  }
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: {
      hash_contrasena: await bcrypt.hash(datos.contrasena, 10),
      estado: 'ACTIVO',
      codigo_invitacion: null,
      acepta_tratamiento_datos: true,
      fecha_aceptacion_datos: new Date(),
    },
  });
  await auditar(req, 'ACTIVAR_CUENTA', 'usuario', usuario.id_usuario, undefined, usuario.id_usuario);
  res.json({ ok: true, mensaje: 'Cuenta activada. Ya puede iniciar sesión.' });
});

// CU-03 Recuperar contraseña: genera un código de un solo uso.
// En el prototipo no hay servicio de correo; el código se muestra en la consola del servidor
// y, si DEMO_MODE=true, también se devuelve en la respuesta para facilitar las pruebas.
authRouter.post('/recuperar', async (req, res) => {
  const { correo } = z.object({ correo: z.string().trim().toLowerCase().email() }).parse(req.body);
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  let codigoDemo: string | undefined;
  if (usuario && usuario.estado === 'ACTIVO') {
    const codigo = crypto.randomBytes(3).toString('hex').toUpperCase();
    await prisma.usuario.update({ where: { id_usuario: usuario.id_usuario }, data: { codigo_invitacion: `R-${codigo}` } });
    console.log(`[Recuperación] Código para ${correo}: ${codigo}`);
    await auditar(req, 'SOLICITAR_RECUPERACION', 'usuario', usuario.id_usuario, undefined, usuario.id_usuario);
    if (process.env.DEMO_MODE === 'true') codigoDemo = codigo;
  }
  // Respuesta genérica: no revela si el correo existe.
  res.json({ ok: true, mensaje: 'Si el correo está registrado, recibirá un código de recuperación.', codigoDemo });
});

authRouter.post('/restablecer', async (req, res) => {
  const datos = z
    .object({ correo: z.string().trim().toLowerCase().email(), codigo: z.string().trim(), contrasena: z.string() })
    .parse(req.body);
  if (!contrasenaValida(datos.contrasena)) throw badRequest(MSG_CONTRASENA, 'CONTRASENA_DEBIL');
  const usuario = await prisma.usuario.findUnique({ where: { correo: datos.correo } });
  if (!usuario || usuario.codigo_invitacion !== `R-${datos.codigo.toUpperCase()}`) {
    throw badRequest('El código de recuperación no es válido', 'CODIGO_INVALIDO');
  }
  await prisma.usuario.update({
    where: { id_usuario: usuario.id_usuario },
    data: { hash_contrasena: await bcrypt.hash(datos.contrasena, 10), codigo_invitacion: null, intentos_fallidos: 0, bloqueado_hasta: null },
  });
  await prisma.sesion.updateMany({ where: { id_usuario: usuario.id_usuario, activa: true }, data: { activa: false, fecha_cierre: new Date() } });
  await auditar(req, 'RESTABLECER_CONTRASENA', 'usuario', usuario.id_usuario, undefined, usuario.id_usuario);
  res.json({ ok: true, mensaje: 'Contraseña actualizada. Inicie sesión con la nueva contraseña.' });
});

// CU-04 Gestionar perfil
authRouter.get('/me', autenticar, async (req, res) => {
  const { id } = usuarioActual(req);
  const u = await prisma.usuario.findUniqueOrThrow({
    where: { id_usuario: id },
    include: {
      roles: { where: { activo: true }, include: { rol: true, conjunto: { select: { id_conjunto: true, nombre: true } } } },
      ocupaciones: { where: { fecha_fin: null }, include: { unidad: { include: { torre: true } } } },
    },
  });
  res.json({
    id: u.id_usuario,
    tipoDocumento: u.tipo_documento,
    numeroDocumento: u.numero_documento,
    nombres: u.nombres,
    apellidos: u.apellidos,
    correo: u.correo,
    telefono: u.telefono,
    roles: u.roles.map((r) => r.rol.nombre),
    conjunto: u.roles[0]?.conjunto ?? null,
    unidades: u.ocupaciones.map((o) => ({
      idUnidad: o.id_unidad,
      numero: o.unidad.numero,
      torre: o.unidad.torre?.nombre ?? null,
      tipoRelacion: o.tipo_relacion,
      esResponsablePago: o.es_responsable_pago,
    })),
    ultimoAcceso: u.ultimo_acceso,
  });
});

authRouter.put('/me', autenticar, async (req, res) => {
  const { id } = usuarioActual(req);
  const datos = z
    .object({
      telefono: z.string().trim().max(20).optional(),
      contrasenaActual: z.string().optional(),
      contrasenaNueva: z.string().optional(),
    })
    .parse(req.body);
  const data: { telefono?: string; hash_contrasena?: string } = {};
  if (datos.telefono !== undefined) data.telefono = datos.telefono;
  if (datos.contrasenaNueva) {
    const u = await prisma.usuario.findUniqueOrThrow({ where: { id_usuario: id } });
    if (!u.hash_contrasena || !(await bcrypt.compare(datos.contrasenaActual ?? '', u.hash_contrasena))) {
      throw badRequest('La contraseña actual no es correcta', 'CONTRASENA_INCORRECTA');
    }
    if (!contrasenaValida(datos.contrasenaNueva)) throw badRequest(MSG_CONTRASENA, 'CONTRASENA_DEBIL');
    data.hash_contrasena = await bcrypt.hash(datos.contrasenaNueva, 10);
  }
  await prisma.usuario.update({ where: { id_usuario: id }, data });
  await auditar(req, 'ACTUALIZAR_PERFIL', 'usuario', id);
  res.json({ ok: true });
});

// Registro del token push del dispositivo (CU-40, dispositivo_notificacion)
authRouter.post('/dispositivos', autenticar, async (req, res) => {
  const { id } = usuarioActual(req);
  const datos = z.object({ token: z.string().min(10).max(255), plataforma: z.enum(['ANDROID', 'IOS']) }).parse(req.body);
  await prisma.dispositivoNotificacion.upsert({
    where: { token_push: datos.token },
    create: { id_usuario: id, token_push: datos.token, plataforma: datos.plataforma },
    update: { id_usuario: id, plataforma: datos.plataforma, activo: true },
  });
  res.json({ ok: true });
});
