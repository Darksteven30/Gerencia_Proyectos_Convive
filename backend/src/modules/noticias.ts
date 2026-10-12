/**
 * Módulo de noticias, comunicados y notificaciones (RF-05; CU-33 y CU-36 a CU-40; DS-05).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { notificar } from '../services/notificaciones';
import { badRequest, conflict, notFound } from '../utils/errors';

export const noticiasRouter = Router();
export const notificacionesRouter = Router();
noticiasRouter.use(autenticar);
notificacionesRouter.use(autenticar);

const PUBLICADORES = ['ADMINISTRADOR', 'JUNTA'] as const;

const noticiaSchema = z.object({
  titulo: z.string().trim().min(5).max(150),
  contenido: z.string().trim().min(10),
  tipo: z.enum(['NOTICIA', 'COMUNICADO', 'URGENTE']).default('NOTICIA'),
  publico_objetivo: z.enum(['TODOS', 'PROPIETARIOS', 'RESIDENTES', 'TORRE']).default('TODOS'),
  id_torre_destino: z.number().int().nullable().optional(),
  fecha_expiracion: z.coerce.date().nullable().optional(),
});

type NoticiaDb = Awaited<ReturnType<typeof listar>>[number];
const mapNoticia = (n: NoticiaDb) => ({
  id_noticia: n.id_noticia,
  titulo: n.titulo,
  contenido: n.contenido,
  tipo: n.tipo,
  publico_objetivo: n.publico_objetivo,
  id_torre_destino: n.id_torre_destino,
  torre_destino: n.torre_destino?.nombre ?? null,
  estado: n.estado,
  autor: `${n.autor.nombres} ${n.autor.apellidos}`,
  fecha_publicacion: n.fecha_publicacion,
  fecha_expiracion: n.fecha_expiracion,
  fecha_creacion: n.fecha_creacion,
});

function listar(where: object) {
  return prisma.noticia.findMany({
    where,
    include: { autor: { select: { nombres: true, apellidos: true } }, torre_destino: true },
    orderBy: [{ fecha_publicacion: 'desc' }, { fecha_creacion: 'desc' }],
    take: 200,
  });
}

/** Destinatarios de una publicación según su público objetivo (publicación segmentada). */
async function destinatarios(n: { id_conjunto: number; publico_objetivo: string; id_torre_destino: number | null }) {
  const base = { usuario: { estado: 'ACTIVO' }, unidad: { id_conjunto: n.id_conjunto } };
  let ocupaciones: { id_usuario: number }[];
  switch (n.publico_objetivo) {
    case 'PROPIETARIOS':
      ocupaciones = await prisma.ocupacionUnidad.findMany({ where: { ...base, fecha_fin: null, tipo_relacion: 'PROPIETARIO' }, select: { id_usuario: true } });
      break;
    case 'RESIDENTES':
      ocupaciones = await prisma.ocupacionUnidad.findMany({ where: { ...base, fecha_fin: null, tipo_relacion: { in: ['RESIDENTE', 'ARRENDATARIO'] } }, select: { id_usuario: true } });
      break;
    case 'TORRE':
      ocupaciones = await prisma.ocupacionUnidad.findMany({
        where: { fecha_fin: null, usuario: { estado: 'ACTIVO' }, unidad: { id_conjunto: n.id_conjunto, id_torre: n.id_torre_destino } },
        select: { id_usuario: true },
      });
      break;
    default: {
      const roles = await prisma.usuarioRol.findMany({
        where: { id_conjunto: n.id_conjunto, activo: true, usuario: { estado: 'ACTIVO' } },
        select: { id_usuario: true },
      });
      ocupaciones = roles;
    }
  }
  return [...new Set(ocupaciones.map((o) => o.id_usuario))];
}

// CU-36 Consultar noticias y comunicados (filtradas por el público del usuario)
noticiasRouter.get('/', async (req, res) => {
  const u = usuarioActual(req);
  const ahora = new Date();
  const ocupaciones = await prisma.ocupacionUnidad.findMany({ where: { id_usuario: u.id, fecha_fin: null }, include: { unidad: true } });
  const publicos = ['TODOS'];
  if (ocupaciones.some((o) => o.tipo_relacion === 'PROPIETARIO')) publicos.push('PROPIETARIOS');
  if (ocupaciones.some((o) => o.tipo_relacion !== 'PROPIETARIO')) publicos.push('RESIDENTES');
  const torres = ocupaciones.map((o) => o.unidad.id_torre).filter((t): t is number => t !== null);
  const gestion = tieneRol(req, ...PUBLICADORES);

  const noticias = await listar({
    id_conjunto: u.idConjunto,
    estado: 'PUBLICADA',
    OR: [{ fecha_expiracion: null }, { fecha_expiracion: { gt: ahora } }],
    ...(gestion
      ? {}
      : { AND: [{ OR: [{ publico_objetivo: { in: publicos } }, { publico_objetivo: 'TORRE', id_torre_destino: { in: torres } }] }] }),
  });
  res.json(noticias.map(mapNoticia));
});

// CU-39 Gestionar noticias publicadas (incluye borradores y archivadas)
noticiasRouter.get('/gestion', requiereRol(...PUBLICADORES), async (req, res) => {
  const u = usuarioActual(req);
  res.json((await listar({ id_conjunto: u.idConjunto })).map(mapNoticia));
});

noticiasRouter.get('/:id', async (req, res) => {
  const u = usuarioActual(req);
  const [n] = await listar({ id_noticia: Number(req.params.id), id_conjunto: u.idConjunto });
  if (!n || (n.estado !== 'PUBLICADA' && !tieneRol(req, ...PUBLICADORES))) throw notFound('Noticia no encontrada');
  res.json(mapNoticia(n));
});

/** Publica una noticia y envía las notificaciones push a su público (CU-38). */
async function publicar(idNoticia: number) {
  const n = await prisma.noticia.update({
    where: { id_noticia: idNoticia },
    data: { estado: 'PUBLICADA', fecha_publicacion: new Date() },
  });
  const ids = await destinatarios(n);
  await notificar(ids, {
    tipo: 'NOTICIA',
    titulo: `${n.tipo === 'URGENTE' ? '⚠ ' : ''}${n.titulo}`,
    mensaje: n.contenido.slice(0, 280),
    idNoticia: n.id_noticia,
    idReferencia: n.id_noticia,
  });
  return ids.length;
}

// CU-37 Publicar noticia o comunicado
noticiasRouter.post('/', requiereRol(...PUBLICADORES), async (req, res) => {
  const u = usuarioActual(req);
  const d = noticiaSchema.extend({ publicar: z.boolean().default(true) }).parse(req.body);
  if (d.publico_objetivo === 'TORRE' && !d.id_torre_destino) throw badRequest('Seleccione la torre destinataria');
  const n = await prisma.noticia.create({
    data: {
      id_conjunto: u.idConjunto,
      id_autor: u.id,
      titulo: d.titulo,
      contenido: d.contenido,
      tipo: d.tipo,
      publico_objetivo: d.publico_objetivo,
      id_torre_destino: d.publico_objetivo === 'TORRE' ? d.id_torre_destino : null,
      fecha_expiracion: d.fecha_expiracion ?? null,
      estado: 'BORRADOR',
    },
  });
  const notificados = d.publicar ? await publicar(n.id_noticia) : 0;
  await auditar(req, d.publicar ? 'PUBLICAR' : 'CREAR', 'noticia', n.id_noticia, { titulo: d.titulo, notificados });
  res.status(201).json({ id_noticia: n.id_noticia, estado: d.publicar ? 'PUBLICADA' : 'BORRADOR', notificados });
});

noticiasRouter.put('/:id', requiereRol(...PUBLICADORES), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const d = noticiaSchema.partial().parse(req.body);
  const n = await prisma.noticia.findFirst({ where: { id_noticia: id, id_conjunto: u.idConjunto } });
  if (!n) throw notFound('Noticia no encontrada');
  await prisma.noticia.update({ where: { id_noticia: id }, data: d });
  await auditar(req, 'ACTUALIZAR', 'noticia', id, d);
  res.json({ ok: true });
});

noticiasRouter.post('/:id/publicar', requiereRol(...PUBLICADORES), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const n = await prisma.noticia.findFirst({ where: { id_noticia: id, id_conjunto: u.idConjunto } });
  if (!n) throw notFound('Noticia no encontrada');
  if (n.estado === 'PUBLICADA') throw conflict('La noticia ya está publicada');
  const notificados = await publicar(id);
  await auditar(req, 'PUBLICAR', 'noticia', id, { notificados });
  res.json({ ok: true, notificados });
});

noticiasRouter.post('/:id/archivar', requiereRol(...PUBLICADORES), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const n = await prisma.noticia.findFirst({ where: { id_noticia: id, id_conjunto: u.idConjunto } });
  if (!n) throw notFound('Noticia no encontrada');
  await prisma.noticia.update({ where: { id_noticia: id }, data: { estado: 'ARCHIVADA' } });
  await auditar(req, 'ARCHIVAR', 'noticia', id);
  res.json({ ok: true });
});

// --- Bandeja de notificaciones del usuario ---------------------------------
notificacionesRouter.get('/', async (req, res) => {
  const u = usuarioActual(req);
  const notificaciones = await prisma.notificacion.findMany({
    where: { id_usuario: u.id },
    orderBy: { fecha_creacion: 'desc' },
    take: 100,
  });
  const noLeidas = await prisma.notificacion.count({ where: { id_usuario: u.id, fecha_lectura: null } });
  res.json({ no_leidas: noLeidas, notificaciones });
});

notificacionesRouter.post('/:id/leer', async (req, res) => {
  const u = usuarioActual(req);
  await prisma.notificacion.updateMany({
    where: { id_notificacion: Number(req.params.id), id_usuario: u.id, fecha_lectura: null },
    data: { estado: 'LEIDA', fecha_lectura: new Date() },
  });
  res.json({ ok: true });
});

notificacionesRouter.post('/leer-todas', async (req, res) => {
  const u = usuarioActual(req);
  const r = await prisma.notificacion.updateMany({
    where: { id_usuario: u.id, fecha_lectura: null },
    data: { estado: 'LEIDA', fecha_lectura: new Date() },
  });
  res.json({ ok: true, actualizadas: r.count });
});
