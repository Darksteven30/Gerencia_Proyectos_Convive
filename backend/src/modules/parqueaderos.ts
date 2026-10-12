/**
 * Módulo de parqueaderos (RF-07; CU-49 a CU-53).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { nombreUnidad } from '../services/unidades';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

export const parqueaderosRouter = Router();
parqueaderosRouter.use(autenticar);

const PLACA = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{5,10}$/, 'Placa inválida');

// CU-51 Consultar disponibilidad de parqueaderos
parqueaderosRouter.get('/', requiereRol('ADMINISTRADOR', 'PORTERIA', 'JUNTA'), async (req, res) => {
  const u = usuarioActual(req);
  const q = z.object({ tipo: z.enum(['RESIDENTE', 'VISITANTE']).optional() }).parse(req.query);
  const parqueaderos = await prisma.parqueadero.findMany({
    where: { id_conjunto: u.idConjunto, tipo: q.tipo },
    include: {
      unidad_propietaria: { include: { torre: true } },
      asignaciones: {
        where: { estado: 'ACTIVA' },
        include: { unidad: { include: { torre: true } }, visita: { include: { visitante: true } } },
      },
    },
    orderBy: { codigo: 'asc' },
  });
  res.json(
    parqueaderos.map((p) => {
      const a = p.asignaciones[0];
      return {
        id_parqueadero: p.id_parqueadero,
        codigo: p.codigo,
        tipo: p.tipo,
        ubicacion: p.ubicacion,
        estado: p.estado,
        unidad_propietaria: p.unidad_propietaria ? nombreUnidad(p.unidad_propietaria) : null,
        asignacion: a
          ? {
              id_asignacion: a.id_asignacion,
              placa: a.placa,
              tipo_vehiculo: a.tipo_vehiculo,
              fecha_inicio: a.fecha_inicio,
              unidad: a.unidad ? nombreUnidad(a.unidad) : null,
              visitante: a.visita ? `${a.visita.visitante.nombres} ${a.visita.visitante.apellidos}` : null,
            }
          : null,
      };
    }),
  );
});

// CU-53 Gestionar parqueaderos
parqueaderosRouter.post('/', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const d = z
    .object({
      codigo: z.string().trim().min(1).max(10),
      tipo: z.enum(['RESIDENTE', 'VISITANTE']),
      ubicacion: z.string().trim().max(60).optional(),
      id_unidad_propietaria: z.number().int().nullable().optional(),
    })
    .parse(req.body);
  const p = await prisma.parqueadero.create({ data: { ...d, id_conjunto: u.idConjunto } });
  await auditar(req, 'CREAR', 'parqueadero', p.id_parqueadero, d);
  res.status(201).json(p);
});

parqueaderosRouter.put('/:id', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const d = z
    .object({
      ubicacion: z.string().trim().max(60).optional(),
      estado: z.enum(['DISPONIBLE', 'MANTENIMIENTO']).optional(),
      id_unidad_propietaria: z.number().int().nullable().optional(),
    })
    .parse(req.body);
  const p = await prisma.parqueadero.findFirst({ where: { id_parqueadero: id, id_conjunto: u.idConjunto } });
  if (!p) throw notFound('Parqueadero no encontrado');
  if (d.estado && p.estado === 'OCUPADO') throw conflict('Libere el parqueadero antes de cambiar su estado');
  await prisma.parqueadero.update({ where: { id_parqueadero: id }, data: d });
  await auditar(req, 'ACTUALIZAR', 'parqueadero', id, d);
  res.json({ ok: true });
});

// CU-49 Asignar parqueadero de visitante / CU-50 Asignar parqueadero a residente
parqueaderosRouter.post('/:id/asignar', requiereRol('ADMINISTRADOR', 'PORTERIA'), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const d = z
    .object({
      placa: PLACA,
      tipo_vehiculo: z.enum(['CARRO', 'MOTO']),
      id_unidad: z.number().int().optional(),
      id_visita: z.number().int().optional(),
    })
    .refine((x) => !!x.id_unidad !== !!x.id_visita, 'Indique la unidad (residente) o la visita (visitante), no ambas')
    .parse(req.body);
  if (d.id_unidad && !tieneRol(req, 'ADMINISTRADOR')) throw forbidden('Solo la administración asigna parqueaderos a residentes');

  // RN-06: una celda no puede tener más de una asignación activa (bloqueo de fila)
  const asignacion = await prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id_parqueadero: number }[]>`
      SELECT id_parqueadero FROM parqueadero WHERE id_parqueadero = ${id} FOR UPDATE`;
    if (!filas[0]) throw notFound('Parqueadero no encontrado');
    const p = await tx.parqueadero.findUniqueOrThrow({ where: { id_parqueadero: id } });
    if (p.id_conjunto !== u.idConjunto) throw notFound('Parqueadero no encontrado');
    if (p.estado === 'MANTENIMIENTO') throw conflict('El parqueadero está en mantenimiento');
    const activa = await tx.asignacionParqueadero.count({ where: { id_parqueadero: id, estado: 'ACTIVA' } });
    if (activa > 0 || p.estado === 'OCUPADO') throw conflict('El parqueadero ya tiene una asignación activa (RN-06)', 'PARQUEADERO_OCUPADO');
    if (d.id_visita) {
      if (p.tipo !== 'VISITANTE') throw badRequest('Esta celda no es de visitantes');
      const v = await tx.visita.findFirst({ where: { id_visita: d.id_visita, unidad: { id_conjunto: u.idConjunto } } });
      if (!v || v.estado !== 'INGRESADA') throw badRequest('La visita debe tener el ingreso registrado');
    }
    if (d.id_unidad && p.tipo !== 'RESIDENTE') throw badRequest('Esta celda no es de residentes');
    await tx.parqueadero.update({ where: { id_parqueadero: id }, data: { estado: 'OCUPADO' } });
    return tx.asignacionParqueadero.create({
      data: { id_parqueadero: id, id_unidad: d.id_unidad, id_visita: d.id_visita, id_asignado_por: u.id, placa: d.placa, tipo_vehiculo: d.tipo_vehiculo },
    });
  });
  await auditar(req, 'ASIGNAR', 'parqueadero', id, d);
  res.status(201).json(asignacion);
});

// CU-52 Liberar parqueadero
parqueaderosRouter.post('/asignaciones/:id/liberar', requiereRol('ADMINISTRADOR', 'PORTERIA'), async (req, res) => {
  const a = await prisma.asignacionParqueadero.findUnique({ where: { id_asignacion: Number(req.params.id) } });
  if (!a || a.estado !== 'ACTIVA') throw notFound('Asignación activa no encontrada');
  await prisma.$transaction([
    prisma.asignacionParqueadero.update({ where: { id_asignacion: a.id_asignacion }, data: { estado: 'FINALIZADA', fecha_fin: new Date() } }),
    prisma.parqueadero.update({ where: { id_parqueadero: a.id_parqueadero }, data: { estado: 'DISPONIBLE' } }),
  ]);
  await auditar(req, 'LIBERAR', 'parqueadero', a.id_parqueadero);
  res.json({ ok: true });
});
