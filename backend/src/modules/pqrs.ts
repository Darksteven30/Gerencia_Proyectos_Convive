/**
 * Módulo de PQRS (RF-04; CU-28 a CU-35; DS-04).
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { notificar, usuariosConRol } from '../services/notificaciones';
import { rutaArchivo } from '../services/pdf';
import { exigirOcupacion, nombreUnidad } from '../services/unidades';
import { dateAFecha, numeroRadicado, sumarDiasHabiles } from '../utils/dominio';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

export const pqrsRouter = Router();
pqrsRouter.use(autenticar);

// RN-09: hasta tres adjuntos JPG, PNG o PDF de máximo 5 MB cada uno
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];
const subida = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.dirname(rutaArchivo('pqrs', 'x'))),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 3 },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_PERMITIDOS.includes(file.mimetype)) cb(null, true);
    else cb(badRequest(`Tipo de archivo no permitido (${file.originalname}). Solo JPG, PNG o PDF (RN-09)`, 'ADJUNTO_NO_PERMITIDO'));
  },
});

const PLAZO_DIAS_HABILES = Number(process.env.PQRS_PLAZO_DIAS ?? 15); // RN-04

const mapPqrs = (p: Awaited<ReturnType<typeof listar>>[number]) => ({
  id_pqrs: p.id_pqrs,
  numero_radicado: p.numero_radicado,
  tipo: p.tipo,
  categoria: p.categoria,
  asunto: p.asunto,
  descripcion: p.descripcion,
  prioridad: p.prioridad,
  estado: p.estado,
  respuesta: p.respuesta,
  calificacion: p.calificacion,
  fecha_radicacion: p.fecha_radicacion,
  fecha_limite: dateAFecha(p.fecha_limite),
  fecha_cierre: p.fecha_cierre,
  vencida: !['RESPONDIDA', 'CERRADA'].includes(p.estado) && dateAFecha(p.fecha_limite) < new Date().toISOString().slice(0, 10),
  solicitante: `${p.solicitante.nombres} ${p.solicitante.apellidos}`,
  unidad: p.unidad ? nombreUnidad(p.unidad) : null,
  responsable: p.responsable ? `${p.responsable.nombres} ${p.responsable.apellidos}` : null,
  id_responsable: p.id_responsable,
  adjuntos: p._count.adjuntos,
});

function listar(where: object) {
  return prisma.pqrs.findMany({
    where,
    include: {
      solicitante: { select: { nombres: true, apellidos: true } },
      responsable: { select: { nombres: true, apellidos: true } },
      unidad: { include: { torre: true } },
      _count: { select: { adjuntos: true } },
    },
    orderBy: { fecha_radicacion: 'desc' },
    take: 300,
  });
}

// CU-28 Radicar PQRS (+ CU-29 Adjuntar evidencias), multipart/form-data con campo "adjuntos"
pqrsRouter.post('/', subida.array('adjuntos', 3), async (req, res) => {
  const u = usuarioActual(req);
  const archivos = (req.files as Express.Multer.File[] | undefined) ?? [];
  try {
    const d = z
      .object({
        tipo: z.enum(['PETICION', 'QUEJA', 'RECLAMO', 'SUGERENCIA']),
        categoria: z.string().trim().min(3).max(30),
        asunto: z.string().trim().min(5).max(150),
        descripcion: z.string().trim().min(10),
        prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA']).default('MEDIA'),
        id_unidad: z.coerce.number().int().optional(),
      })
      .parse(req.body);
    if (d.id_unidad) await exigirOcupacion(u.id, d.id_unidad);

    const ahora = new Date();
    const pqrs = await prisma.$transaction(async (tx) => {
      // Consecutivo anual del radicado sin duplicados bajo concurrencia
      await tx.$executeRaw`LOCK TABLE pqrs IN SHARE ROW EXCLUSIVE MODE`;
      const anio = ahora.getFullYear();
      const n = await tx.pqrs.count({ where: { numero_radicado: { startsWith: `PQ-${anio}-` } } });
      const creada = await tx.pqrs.create({
        data: {
          numero_radicado: numeroRadicado(anio, n + 1),
          id_usuario: u.id,
          id_unidad: d.id_unidad,
          tipo: d.tipo,
          categoria: d.categoria,
          asunto: d.asunto,
          descripcion: d.descripcion,
          prioridad: d.prioridad,
          fecha_limite: sumarDiasHabiles(ahora, PLAZO_DIAS_HABILES),
          adjuntos: {
            create: archivos.map((f) => ({
              nombre_archivo: f.originalname.slice(0, 150),
              tipo_mime: f.mimetype,
              tamano_kb: Math.ceil(f.size / 1024),
              url_archivo: `pqrs/${f.filename}`,
            })),
          },
        },
      });
      await tx.pqrsSeguimiento.create({
        data: { id_pqrs: creada.id_pqrs, id_usuario: u.id, estado_nuevo: 'RADICADA', comentario: 'Solicitud radicada' },
      });
      return creada;
    });

    const admins = await usuariosConRol(u.idConjunto, ['ADMINISTRADOR']);
    await notificar(admins, {
      tipo: 'PQRS',
      titulo: `Nueva PQRS ${pqrs.numero_radicado}`,
      mensaje: `${d.tipo.toLowerCase()}: ${d.asunto}`,
      idReferencia: pqrs.id_pqrs,
    });
    await auditar(req, 'CREAR', 'pqrs', pqrs.id_pqrs, { radicado: pqrs.numero_radicado, adjuntos: archivos.length });
    res.status(201).json({ id_pqrs: pqrs.id_pqrs, numero_radicado: pqrs.numero_radicado, fecha_limite: dateAFecha(pqrs.fecha_limite) });
  } catch (err) {
    archivos.forEach((f) => fs.rm(f.path, () => undefined));
    throw err;
  }
});

// CU-30 Consultar estado de PQRS (propias) / CU-31 Gestionar (administrador)
pqrsRouter.get('/', async (req, res) => {
  const u = usuarioActual(req);
  const q = z.object({ estado: z.string().optional(), tipo: z.string().optional() }).parse(req.query);
  const gestion = tieneRol(req, 'ADMINISTRADOR', 'JUNTA');
  const lista = await listar({
    id_usuario: gestion ? undefined : u.id,
    solicitante: gestion ? { roles: { some: { id_conjunto: u.idConjunto } } } : undefined,
    estado: q.estado === 'ABIERTAS' ? { in: ['RADICADA', 'EN_TRAMITE'] } : q.estado || undefined,
    tipo: q.tipo || undefined,
  });
  res.json(lista.map(mapPqrs));
});

async function obtenerAutorizada(req: Parameters<typeof usuarioActual>[0], id: number) {
  const u = usuarioActual(req);
  const p = await prisma.pqrs.findUnique({
    where: { id_pqrs: id },
    include: { solicitante: { select: { roles: { where: { id_conjunto: u.idConjunto }, select: { id_usuario_rol: true } } } } },
  });
  if (!p) throw notFound('PQRS no encontrada');
  if (p.id_usuario !== u.id) {
    // La gestión solo alcanza las PQRS de habitantes de su propio conjunto
    if (!tieneRol(req, 'ADMINISTRADOR', 'JUNTA')) throw forbidden();
    if (p.solicitante.roles.length === 0) throw notFound('PQRS no encontrada');
  }
  return p;
}

pqrsRouter.get('/:id', async (req, res) => {
  const p = await obtenerAutorizada(req, Number(req.params.id));
  const [detalle] = await listar({ id_pqrs: p.id_pqrs });
  const [seguimientos, adjuntos] = await Promise.all([
    prisma.pqrsSeguimiento.findMany({
      where: { id_pqrs: p.id_pqrs },
      include: { usuario: { select: { nombres: true, apellidos: true } } },
      orderBy: { fecha_registro: 'asc' },
    }),
    prisma.pqrsAdjunto.findMany({ where: { id_pqrs: p.id_pqrs } }),
  ]);
  res.json({
    ...mapPqrs(detalle),
    seguimientos: seguimientos.map((s) => ({
      estado_anterior: s.estado_anterior,
      estado_nuevo: s.estado_nuevo,
      comentario: s.comentario,
      fecha_registro: s.fecha_registro,
      usuario: `${s.usuario.nombres} ${s.usuario.apellidos}`,
    })),
    lista_adjuntos: adjuntos.map((a) => ({ id_adjunto: a.id_adjunto, nombre_archivo: a.nombre_archivo, tipo_mime: a.tipo_mime, tamano_kb: a.tamano_kb })),
  });
});

pqrsRouter.get('/:id/adjuntos/:idAdjunto', async (req, res) => {
  const p = await obtenerAutorizada(req, Number(req.params.id));
  const a = await prisma.pqrsAdjunto.findFirst({ where: { id_adjunto: Number(req.params.idAdjunto), id_pqrs: p.id_pqrs } });
  if (!a) throw notFound('Adjunto no encontrado');
  const ruta = path.join(env.uploadDir, a.url_archivo);
  if (!fs.existsSync(ruta)) throw notFound('El archivo ya no está disponible en el servidor de pruebas');
  res.download(ruta, a.nombre_archivo);
});

/** Cambia el estado, registra el seguimiento y notifica al solicitante (CU-33). */
async function cambiarEstado(idPqrs: number, idUsuario: number, nuevo: string, comentario: string | undefined, data: object = {}) {
  const p = await prisma.pqrs.findUniqueOrThrow({ where: { id_pqrs: idPqrs } });
  await prisma.$transaction([
    prisma.pqrs.update({ where: { id_pqrs: idPqrs }, data: { estado: nuevo, ...data } }),
    prisma.pqrsSeguimiento.create({
      data: { id_pqrs: idPqrs, id_usuario: idUsuario, estado_anterior: p.estado, estado_nuevo: nuevo, comentario },
    }),
  ]);
  if (p.id_usuario !== idUsuario) {
    await notificar([p.id_usuario], {
      tipo: 'PQRS',
      titulo: `PQRS ${p.numero_radicado}: ${nuevo.replace('_', ' ').toLowerCase()}`,
      mensaje: comentario ?? `Su solicitud cambió a estado ${nuevo}.`,
      idReferencia: idPqrs,
    });
  }
}

// CU-31 Gestionar y asignar PQRS
pqrsRouter.post('/:id/asignar', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const d = z.object({ id_responsable: z.number().int().optional(), prioridad: z.enum(['BAJA', 'MEDIA', 'ALTA']).optional(), comentario: z.string().max(500).optional() }).parse(req.body);
  const p = await obtenerAutorizada(req, Number(req.params.id));
  if (p.estado === 'CERRADA') throw conflict('La PQRS ya está cerrada');
  await cambiarEstado(p.id_pqrs, u.id, 'EN_TRAMITE', d.comentario ?? 'La solicitud está en trámite', {
    id_responsable: d.id_responsable ?? u.id,
    prioridad: d.prioridad,
  });
  await auditar(req, 'ASIGNAR', 'pqrs', p.id_pqrs, d);
  res.json({ ok: true });
});

// CU-32 Responder PQRS
pqrsRouter.post('/:id/responder', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const { respuesta } = z.object({ respuesta: z.string().trim().min(5) }).parse(req.body);
  const p = await obtenerAutorizada(req, Number(req.params.id));
  if (p.estado === 'CERRADA') throw conflict('La PQRS ya está cerrada');
  await cambiarEstado(p.id_pqrs, u.id, 'RESPONDIDA', respuesta, { respuesta, id_responsable: p.id_responsable ?? u.id });
  await auditar(req, 'RESPONDER', 'pqrs', p.id_pqrs);
  res.json({ ok: true });
});

// CU-35 Cerrar PQRS
pqrsRouter.post('/:id/cerrar', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const { comentario } = z.object({ comentario: z.string().max(500).optional() }).parse(req.body ?? {});
  const p = await obtenerAutorizada(req, Number(req.params.id));
  if (p.estado === 'CERRADA') throw conflict('La PQRS ya está cerrada');
  if (!p.respuesta) throw badRequest('Debe responder la PQRS antes de cerrarla');
  await cambiarEstado(p.id_pqrs, u.id, 'CERRADA', comentario ?? 'Solicitud cerrada', { fecha_cierre: new Date() });
  await auditar(req, 'CERRAR', 'pqrs', p.id_pqrs);
  res.json({ ok: true });
});

// CU-34 Calificar atención recibida
pqrsRouter.post('/:id/calificar', async (req, res) => {
  const u = usuarioActual(req);
  const { calificacion } = z.object({ calificacion: z.number().int().min(1).max(5) }).parse(req.body);
  const p = await obtenerAutorizada(req, Number(req.params.id));
  if (p.id_usuario !== u.id) throw forbidden('Solo el solicitante puede calificar la atención');
  if (!['RESPONDIDA', 'CERRADA'].includes(p.estado)) throw badRequest('Solo se puede calificar una PQRS respondida o cerrada');
  await prisma.pqrs.update({ where: { id_pqrs: p.id_pqrs }, data: { calificacion } });
  await auditar(req, 'CALIFICAR', 'pqrs', p.id_pqrs, { calificacion });
  res.json({ ok: true });
});
