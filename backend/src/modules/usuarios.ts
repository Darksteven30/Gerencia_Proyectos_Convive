/**
 * Gestión de usuarios, roles y vínculos con las unidades (RF-01; CU-05 y CU-07).
 * Comparte el prefijo /api/admin con el módulo de administración del conjunto (RF-09).
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { ahoraColombia, fechaADate } from '../utils/dominio';
import { badRequest, notFound } from '../utils/errors';

export const usuariosRouter = Router();
usuariosRouter.use(autenticar);

const soloAdmin = requiereRol('ADMINISTRADOR');
const ROLES = ['ADMINISTRADOR', 'JUNTA', 'PROPIETARIO', 'RESIDENTE', 'PORTERIA'] as const;

// --- Unidades con sus ocupantes (para vincular usuarios) -----------------
usuariosRouter.get('/unidades', requiereRol('ADMINISTRADOR', 'JUNTA', 'PORTERIA'), async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const unidades = await prisma.unidadResidencial.findMany({
    where: { id_conjunto: idConjunto },
    include: {
      torre: true,
      ocupaciones: { where: { fecha_fin: null }, include: { usuario: { select: { id_usuario: true, nombres: true, apellidos: true, correo: true } } } },
    },
    orderBy: [{ id_torre: 'asc' }, { numero: 'asc' }],
  });
  res.json(
    unidades.map((u) => ({
      id_unidad: u.id_unidad,
      numero: u.numero,
      torre: u.torre?.nombre ?? null,
      id_torre: u.id_torre,
      tipo: u.tipo,
      piso: u.piso,
      area_m2: u.area_m2,
      coeficiente: u.coeficiente,
      estado: u.estado,
      ocupantes: u.ocupaciones.map((o) => ({
        id_ocupacion: o.id_ocupacion,
        id_usuario: o.usuario.id_usuario,
        nombre: `${o.usuario.nombres} ${o.usuario.apellidos}`,
        correo: o.usuario.correo,
        tipo_relacion: o.tipo_relacion,
        es_responsable_pago: o.es_responsable_pago,
      })),
    })),
  );
});

// --- Usuarios y roles (CU-07) ---------------------------------------------
usuariosRouter.get('/usuarios', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const usuarios = await prisma.usuario.findMany({
    where: { roles: { some: { id_conjunto: idConjunto } } },
    include: {
      roles: { where: { id_conjunto: idConjunto, activo: true }, include: { rol: true } },
      ocupaciones: { where: { fecha_fin: null }, include: { unidad: { include: { torre: true } } } },
    },
    orderBy: { apellidos: 'asc' },
  });
  res.json(
    usuarios.map((u) => ({
      id_usuario: u.id_usuario,
      tipo_documento: u.tipo_documento,
      numero_documento: u.numero_documento,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo,
      telefono: u.telefono,
      estado: u.estado,
      codigo_invitacion: u.estado === 'PENDIENTE' ? u.codigo_invitacion : null,
      acepta_tratamiento_datos: u.acepta_tratamiento_datos,
      ultimo_acceso: u.ultimo_acceso,
      roles: u.roles.map((r) => r.rol.nombre),
      unidades: u.ocupaciones.map((o) => ({
        id_unidad: o.id_unidad,
        unidad: `${o.unidad.torre ? o.unidad.torre.nombre + ' - ' : ''}${o.unidad.numero}`,
        tipo_relacion: o.tipo_relacion,
        es_responsable_pago: o.es_responsable_pago,
      })),
    })),
  );
});

const invitarSchema = z.object({
  tipo_documento: z.enum(['CC', 'CE', 'PA', 'TI']),
  numero_documento: z.string().trim().min(4).max(20),
  nombres: z.string().trim().min(2).max(80),
  apellidos: z.string().trim().min(2).max(80),
  correo: z.string().trim().toLowerCase().email(),
  telefono: z.string().trim().max(20).optional(),
  roles: z.array(z.enum(ROLES)).min(1),
  id_unidad: z.number().int().optional(),
  tipo_relacion: z.enum(['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE']).optional(),
  es_responsable_pago: z.boolean().optional(),
});

/** Crea el usuario en estado PENDIENTE con un código de invitación para activarse (CU-05). */
usuariosRouter.post('/usuarios', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const datos = invitarSchema.parse(req.body);
  if ((datos.roles.includes('PROPIETARIO') || datos.roles.includes('RESIDENTE')) && !datos.id_unidad) {
    throw badRequest('Los propietarios y residentes deben vincularse a una unidad residencial');
  }
  const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
  const roles = await prisma.rol.findMany({ where: { nombre: { in: datos.roles } } });

  const usuario = await prisma.$transaction(async (tx) => {
    const u = await tx.usuario.create({
      data: {
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        correo: datos.correo,
        telefono: datos.telefono,
        estado: 'PENDIENTE',
        codigo_invitacion: codigo,
      },
    });
    await tx.usuarioRol.createMany({ data: roles.map((r) => ({ id_usuario: u.id_usuario, id_rol: r.id_rol, id_conjunto: idConjunto })) });
    if (datos.id_unidad) {
      const tipoRelacion = datos.tipo_relacion ?? (datos.roles.includes('PROPIETARIO') ? 'PROPIETARIO' : 'RESIDENTE');
      await tx.ocupacionUnidad.create({
        data: {
          id_unidad: datos.id_unidad,
          id_usuario: u.id_usuario,
          tipo_relacion: tipoRelacion,
          es_responsable_pago: datos.es_responsable_pago ?? tipoRelacion === 'PROPIETARIO',
          fecha_inicio: fechaADate(ahoraColombia().fecha),
        },
      });
    }
    return u;
  });
  await auditar(req, 'CREAR', 'usuario', usuario.id_usuario, { correo: datos.correo, roles: datos.roles });
  res.status(201).json({
    id_usuario: usuario.id_usuario,
    correo: usuario.correo,
    codigo_invitacion: codigo,
    mensaje: 'Usuario creado. Comparta el código de invitación para que active su cuenta desde la app.',
  });
});

usuariosRouter.put('/usuarios/:id', soloAdmin, async (req, res) => {
  const { idConjunto, id: idAdmin } = usuarioActual(req);
  const id = Number(req.params.id);
  const datos = z
    .object({
      estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
      roles: z.array(z.enum(ROLES)).min(1).optional(),
      telefono: z.string().trim().max(20).optional(),
    })
    .parse(req.body);
  if (id === idAdmin && datos.estado === 'INACTIVO') throw badRequest('No puede desactivar su propia cuenta');
  const u = await prisma.usuario.findFirst({ where: { id_usuario: id, roles: { some: { id_conjunto: idConjunto } } } });
  if (!u) throw notFound('Usuario no encontrado');
  if (u.estado === 'PENDIENTE' && datos.estado) throw badRequest('El usuario aún no ha activado su cuenta');

  await prisma.$transaction(async (tx) => {
    if (datos.estado || datos.telefono !== undefined) {
      await tx.usuario.update({ where: { id_usuario: id }, data: { estado: datos.estado, telefono: datos.telefono } });
    }
    if (datos.estado === 'INACTIVO') {
      await tx.sesion.updateMany({ where: { id_usuario: id, activa: true }, data: { activa: false, fecha_cierre: new Date() } });
    }
    if (datos.roles) {
      const roles = await tx.rol.findMany({ where: { nombre: { in: datos.roles } } });
      await tx.usuarioRol.updateMany({ where: { id_usuario: id, id_conjunto: idConjunto }, data: { activo: false } });
      for (const r of roles) {
        await tx.usuarioRol.upsert({
          where: { id_usuario_id_rol_id_conjunto: { id_usuario: id, id_rol: r.id_rol, id_conjunto: idConjunto } },
          create: { id_usuario: id, id_rol: r.id_rol, id_conjunto: idConjunto },
          update: { activo: true },
        });
      }
    }
  });
  await auditar(req, 'ACTUALIZAR', 'usuario', id, datos);
  res.json({ ok: true });
});

// Vincular o desvincular ocupantes de una unidad (RN-07)
usuariosRouter.post('/ocupaciones', soloAdmin, async (req, res) => {
  const datos = z
    .object({
      id_unidad: z.number().int(),
      id_usuario: z.number().int(),
      tipo_relacion: z.enum(['PROPIETARIO', 'ARRENDATARIO', 'RESIDENTE']),
      es_responsable_pago: z.boolean().default(false),
    })
    .parse(req.body);
  const ocupacion = await prisma.ocupacionUnidad.create({ data: { ...datos, fecha_inicio: fechaADate(ahoraColombia().fecha) } });
  await auditar(req, 'CREAR', 'ocupacion_unidad', ocupacion.id_ocupacion, datos);
  res.status(201).json(ocupacion);
});

usuariosRouter.post('/ocupaciones/:id/finalizar', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const ocupacion = await prisma.ocupacionUnidad.findUnique({ where: { id_ocupacion: id } });
  if (!ocupacion) throw notFound('Ocupación no encontrada');
  if (ocupacion.es_responsable_pago) {
    const otros = await prisma.ocupacionUnidad.count({
      where: { id_unidad: ocupacion.id_unidad, fecha_fin: null, es_responsable_pago: true, id_ocupacion: { not: id } },
    });
    if (otros === 0) throw badRequest('La unidad debe conservar al menos un responsable de pago vigente (RN-07)');
  }
  await prisma.ocupacionUnidad.update({ where: { id_ocupacion: id }, data: { fecha_fin: fechaADate(ahoraColombia().fecha) } });
  await auditar(req, 'FINALIZAR', 'ocupacion_unidad', id);
  res.json({ ok: true });
});
