/**
 * Módulo de visitantes (RF-06; CU-41 a CU-48; DS-06).
 */
import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { notificar } from '../services/notificaciones';
import { firmaQRValida, generarCodigoQR } from '../services/qr';
import { exigirOcupacion, nombreUnidad, ocupacionesVigentes } from '../services/unidades';
import { ahoraColombia, dateAFecha, fechaADate, horaATime, minutos, timeAHora } from '../utils/dominio';
import { AppError, badRequest, conflict, forbidden, notFound } from '../utils/errors';

export const visitasRouter = Router();
visitasRouter.use(autenticar);

const HORA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM');
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD');
const PLACA = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{5,10}$/, 'Placa inválida');

function listarVisitas(where: object) {
  return prisma.visita.findMany({
    where,
    include: {
      visitante: true,
      unidad: { include: { torre: true } },
      anfitrion: { select: { nombres: true, apellidos: true, telefono: true } },
      vigilante: { select: { nombres: true, apellidos: true } },
      asignaciones: { where: { estado: 'ACTIVA' }, include: { parqueadero: true } },
    },
    orderBy: [{ fecha_programada: 'desc' }, { hora_desde: 'desc' }],
    take: 300,
  });
}

type VisitaDb = Awaited<ReturnType<typeof listarVisitas>>[number];
const mapVisita = (v: VisitaDb, incluirCodigo: boolean) => ({
  id_visita: v.id_visita,
  visitante: {
    id_visitante: v.visitante.id_visitante,
    nombre: `${v.visitante.nombres} ${v.visitante.apellidos}`,
    tipo_documento: v.visitante.tipo_documento,
    numero_documento: v.visitante.numero_documento,
    telefono: v.visitante.telefono,
    placa_vehiculo: v.visitante.placa_vehiculo,
  },
  id_unidad: v.id_unidad,
  unidad: nombreUnidad(v.unidad),
  anfitrion: `${v.anfitrion.nombres} ${v.anfitrion.apellidos}`,
  anfitrion_telefono: v.anfitrion.telefono,
  fecha_programada: dateAFecha(v.fecha_programada),
  hora_desde: timeAHora(v.hora_desde),
  hora_hasta: timeAHora(v.hora_hasta),
  motivo: v.motivo,
  ingresa_vehiculo: v.ingresa_vehiculo,
  estado: v.estado,
  codigo_qr: incluirCodigo ? v.codigo_qr : undefined,
  qr_expira: v.qr_expira,
  fecha_hora_ingreso: v.fecha_hora_ingreso,
  fecha_hora_salida: v.fecha_hora_salida,
  vigilante: v.vigilante ? `${v.vigilante.nombres} ${v.vigilante.apellidos}` : null,
  parqueadero: v.asignaciones[0]?.parqueadero.codigo ?? null,
});

/** Marca como VENCIDAS las visitas pre-registradas cuyo código ya expiró. */
async function vencerVisitas() {
  await prisma.visita.updateMany({ where: { estado: 'PREREGISTRADA', qr_expira: { lt: new Date() } }, data: { estado: 'VENCIDA' } });
}

// CU-41 Pre-registrar visitante (incluye CU-42 Generar código QR de acceso)
visitasRouter.post('/', async (req, res) => {
  const u = usuarioActual(req);
  const d = z
    .object({
      id_unidad: z.number().int().optional(),
      tipo_documento: z.enum(['CC', 'CE', 'PA', 'TI']),
      numero_documento: z.string().trim().min(4).max(20),
      nombres: z.string().trim().min(2).max(80),
      apellidos: z.string().trim().min(2).max(80),
      telefono: z.string().trim().max(20).optional(),
      placa_vehiculo: PLACA.optional(),
      fecha_programada: FECHA,
      hora_desde: HORA,
      hora_hasta: HORA,
      motivo: z.string().trim().max(150).optional(),
    })
    .parse(req.body);

  let idUnidad = d.id_unidad;
  if (idUnidad) await exigirOcupacion(u.id, idUnidad);
  else {
    const ocup = await ocupacionesVigentes(u.id);
    if (!ocup.length) throw forbidden('Debe estar vinculado a una unidad residencial para pre-registrar visitas');
    idUnidad = ocup[0].id_unidad;
  }
  if (minutos(d.hora_desde) >= minutos(d.hora_hasta)) throw badRequest('La hora inicial de la franja debe ser anterior a la final');
  const ahora = ahoraColombia();
  if (d.fecha_programada < ahora.fecha || (d.fecha_programada === ahora.fecha && minutos(d.hora_hasta) <= minutos(ahora.hora))) {
    throw badRequest('La franja autorizada ya pasó', 'FECHA_PASADA');
  }

  const visitante = await prisma.visitante.upsert({
    where: { tipo_documento_numero_documento: { tipo_documento: d.tipo_documento, numero_documento: d.numero_documento } },
    create: {
      tipo_documento: d.tipo_documento,
      numero_documento: d.numero_documento,
      nombres: d.nombres,
      apellidos: d.apellidos,
      telefono: d.telefono,
      placa_vehiculo: d.placa_vehiculo,
    },
    update: { nombres: d.nombres, apellidos: d.apellidos, telefono: d.telefono, placa_vehiculo: d.placa_vehiculo },
  });
  const visita = await prisma.visita.create({
    data: {
      id_visitante: visitante.id_visitante,
      id_unidad: idUnidad,
      id_anfitrion: u.id,
      fecha_programada: fechaADate(d.fecha_programada),
      hora_desde: horaATime(d.hora_desde),
      hora_hasta: horaATime(d.hora_hasta),
      motivo: d.motivo,
      codigo_qr: generarCodigoQR(),
      // El código vence al finalizar la franja autorizada (hora de Colombia, UTC-5)
      qr_expira: new Date(`${d.fecha_programada}T${d.hora_hasta}:00-05:00`),
      ingresa_vehiculo: !!d.placa_vehiculo,
    },
  });
  await auditar(req, 'CREAR', 'visita', visita.id_visita, { visitante: d.numero_documento, fecha: d.fecha_programada });
  const [completa] = await listarVisitas({ id_visita: visita.id_visita });
  res.status(201).json(mapVisita(completa, true));
});

// CU-44 Consultar y cancelar visitas (propias)
visitasRouter.get('/mias', async (req, res) => {
  const u = usuarioActual(req);
  await vencerVisitas();
  res.json((await listarVisitas({ id_anfitrion: u.id })).map((v) => mapVisita(v, true)));
});

// CU-48 Consultar historial de visitas (administración y portería)
visitasRouter.get('/', requiereRol('ADMINISTRADOR', 'PORTERIA', 'JUNTA'), async (req, res) => {
  const u = usuarioActual(req);
  await vencerVisitas();
  const q = z.object({ fecha: FECHA.optional(), estado: z.string().optional() }).parse(req.query);
  const visitas = await listarVisitas({
    unidad: { id_conjunto: u.idConjunto },
    fecha_programada: q.fecha ? fechaADate(q.fecha) : undefined,
    estado: q.estado || undefined,
  });
  res.json(visitas.map((v) => mapVisita(v, false)));
});

// CU-43 Compartir código QR: imagen PNG del código para enviar al visitante
visitasRouter.get('/:id/qr.png', async (req, res) => {
  const u = usuarioActual(req);
  const v = await prisma.visita.findUnique({ where: { id_visita: Number(req.params.id) } });
  if (!v || (v.id_anfitrion !== u.id && !tieneRol(req, 'ADMINISTRADOR'))) throw notFound('Visita no encontrada');
  res.type('png').send(await QRCode.toBuffer(v.codigo_qr, { width: 480, margin: 2 }));
});

visitasRouter.post('/:id/cancelar', async (req, res) => {
  const u = usuarioActual(req);
  const v = await prisma.visita.findUnique({ where: { id_visita: Number(req.params.id) } });
  if (!v || (v.id_anfitrion !== u.id && !tieneRol(req, 'ADMINISTRADOR'))) throw notFound('Visita no encontrada');
  if (v.estado !== 'PREREGISTRADA') throw conflict('Solo se pueden cancelar visitas pre-registradas');
  await prisma.visita.update({ where: { id_visita: v.id_visita }, data: { estado: 'CANCELADA' } });
  await auditar(req, 'CANCELAR', 'visita', v.id_visita);
  res.json({ ok: true });
});

const MOTIVOS: Record<string, string> = {
  INGRESADA: 'El código ya fue utilizado',
  FINALIZADA: 'El código ya fue utilizado',
  CANCELADA: 'La visita fue cancelada por el anfitrión',
  VENCIDA: 'El código está vencido',
};

// CU-45 Validar ingreso por código QR (incluye CU-46 Verificar vigencia del código QR)
visitasRouter.post('/validar', requiereRol('PORTERIA', 'ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const { codigo } = z.object({ codigo: z.string().trim().min(10).max(120) }).parse(req.body);
  const denegar = async (motivo: string, idVisita?: number) => {
    await auditar(req, 'INGRESO_DENEGADO', 'visita', idVisita ?? null, { motivo });
    throw new AppError(422, `Ingreso no autorizado: ${motivo}`, 'INGRESO_NO_AUTORIZADO');
  };

  // A1: código inválido (firma alterada o inexistente)
  if (!firmaQRValida(codigo)) return denegar('el código no es válido');

  const resultado = await prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id_visita: number }[]>`SELECT id_visita FROM visita WHERE codigo_qr = ${codigo} FOR UPDATE`;
    if (!filas[0]) return { error: 'el código no corresponde a ninguna visita' };
    const v = await tx.visita.findUniqueOrThrow({ where: { id_visita: filas[0].id_visita }, include: { unidad: true } });
    if (v.unidad.id_conjunto !== u.idConjunto) return { error: 'la visita no pertenece a este conjunto', id: v.id_visita };
    if (v.estado !== 'PREREGISTRADA') return { error: MOTIVOS[v.estado] ?? v.estado, id: v.id_visita };
    if (v.qr_expira < new Date()) {
      await tx.visita.update({ where: { id_visita: v.id_visita }, data: { estado: 'VENCIDA' } });
      return { error: MOTIVOS.VENCIDA, id: v.id_visita };
    }
    // A2: fuera de la franja autorizada (RN-05)
    const ahora = ahoraColombia();
    const fecha = dateAFecha(v.fecha_programada);
    const ahoraMin = minutos(ahora.hora);
    if (ahora.fecha !== fecha || ahoraMin < minutos(timeAHora(v.hora_desde)) || ahoraMin > minutos(timeAHora(v.hora_hasta))) {
      return {
        error: `la visita está autorizada para el ${fecha} entre ${timeAHora(v.hora_desde)} y ${timeAHora(v.hora_hasta)}. Contacte al anfitrión.`,
        id: v.id_visita,
      };
    }
    await tx.visita.update({
      where: { id_visita: v.id_visita },
      data: { estado: 'INGRESADA', fecha_hora_ingreso: new Date(), id_vigilante: u.id },
    });
    return { id: v.id_visita };
  });

  if ('error' in resultado && resultado.error) return denegar(resultado.error, resultado.id);
  const [visita] = await listarVisitas({ id_visita: resultado.id });
  await notificar([visita.id_anfitrion], {
    tipo: 'VISITA',
    titulo: 'Su visita llegó',
    mensaje: `${visita.visitante.nombres} ${visita.visitante.apellidos} ingresó al conjunto.`,
    idReferencia: visita.id_visita,
  });
  await auditar(req, 'INGRESO_AUTORIZADO', 'visita', visita.id_visita);
  res.json({ autorizado: true, visita: mapVisita(visita, false) });
});

// CU-47 Registrar salida de visitante (libera el parqueadero de visitante, si lo tenía)
visitasRouter.post('/:id/salida', requiereRol('PORTERIA', 'ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const v = await prisma.visita.findFirst({ where: { id_visita: Number(req.params.id), unidad: { id_conjunto: u.idConjunto } } });
  if (!v) throw notFound('Visita no encontrada');
  if (v.estado !== 'INGRESADA') throw conflict('La visita no tiene un ingreso registrado');
  await prisma.$transaction(async (tx) => {
    await tx.visita.update({ where: { id_visita: v.id_visita }, data: { estado: 'FINALIZADA', fecha_hora_salida: new Date() } });
    const asignaciones = await tx.asignacionParqueadero.findMany({ where: { id_visita: v.id_visita, estado: 'ACTIVA' } });
    for (const a of asignaciones) {
      await tx.asignacionParqueadero.update({ where: { id_asignacion: a.id_asignacion }, data: { estado: 'FINALIZADA', fecha_fin: new Date() } });
      await tx.parqueadero.update({ where: { id_parqueadero: a.id_parqueadero }, data: { estado: 'DISPONIBLE' } });
    }
  });
  await auditar(req, 'SALIDA', 'visita', v.id_visita);
  res.json({ ok: true });
});
