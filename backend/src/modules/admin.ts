/**
 * Administración del conjunto (RF-09; CU-08 y CU-09): tablero, datos del conjunto, torres,
 * unidades y bitácora de auditoría. La gestión de usuarios y roles está en usuarios.ts (RF-01).
 * Todas las rutas requieren el rol ADMINISTRADOR, salvo el tablero, que también ve la Junta.
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { ahoraColombia, fechaADate } from '../utils/dominio';
import { notFound } from '../utils/errors';

export const adminRouter = Router();
adminRouter.use(autenticar);

const soloAdmin = requiereRol('ADMINISTRADOR');

// --- Tablero ---------------------------------------------------------------
adminRouter.get('/tablero', requiereRol('ADMINISTRADOR', 'JUNTA'), async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const hoy = ahoraColombia().fecha;
  const [unidades, usuarios, cartera, pqrsAbiertas, reservasHoy, visitasHoy] = await Promise.all([
    prisma.unidadResidencial.count({ where: { id_conjunto: idConjunto } }),
    prisma.usuarioRol.count({ where: { id_conjunto: idConjunto, activo: true } }),
    prisma.cuotaAdministracion.aggregate({
      where: { unidad: { id_conjunto: idConjunto }, estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] } },
      _sum: { saldo: true },
      _count: true,
    }),
    prisma.pqrs.count({ where: { estado: { in: ['RADICADA', 'EN_TRAMITE'] }, solicitante: { roles: { some: { id_conjunto: idConjunto } } } } }),
    prisma.reserva.count({ where: { zona: { id_conjunto: idConjunto }, fecha_reserva: fechaADate(hoy), estado: 'CONFIRMADA' } }),
    prisma.visita.count({ where: { unidad: { id_conjunto: idConjunto }, fecha_programada: fechaADate(hoy) } }),
  ]);
  const recaudoMes = await prisma.pago.aggregate({
    where: {
      unidad: { id_conjunto: idConjunto },
      estado: 'APROBADO',
      fecha_confirmacion: { gte: new Date(`${hoy.slice(0, 7)}-01T00:00:00-05:00`) },
    },
    _sum: { valor_total: true },
  });
  res.json({
    unidades,
    usuarios,
    carteraPendiente: Number(cartera._sum.saldo ?? 0),
    cuotasPendientes: cartera._count,
    recaudoMes: Number(recaudoMes._sum.valor_total ?? 0),
    pqrsAbiertas,
    reservasHoy,
    visitasHoy,
  });
});

// --- Conjunto (CU-08) ------------------------------------------------------
adminRouter.get('/conjunto', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const conjunto = await prisma.conjunto.findUnique({ where: { id_conjunto: idConjunto } });
  if (!conjunto) throw notFound('Conjunto no encontrado');
  res.json(conjunto);
});

adminRouter.put('/conjunto', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const datos = z
    .object({
      nombre: z.string().trim().min(3).max(120),
      direccion: z.string().trim().max(200),
      ciudad: z.string().trim().max(80),
      departamento: z.string().trim().max(80),
      telefono: z.string().trim().max(20).nullable().optional(),
      correo_contacto: z.string().trim().email().nullable().optional(),
      numero_unidades: z.number().int().min(20).max(500),
    })
    .partial()
    .parse(req.body);
  const conjunto = await prisma.conjunto.update({ where: { id_conjunto: idConjunto }, data: datos });
  await auditar(req, 'ACTUALIZAR', 'conjunto', idConjunto, datos);
  res.json(conjunto);
});

// --- Torres ----------------------------------------------------------------
adminRouter.get('/torres', async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const torres = await prisma.torre.findMany({
    where: { id_conjunto: idConjunto },
    orderBy: { nombre: 'asc' },
    include: { _count: { select: { unidades: true } } },
  });
  res.json(torres.map((t) => ({ ...t, unidades: t._count.unidades, _count: undefined })));
});

adminRouter.post('/torres', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const datos = z.object({ nombre: z.string().trim().min(1).max(50), numero_pisos: z.number().int().min(1).max(80).optional() }).parse(req.body);
  const torre = await prisma.torre.create({ data: { ...datos, id_conjunto: idConjunto } });
  await auditar(req, 'CREAR', 'torre', torre.id_torre, datos);
  res.status(201).json(torre);
});

// --- Unidades residenciales -----------------------------------------------
const unidadSchema = z.object({
  id_torre: z.number().int().nullable().optional(),
  numero: z.string().trim().min(1).max(20),
  tipo: z.enum(['APARTAMENTO', 'CASA', 'LOCAL']),
  piso: z.number().int().nullable().optional(),
  area_m2: z.number().positive().nullable().optional(),
  coeficiente: z.number().positive().max(1),
  estado: z.enum(['OCUPADA', 'DESOCUPADA']).default('OCUPADA'),
});

adminRouter.post('/unidades', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const datos = unidadSchema.parse(req.body);
  const unidad = await prisma.unidadResidencial.create({ data: { ...datos, id_conjunto: idConjunto } });
  await auditar(req, 'CREAR', 'unidad_residencial', unidad.id_unidad, datos);
  res.status(201).json(unidad);
});

adminRouter.put('/unidades/:id', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const id = Number(req.params.id);
  const datos = unidadSchema.partial().parse(req.body);
  const existe = await prisma.unidadResidencial.findFirst({ where: { id_unidad: id, id_conjunto: idConjunto } });
  if (!existe) throw notFound('Unidad no encontrada');
  const unidad = await prisma.unidadResidencial.update({ where: { id_unidad: id }, data: datos });
  await auditar(req, 'ACTUALIZAR', 'unidad_residencial', id, datos);
  res.json(unidad);
});

// --- Bitácora de auditoría (CU-09) ----------------------------------------
adminRouter.get('/auditoria', soloAdmin, async (req, res) => {
  const { idConjunto } = usuarioActual(req);
  const q = z
    .object({ accion: z.string().optional(), entidad: z.string().optional(), limite: z.coerce.number().int().min(1).max(500).default(100) })
    .parse(req.query);
  const eventos = await prisma.auditoriaLog.findMany({
    where: {
      accion: q.accion || undefined,
      entidad: q.entidad || undefined,
      // Solo eventos de usuarios del conjunto del administrador (y los anónimos, p. ej. firmas inválidas)
      OR: [{ usuario: { roles: { some: { id_conjunto: idConjunto } } } }, { id_usuario: null }],
    },
    include: { usuario: { select: { nombres: true, apellidos: true, correo: true } } },
    orderBy: { fecha_evento: 'desc' },
    take: q.limite,
  });
  res.json(
    eventos.map((e) => ({
      id_log: e.id_log,
      fecha_evento: e.fecha_evento,
      accion: e.accion,
      entidad: e.entidad,
      id_entidad: e.id_entidad,
      detalle: e.detalle,
      direccion_ip: e.direccion_ip,
      usuario: e.usuario ? `${e.usuario.nombres} ${e.usuario.apellidos}` : null,
    })),
  );
});
