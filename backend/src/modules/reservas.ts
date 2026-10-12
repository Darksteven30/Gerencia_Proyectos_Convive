/**
 * Módulo de reservas de zonas comunes (RF-03; CU-21 a CU-27; DS-03).
 */
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { notificar } from '../services/notificaciones';
import { exigirOcupacion, nombreUnidad, ocupacionesVigentes } from '../services/unidades';
import { ahoraColombia, dateAFecha, fechaADate, horaATime, minutos, seSolapan, timeAHora } from '../utils/dominio';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

export const reservasRouter = Router();
reservasRouter.use(autenticar);

const HORA = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM');
const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato AAAA-MM-DD');

type ZonaDb = Awaited<ReturnType<typeof prisma.zonaComun.findFirstOrThrow>>;
const mapZona = (z: ZonaDb) => ({
  id_zona: z.id_zona,
  nombre: z.nombre,
  descripcion: z.descripcion,
  aforo_maximo: z.aforo_maximo,
  costo_reserva: Number(z.costo_reserva),
  hora_apertura: timeAHora(z.hora_apertura),
  hora_cierre: timeAHora(z.hora_cierre),
  duracion_max_horas: z.duracion_max_horas,
  anticipacion_max_dias: z.anticipacion_max_dias,
  reglamento: z.reglamento,
  estado: z.estado,
});

/** Inicio del día en Colombia (UTC-5, sin horario de verano) para una fecha AAAA-MM-DD. */
const inicioDiaColombia = (fecha: string) => new Date(`${fecha}T00:00:00-05:00`);

/** Intervalos ocupados de una zona en una fecha, en minutos del día (reservas confirmadas y bloqueos). */
async function ocupacionDelDia(idZona: number, fecha: string, excluirReserva?: number) {
  const inicio = inicioDiaColombia(fecha);
  const fin = new Date(inicio.getTime() + 86_400_000);
  const [reservas, bloqueos] = await Promise.all([
    prisma.reserva.findMany({
      where: { id_zona: idZona, fecha_reserva: fechaADate(fecha), estado: 'CONFIRMADA', id_reserva: excluirReserva ? { not: excluirReserva } : undefined },
      include: { unidad: { include: { torre: true } } },
    }),
    prisma.bloqueoZona.findMany({ where: { id_zona: idZona, fecha_inicio: { lt: fin }, fecha_fin: { gt: inicio } } }),
  ]);
  return [
    ...reservas.map((r) => ({
      tipo: 'RESERVA' as const,
      inicio: timeAHora(r.hora_inicio),
      fin: timeAHora(r.hora_fin),
      desde: minutos(timeAHora(r.hora_inicio)),
      hasta: minutos(timeAHora(r.hora_fin)),
      detalle: `Reservado (${nombreUnidad(r.unidad)})`,
    })),
    ...bloqueos.map((b) => {
      const desde = Math.max(0, Math.floor((b.fecha_inicio.getTime() - inicio.getTime()) / 60_000));
      const hasta = Math.min(1440, Math.ceil((b.fecha_fin.getTime() - inicio.getTime()) / 60_000));
      const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      return { tipo: 'BLOQUEO' as const, inicio: hhmm(desde), fin: hasta >= 1440 ? '24:00' : hhmm(hasta), desde, hasta, detalle: b.motivo };
    }),
  ].sort((a, b) => a.desde - b.desde);
}

// CU-21 Consultar disponibilidad de zonas comunes
reservasRouter.get('/zonas', async (req, res) => {
  const u = usuarioActual(req);
  const zonas = await prisma.zonaComun.findMany({
    where: { id_conjunto: u.idConjunto, estado: tieneRol(req, 'ADMINISTRADOR') ? undefined : { not: 'INACTIVA' } },
    orderBy: { nombre: 'asc' },
  });
  res.json(zonas.map(mapZona));
});

reservasRouter.get('/zonas/:id/disponibilidad', async (req, res) => {
  const u = usuarioActual(req);
  const fecha = FECHA.parse(req.query.fecha);
  const zona = await prisma.zonaComun.findFirst({ where: { id_zona: Number(req.params.id), id_conjunto: u.idConjunto } });
  if (!zona) throw notFound('Zona común no encontrada');
  const ocupado = await ocupacionDelDia(zona.id_zona, fecha);
  res.json({ zona: mapZona(zona), fecha, ocupado: ocupado.map(({ desde, hasta, ...r }) => r) });
});

// CU-26 Gestionar zonas comunes y reglamento
const zonaSchema = z.object({
  nombre: z.string().trim().min(3).max(60),
  descripcion: z.string().trim().max(300).nullable().optional(),
  aforo_maximo: z.number().int().min(1).max(1000),
  costo_reserva: z.number().min(0).default(0),
  hora_apertura: HORA,
  hora_cierre: HORA,
  duracion_max_horas: z.number().int().min(1).max(24),
  anticipacion_max_dias: z.number().int().min(1).max(365),
  reglamento: z.string().trim().nullable().optional(),
  estado: z.enum(['ACTIVA', 'MANTENIMIENTO', 'INACTIVA']).default('ACTIVA'),
});

function datosZona(d: Partial<z.infer<typeof zonaSchema>>) {
  if (d.hora_apertura && d.hora_cierre && minutos(d.hora_apertura) >= minutos(d.hora_cierre)) {
    throw badRequest('La hora de apertura debe ser anterior a la hora de cierre');
  }
  return {
    ...d,
    hora_apertura: d.hora_apertura ? horaATime(d.hora_apertura) : undefined,
    hora_cierre: d.hora_cierre ? horaATime(d.hora_cierre) : undefined,
  };
}

reservasRouter.post('/zonas', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const d = zonaSchema.parse(req.body);
  datosZona(d);
  const zona = await prisma.zonaComun.create({
    data: { ...d, id_conjunto: u.idConjunto, hora_apertura: horaATime(d.hora_apertura), hora_cierre: horaATime(d.hora_cierre) },
  });
  await auditar(req, 'CREAR', 'zona_comun', zona.id_zona, d);
  res.status(201).json(mapZona(zona));
});

reservasRouter.put('/zonas/:id', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const d = zonaSchema.partial().parse(req.body);
  const actual = await prisma.zonaComun.findFirst({ where: { id_zona: id, id_conjunto: u.idConjunto } });
  if (!actual) throw notFound('Zona común no encontrada');
  datosZona({ hora_apertura: d.hora_apertura ?? timeAHora(actual.hora_apertura), hora_cierre: d.hora_cierre ?? timeAHora(actual.hora_cierre) });
  const zona = await prisma.zonaComun.update({ where: { id_zona: id }, data: datosZona(d) });
  await auditar(req, 'ACTUALIZAR', 'zona_comun', id, d);
  res.json(mapZona(zona));
});

// CU-27 Bloquear zona por mantenimiento
reservasRouter.get('/zonas/:id/bloqueos', async (req, res) => {
  const u = usuarioActual(req);
  const bloqueos = await prisma.bloqueoZona.findMany({
    where: { id_zona: Number(req.params.id), zona: { id_conjunto: u.idConjunto }, fecha_fin: { gte: new Date() } },
    orderBy: { fecha_inicio: 'asc' },
  });
  res.json(bloqueos);
});

reservasRouter.post('/zonas/:id/bloqueos', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const id = Number(req.params.id);
  const d = z
    .object({ fecha_inicio: z.coerce.date(), fecha_fin: z.coerce.date(), motivo: z.string().trim().min(3).max(200) })
    .parse(req.body);
  if (d.fecha_inicio >= d.fecha_fin) throw badRequest('El inicio del bloqueo debe ser anterior a su fin');
  const zona = await prisma.zonaComun.findFirst({ where: { id_zona: id, id_conjunto: u.idConjunto } });
  if (!zona) throw notFound('Zona común no encontrada');
  const bloqueo = await prisma.bloqueoZona.create({ data: { ...d, id_zona: id, id_creado_por: u.id } });

  // Reservas confirmadas afectadas por el bloqueo: se informa a los habitantes
  const afectadas = await prisma.reserva.findMany({
    where: { id_zona: id, estado: 'CONFIRMADA', fecha_reserva: { gte: fechaADate(dateAFecha(new Date(d.fecha_inicio.getTime() - 5 * 3_600_000))), lte: fechaADate(dateAFecha(new Date(d.fecha_fin.getTime() - 5 * 3_600_000))) } },
  });
  if (afectadas.length) {
    await notificar(afectadas.map((r) => r.id_usuario), {
      tipo: 'RESERVA',
      titulo: `${zona.nombre}: bloqueo programado`,
      mensaje: `La zona tendrá un bloqueo (${d.motivo}) que puede afectar su reserva. Consulte con la administración.`,
    });
  }
  await auditar(req, 'CREAR', 'bloqueo_zona', bloqueo.id_bloqueo, d);
  res.status(201).json({ ...bloqueo, reservas_afectadas: afectadas.length });
});

reservasRouter.delete('/bloqueos/:id', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const bloqueo = await prisma.bloqueoZona.findFirst({ where: { id_bloqueo: Number(req.params.id), zona: { id_conjunto: u.idConjunto } } });
  if (!bloqueo) throw notFound('Bloqueo no encontrado');
  await prisma.bloqueoZona.delete({ where: { id_bloqueo: bloqueo.id_bloqueo } });
  await auditar(req, 'ELIMINAR', 'bloqueo_zona', Number(req.params.id));
  res.json({ ok: true });
});

// CU-22 Reservar zona común (incluye CU-23 Validar reglas de reserva)
reservasRouter.post('/reservas', async (req, res) => {
  const u = usuarioActual(req);
  const d = z
    .object({
      id_zona: z.number().int(),
      id_unidad: z.number().int().optional(),
      fecha: FECHA,
      hora_inicio: HORA,
      hora_fin: HORA,
      numero_asistentes: z.number().int().min(1),
      observaciones: z.string().trim().max(300).optional(),
    })
    .parse(req.body);

  let idUnidad = d.id_unidad;
  if (idUnidad) await exigirOcupacion(u.id, idUnidad);
  else {
    const ocup = await ocupacionesVigentes(u.id);
    if (ocup.length === 0) throw forbidden('Debe estar vinculado a una unidad residencial para reservar');
    idUnidad = ocup[0].id_unidad;
  }

  const zona = await prisma.zonaComun.findFirst({ where: { id_zona: d.id_zona, id_conjunto: u.idConjunto } });
  if (!zona) throw notFound('Zona común no encontrada');

  // Reglas de reserva (CU-23)
  if (zona.estado !== 'ACTIVA') throw conflict(`La zona no está disponible (${zona.estado.toLowerCase()})`, 'ZONA_NO_DISPONIBLE');
  const ini = minutos(d.hora_inicio);
  const fin = minutos(d.hora_fin);
  if (ini >= fin) throw badRequest('La hora de inicio debe ser anterior a la hora de fin');
  if (ini < minutos(timeAHora(zona.hora_apertura)) || fin > minutos(timeAHora(zona.hora_cierre))) {
    throw badRequest(`El horario debe estar entre ${timeAHora(zona.hora_apertura)} y ${timeAHora(zona.hora_cierre)}`, 'FUERA_DE_HORARIO');
  }
  if (fin - ini > zona.duracion_max_horas * 60) throw badRequest(`La duración máxima es de ${zona.duracion_max_horas} hora(s)`, 'DURACION_EXCEDIDA');
  if (d.numero_asistentes > zona.aforo_maximo) throw badRequest(`El aforo máximo de la zona es de ${zona.aforo_maximo} personas`, 'AFORO_EXCEDIDO');
  const ahora = ahoraColombia();
  if (d.fecha < ahora.fecha || (d.fecha === ahora.fecha && ini <= minutos(ahora.hora))) {
    throw badRequest('No se puede reservar en una fecha u hora pasada', 'FECHA_PASADA');
  }
  const maxFecha = fechaADate(ahora.fecha);
  maxFecha.setUTCDate(maxFecha.getUTCDate() + zona.anticipacion_max_dias);
  if (fechaADate(d.fecha) > maxFecha) throw badRequest(`Solo se puede reservar con hasta ${zona.anticipacion_max_dias} días de anticipación`, 'ANTICIPACION_EXCEDIDA');

  // Control de concurrencia (DS-03): transacción con bloqueo de la fila de la zona, de modo
  // que dos habitantes no puedan confirmar la misma franja al mismo tiempo (RN-03).
  const reserva = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id_zona FROM zona_comun WHERE id_zona = ${zona.id_zona} FOR UPDATE`;
    const inicioDia = inicioDiaColombia(d.fecha);
    const [existentes, bloqueos] = await Promise.all([
      tx.reserva.findMany({ where: { id_zona: zona.id_zona, fecha_reserva: fechaADate(d.fecha), estado: 'CONFIRMADA' } }),
      tx.bloqueoZona.findMany({
        where: {
          id_zona: zona.id_zona,
          fecha_inicio: { lt: new Date(inicioDia.getTime() + fin * 60_000) },
          fecha_fin: { gt: new Date(inicioDia.getTime() + ini * 60_000) },
        },
      }),
    ]);
    if (bloqueos.length > 0) throw conflict(`La zona está bloqueada en ese horario: ${bloqueos[0].motivo}`, 'ZONA_BLOQUEADA');
    const choque = existentes.find((r) => seSolapan(ini, fin, minutos(timeAHora(r.hora_inicio)), minutos(timeAHora(r.hora_fin))));
    if (choque) {
      throw conflict(`La franja se cruza con otra reserva (${timeAHora(choque.hora_inicio)}-${timeAHora(choque.hora_fin)})`, 'FRANJA_OCUPADA');
    }
    return tx.reserva.create({
      data: {
        id_zona: zona.id_zona,
        id_usuario: u.id,
        id_unidad: idUnidad!,
        fecha_reserva: fechaADate(d.fecha),
        hora_inicio: horaATime(d.hora_inicio),
        hora_fin: horaATime(d.hora_fin),
        numero_asistentes: d.numero_asistentes,
        valor: zona.costo_reserva,
        observaciones: d.observaciones,
      },
    });
  });

  await notificar([u.id], {
    tipo: 'RESERVA',
    titulo: 'Reserva confirmada',
    mensaje: `${zona.nombre} el ${d.fecha} de ${d.hora_inicio} a ${d.hora_fin}.`,
    idReferencia: reserva.id_reserva,
  });
  await auditar(req, 'CREAR', 'reserva', reserva.id_reserva, d);
  res.status(201).json({ id_reserva: reserva.id_reserva, estado: reserva.estado, valor: Number(reserva.valor) });
});

const mapReserva = (r: Awaited<ReturnType<typeof listarReservas>>[number]) => ({
  id_reserva: r.id_reserva,
  id_zona: r.id_zona,
  zona: r.zona.nombre,
  id_unidad: r.id_unidad,
  unidad: nombreUnidad(r.unidad),
  solicitante: `${r.usuario.nombres} ${r.usuario.apellidos}`,
  fecha: dateAFecha(r.fecha_reserva),
  hora_inicio: timeAHora(r.hora_inicio),
  hora_fin: timeAHora(r.hora_fin),
  numero_asistentes: r.numero_asistentes,
  valor: Number(r.valor),
  estado: r.estado,
  observaciones: r.observaciones,
  fecha_creacion: r.fecha_creacion,
});

function listarReservas(where: object) {
  return prisma.reserva.findMany({
    where,
    include: { zona: true, unidad: { include: { torre: true } }, usuario: { select: { nombres: true, apellidos: true } } },
    orderBy: [{ fecha_reserva: 'desc' }, { hora_inicio: 'asc' }],
    take: 300,
  });
}

// CU-25 Consultar mis reservas
reservasRouter.get('/reservas/mias', async (req, res) => {
  const u = usuarioActual(req);
  const reservas = await listarReservas({ id_usuario: u.id });
  res.json(reservas.map(mapReserva));
});

reservasRouter.get('/reservas', requiereRol('ADMINISTRADOR', 'JUNTA'), async (req, res) => {
  const u = usuarioActual(req);
  const q = z.object({ fecha: FECHA.optional(), id_zona: z.coerce.number().int().optional(), estado: z.string().optional() }).parse(req.query);
  const reservas = await listarReservas({
    zona: { id_conjunto: u.idConjunto },
    id_zona: q.id_zona,
    fecha_reserva: q.fecha ? fechaADate(q.fecha) : undefined,
    estado: q.estado || undefined,
  });
  res.json(reservas.map(mapReserva));
});

// CU-24 Cancelar reserva
reservasRouter.post('/reservas/:id/cancelar', async (req, res) => {
  const u = usuarioActual(req);
  const reserva = await prisma.reserva.findUnique({ where: { id_reserva: Number(req.params.id) }, include: { zona: true } });
  if (!reserva || reserva.zona.id_conjunto !== u.idConjunto) throw notFound('Reserva no encontrada');
  const esAdmin = tieneRol(req, 'ADMINISTRADOR');
  if (reserva.id_usuario !== u.id && !esAdmin) throw forbidden('Solo puede cancelar sus propias reservas');
  if (reserva.estado !== 'CONFIRMADA') throw conflict('La reserva ya no está confirmada');
  const ahora = ahoraColombia();
  const fecha = dateAFecha(reserva.fecha_reserva);
  if (!esAdmin && (fecha < ahora.fecha || (fecha === ahora.fecha && minutos(timeAHora(reserva.hora_inicio)) <= minutos(ahora.hora)))) {
    throw badRequest('No se puede cancelar una reserva que ya inició o terminó');
  }
  await prisma.reserva.update({ where: { id_reserva: reserva.id_reserva }, data: { estado: 'CANCELADA', fecha_cancelacion: new Date() } });
  if (reserva.id_usuario !== u.id) {
    await notificar([reserva.id_usuario], {
      tipo: 'RESERVA',
      titulo: 'Reserva cancelada por la administración',
      mensaje: `Su reserva de ${reserva.zona.nombre} del ${fecha} fue cancelada.`,
      idReferencia: reserva.id_reserva,
    });
  }
  await auditar(req, 'CANCELAR', 'reserva', reserva.id_reserva);
  res.json({ ok: true });
});
