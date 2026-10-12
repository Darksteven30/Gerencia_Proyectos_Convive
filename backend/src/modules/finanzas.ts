/**
 * Módulo de pagos y finanzas (RF-02; CU-11 a CU-18; DS-02).
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, tieneRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { notificar } from '../services/notificaciones';
import { firmaSimulador, pasarela } from '../services/pasarela';
import { formatoCOP, generarComprobantePDF } from '../services/pdf';
import { exigirOcupacion, idsUnidadesDelUsuario, nombreUnidad } from '../services/unidades';
import { ahoraColombia, aplicarPago, dateAFecha, distribuirPorCoeficiente, estadoCuota, fechaADate, numeroComprobante } from '../utils/dominio';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';

export const finanzasRouter = Router();

const ESTADOS_ABIERTOS = ['PENDIENTE', 'PARCIAL', 'VENCIDA'];

/** RN-02: marca como VENCIDAS las cuotas con saldo cuya fecha de vencimiento ya pasó. */
export async function actualizarCuotasVencidas() {
  const hoy = fechaADate(ahoraColombia().fecha);
  await prisma.cuotaAdministracion.updateMany({
    where: { estado: { in: ['PENDIENTE', 'PARCIAL'] }, fecha_vencimiento: { lt: hoy } },
    data: { estado: 'VENCIDA' },
  });
}

const mapCuota = (c: {
  id_cuota: number;
  id_unidad: number;
  periodo: string;
  concepto: string;
  valor: unknown;
  saldo: unknown;
  fecha_vencimiento: Date;
  estado: string;
  unidad?: { numero: string; torre?: { nombre: string } | null };
}) => ({
  id_cuota: c.id_cuota,
  id_unidad: c.id_unidad,
  unidad: c.unidad ? nombreUnidad(c.unidad) : undefined,
  periodo: c.periodo,
  concepto: c.concepto,
  valor: Number(c.valor),
  saldo: Number(c.saldo),
  fecha_vencimiento: dateAFecha(c.fecha_vencimiento),
  estado: c.estado,
});

// --- Rutas públicas de la pasarela (sin autenticación) ---------------------

// Confirmación asíncrona de la pasarela (webhook firmado, DS-02 etapa 2)
finanzasRouter.post('/pagos/webhook', async (req, res) => {
  const evento = pasarela.validarEvento(req.body);
  if (!evento) {
    await auditar(req, 'WEBHOOK_FIRMA_INVALIDA', 'pago', null, { proveedor: pasarela.nombre });
    return res.status(400).json({ error: 'Firma inválida' });
  }
  await confirmarPago(evento.referencia, evento.aprobado, evento.estado);
  res.json({ ok: true });
});

// Checkout del simulador de pasarela (solo cuando PAYMENT_PROVIDER=mock)
finanzasRouter.get('/pagos/simulador/:referencia', async (req, res) => {
  const pago = await prisma.pago.findUnique({
    where: { referencia_pasarela: req.params.referencia },
    include: { unidad: { include: { torre: true } } },
  });
  if (!pago) return res.status(404).send('Pago no encontrado');
  const ref = pago.referencia_pasarela!;
  const pendiente = pago.estado === 'PENDIENTE';
  res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pasarela de pruebas · Convive</title>
<style>body{font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:24px;color:#0f172a}
.card{max-width:420px;margin:auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 4px 20px #0001}
h1{font-size:20px;margin:0 0 4px}.muted{color:#64748b;font-size:14px}.total{font-size:32px;font-weight:700;margin:16px 0}
.aviso{background:#fef3c7;color:#92400e;padding:10px 12px;border-radius:8px;font-size:13px;margin:16px 0}
button{width:100%;padding:14px;border:0;border-radius:10px;font-size:16px;font-weight:600;margin-top:10px;cursor:pointer}
.ok{background:#16a34a;color:#fff}.no{background:#e2e8f0;color:#0f172a}</style></head><body><div class="card">
<h1>Pasarela de pagos de pruebas</h1><div class="muted">Unidad ${nombreUnidad(pago.unidad)} · Ref. ${ref}</div>
<div class="total">${formatoCOP(Number(pago.valor_total))}</div>
<div class="aviso">Entorno de pruebas (sandbox). No se realizará ningún cobro real.</div>
${
  pendiente
    ? `<form method="post"><input type="hidden" name="resultado" value="APROBADO"><button class="ok">Aprobar pago</button></form>
<form method="post"><input type="hidden" name="resultado" value="RECHAZADO"><button class="no">Rechazar pago</button></form>`
    : `<p>Este pago ya fue procesado con estado <b>${pago.estado}</b>. Puede cerrar esta ventana y volver a la aplicación.</p>`
}
</div></body></html>`);
});

finanzasRouter.post('/pagos/simulador/:referencia', async (req, res) => {
  const resultado = req.body?.resultado === 'APROBADO' ? 'APROBADO' : 'RECHAZADO';
  const referencia = req.params.referencia;
  // Se procesa exactamente como la llamada firmada de una pasarela real.
  const evento = pasarela.validarEvento({ referencia, resultado, firma: firmaSimulador(referencia, resultado) });
  if (!evento) return res.status(400).send('Simulador no habilitado');
  await confirmarPago(evento.referencia, evento.aprobado, evento.estado);
  res.redirect(`/api/pagos/retorno?referencia=${encodeURIComponent(referencia)}`);
});

finanzasRouter.get('/pagos/retorno', async (req, res) => {
  const referencia = String(req.query.referencia ?? req.query.id ?? '');
  const pago = referencia ? await prisma.pago.findUnique({ where: { referencia_pasarela: referencia } }) : null;
  const estado = pago?.estado ?? 'EN PROCESO';
  const color = estado === 'APROBADO' ? '#16a34a' : estado === 'RECHAZADO' ? '#dc2626' : '#2563eb';
  res.type('html').send(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resultado del pago</title></head>
<body style="font-family:system-ui,sans-serif;background:#f1f5f9;padding:24px"><div style="max-width:420px;margin:auto;background:#fff;border-radius:16px;padding:24px;text-align:center">
<div style="font-size:48px;color:${color}">${estado === 'APROBADO' ? '✓' : estado === 'RECHAZADO' ? '✕' : '…'}</div>
<h1 style="font-size:20px">Pago ${estado.toLowerCase()}</h1><p style="color:#64748b">Ya puede cerrar esta ventana y volver a Convive.</p></div></body></html>`);
});

// --- Rutas autenticadas ----------------------------------------------------
finanzasRouter.use(autenticar);

// CU-11 Consultar estado de cuenta
finanzasRouter.get('/cuotas', async (req, res) => {
  const u = usuarioActual(req);
  await actualizarCuotasVencidas();
  const q = z
    .object({
      estado: z.string().optional(),
      periodo: z.string().optional(),
      id_unidad: z.coerce.number().int().optional(),
    })
    .parse(req.query);
  const esGestion = tieneRol(req, 'ADMINISTRADOR', 'JUNTA');
  const unidades = esGestion ? undefined : await idsUnidadesDelUsuario(u.id);
  const cuotas = await prisma.cuotaAdministracion.findMany({
    where: {
      unidad: { id_conjunto: u.idConjunto },
      id_unidad: q.id_unidad ?? (unidades ? { in: unidades } : undefined),
      estado: q.estado === 'ABIERTAS' ? { in: ESTADOS_ABIERTOS } : q.estado || undefined,
      periodo: q.periodo || undefined,
    },
    include: { unidad: { include: { torre: true } } },
    orderBy: [{ fecha_vencimiento: 'desc' }, { id_unidad: 'asc' }],
  });
  if (unidades && q.id_unidad && !unidades.includes(q.id_unidad)) throw forbidden();
  res.json(cuotas.map(mapCuota));
});

finanzasRouter.get('/estado-cuenta', async (req, res) => {
  const u = usuarioActual(req);
  await actualizarCuotasVencidas();
  const ocupaciones = await prisma.ocupacionUnidad.findMany({
    where: { id_usuario: u.id, fecha_fin: null },
    include: {
      unidad: {
        include: {
          torre: true,
          cuotas: { where: { estado: { in: ESTADOS_ABIERTOS } }, orderBy: { fecha_vencimiento: 'asc' } },
        },
      },
    },
  });
  res.json(
    ocupaciones.map((o) => ({
      id_unidad: o.id_unidad,
      unidad: nombreUnidad(o.unidad),
      es_responsable_pago: o.es_responsable_pago,
      saldo_total: o.unidad.cuotas.reduce((s, c) => s + Number(c.saldo), 0),
      cuotas_vencidas: o.unidad.cuotas.filter((c) => c.estado === 'VENCIDA').length,
      cuotas: o.unidad.cuotas.map(mapCuota),
    })),
  );
});

// CU-17 Generar cuotas del periodo (distribución por coeficiente, Ley 675 de 2001)
finanzasRouter.post('/cuotas/generar', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const datos = z
    .object({
      periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Formato AAAA-MM'),
      presupuesto_mensual: z.number().positive(),
      fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      concepto: z.enum(['ORDINARIA', 'EXTRAORDINARIA']).default('ORDINARIA'),
    })
    .parse(req.body);
  const unidades = await prisma.unidadResidencial.findMany({ where: { id_conjunto: u.idConjunto } });
  const reparto = distribuirPorCoeficiente(
    datos.presupuesto_mensual,
    unidades.map((x) => ({ id: x.id_unidad, coeficiente: Number(x.coeficiente) })),
  );
  const existentes = await prisma.cuotaAdministracion.findMany({
    where: { periodo: datos.periodo, concepto: datos.concepto, id_unidad: { in: unidades.map((x) => x.id_unidad) } },
    select: { id_unidad: true },
  });
  const yaGeneradas = new Set(existentes.map((e) => e.id_unidad));
  const nuevas = [...reparto.entries()].filter(([id]) => !yaGeneradas.has(id));
  await prisma.cuotaAdministracion.createMany({
    data: nuevas.map(([id_unidad, valor]) => ({
      id_unidad,
      periodo: datos.periodo,
      concepto: datos.concepto,
      valor,
      saldo: valor,
      fecha_vencimiento: fechaADate(datos.fecha_vencimiento),
    })),
  });
  // Aviso a los responsables de pago
  const responsables = await prisma.ocupacionUnidad.findMany({
    where: { id_unidad: { in: nuevas.map(([id]) => id) }, fecha_fin: null, es_responsable_pago: true },
    select: { id_usuario: true },
  });
  await notificar(
    responsables.map((r) => r.id_usuario),
    {
      tipo: 'RECORDATORIO_PAGO',
      titulo: `Cuota de administración ${datos.periodo}`,
      mensaje: `Ya está disponible la cuota ${datos.concepto.toLowerCase()} del periodo ${datos.periodo}. Vence el ${datos.fecha_vencimiento}.`,
    },
  );
  await auditar(req, 'GENERAR_CUOTAS', 'cuota_administracion', null, { ...datos, generadas: nuevas.length });
  res.status(201).json({ generadas: nuevas.length, omitidas: yaGeneradas.size });
});

// RN-02: liquidar intereses de mora sobre cuotas vencidas
finanzasRouter.post('/cuotas/intereses', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  await actualizarCuotasVencidas();
  const datos = z
    .object({
      periodo: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      // Tasa mensual. La Ley 675 de 2001 limita la mora a 1,5 veces el interés bancario corriente;
      // el administrador debe ingresar la tasa vigente certificada por la Superfinanciera.
      tasa_mensual: z.number().positive().max(5),
      fecha_vencimiento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .parse(req.body);
  const vencidas = await prisma.cuotaAdministracion.groupBy({
    by: ['id_unidad'],
    where: { estado: 'VENCIDA', concepto: { not: 'INTERES_MORA' }, unidad: { id_conjunto: u.idConjunto } },
    _sum: { saldo: true },
  });
  let creadas = 0;
  for (const v of vencidas) {
    const interes = Math.round((Number(v._sum.saldo ?? 0) * datos.tasa_mensual) / 100);
    if (interes <= 0) continue;
    const r = await prisma.cuotaAdministracion.createMany({
      data: [{
        id_unidad: v.id_unidad,
        periodo: datos.periodo,
        concepto: 'INTERES_MORA',
        valor: interes,
        saldo: interes,
        fecha_vencimiento: fechaADate(datos.fecha_vencimiento),
      }],
      skipDuplicates: true,
    });
    creadas += r.count;
  }
  await auditar(req, 'LIQUIDAR_INTERESES', 'cuota_administracion', null, { ...datos, creadas });
  res.status(201).json({ creadas });
});

/** CU-18: envía recordatorios de cuotas que vencen en los próximos 5 días o ya vencidas. */
export async function enviarRecordatoriosPago(idConjunto?: number) {
  await actualizarCuotasVencidas();
  const hoy = ahoraColombia().fecha;
  const limite = fechaADate(hoy);
  limite.setUTCDate(limite.getUTCDate() + 5);
  const cuotas = await prisma.cuotaAdministracion.findMany({
    where: {
      estado: { in: ESTADOS_ABIERTOS },
      fecha_vencimiento: { lte: limite },
      unidad: idConjunto ? { id_conjunto: idConjunto } : undefined,
    },
    include: { unidad: { include: { torre: true, ocupaciones: { where: { fecha_fin: null, es_responsable_pago: true } } } } },
  });
  let enviados = 0;
  for (const c of cuotas) {
    const vencida = dateAFecha(c.fecha_vencimiento) < hoy;
    const ids = c.unidad.ocupaciones.map((o) => o.id_usuario);
    await notificar(ids, {
      tipo: 'RECORDATORIO_PAGO',
      titulo: vencida ? 'Cuota vencida' : 'Recordatorio de pago',
      mensaje: `${vencida ? 'Tiene una cuota vencida' : 'Su cuota vence pronto'}: ${c.concepto.toLowerCase()} ${c.periodo} de la unidad ${nombreUnidad(c.unidad)} por ${formatoCOP(Number(c.saldo))} (vence ${dateAFecha(c.fecha_vencimiento)}).`,
      idReferencia: c.id_cuota,
    });
    enviados += ids.length;
  }
  return { cuotas: cuotas.length, notificaciones: enviados };
}

finanzasRouter.post('/cuotas/recordatorios', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const r = await enviarRecordatoriosPago(usuarioActual(req).idConjunto);
  await auditar(req, 'ENVIAR_RECORDATORIOS', 'cuota_administracion', null, r);
  res.json(r);
});

// CU-12 Pagar cuotas de administración (DS-02 etapa 1: crear el pago y abrir el checkout)
finanzasRouter.post('/pagos', async (req, res) => {
  const u = usuarioActual(req);
  const datos = z.object({ id_unidad: z.number().int(), cuotas: z.array(z.number().int()).min(1) }).parse(req.body);
  const ocupacion = await exigirOcupacion(u.id, datos.id_unidad);
  if (!ocupacion.es_responsable_pago && ocupacion.tipo_relacion !== 'PROPIETARIO') {
    throw forbidden('Solo el propietario o el responsable de pago de la unidad puede pagar las cuotas (RN-07)');
  }
  await actualizarCuotasVencidas();
  const cuotas = await prisma.cuotaAdministracion.findMany({
    where: { id_cuota: { in: datos.cuotas }, id_unidad: datos.id_unidad },
    orderBy: { fecha_vencimiento: 'asc' },
  });
  if (cuotas.length !== datos.cuotas.length) throw notFound('Alguna de las cuotas no existe o no pertenece a la unidad');
  // A1: cuotas ya pagadas
  const noPendientes = cuotas.filter((c) => !ESTADOS_ABIERTOS.includes(c.estado));
  if (noPendientes.length > 0) throw conflict('Alguna de las cuotas seleccionadas ya no está pendiente', 'CUOTA_PAGADA');

  const total = cuotas.reduce((s, c) => s + Number(c.saldo), 0);
  const referencia = `CNV-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const pago = await prisma.pago.create({
    data: {
      id_unidad: datos.id_unidad,
      id_usuario: u.id,
      valor_total: total,
      metodo_pago: 'PASARELA',
      referencia_pasarela: referencia,
      estado: 'PENDIENTE',
      detalles: { create: cuotas.map((c) => ({ id_cuota: c.id_cuota, valor_aplicado: c.saldo })) },
    },
  });
  const { url } = pasarela.crearCheckout({ referencia, valor: total, correo: u.correo });
  await auditar(req, 'CREAR', 'pago', pago.id_pago, { referencia, total, pasarela: pasarela.nombre });
  res.status(201).json({ id_pago: pago.id_pago, referencia, valor_total: total, checkout_url: url, pasarela: pasarela.nombre });
});

/**
 * DS-02 etapa 2: procesa la confirmación de la pasarela de forma idempotente (A3: confirmación
 * duplicada) dentro de una transacción con bloqueo de la fila del pago.
 */
export async function confirmarPago(referencia: string, aprobado: boolean, estadoPasarela: string) {
  const resultado = await prisma.$transaction(async (tx) => {
    const filas = await tx.$queryRaw<{ id_pago: number; estado: string }[]>`
      SELECT id_pago, estado FROM pago WHERE referencia_pasarela = ${referencia} FOR UPDATE`;
    const fila = filas[0];
    if (!fila) return null;
    if (fila.estado !== 'PENDIENTE') return { idPago: fila.id_pago, procesado: false };

    if (!aprobado) {
      await tx.pago.update({ where: { id_pago: fila.id_pago }, data: { estado: 'RECHAZADO', fecha_confirmacion: new Date() } });
      return { idPago: fila.id_pago, procesado: true, aprobado: false };
    }

    const hoy = ahoraColombia().fecha;
    const detalles = await tx.detallePago.findMany({ where: { id_pago: fila.id_pago }, include: { cuota: true } });
    for (const d of detalles) {
      const aplicado = Math.min(Number(d.valor_aplicado), Number(d.cuota.saldo));
      const saldo = Number(d.cuota.saldo) - aplicado;
      await tx.cuotaAdministracion.update({
        where: { id_cuota: d.id_cuota },
        data: { saldo, estado: estadoCuota(Number(d.cuota.valor), saldo, dateAFecha(d.cuota.fecha_vencimiento), hoy) },
      });
      if (aplicado !== Number(d.valor_aplicado)) {
        await tx.detallePago.update({ where: { id_detalle_pago: d.id_detalle_pago }, data: { valor_aplicado: aplicado } });
      }
    }
    await tx.pago.update({ where: { id_pago: fila.id_pago }, data: { estado: 'APROBADO', fecha_confirmacion: new Date() } });
    return { idPago: fila.id_pago, procesado: true, aprobado: true };
  });

  if (!resultado?.procesado) return resultado;
  const pago = await prisma.pago.findUniqueOrThrow({ where: { id_pago: resultado.idPago } });
  if (resultado.aprobado) {
    await emitirComprobante(resultado.idPago);
    await notificar([pago.id_usuario], {
      tipo: 'RECORDATORIO_PAGO',
      titulo: 'Pago aprobado',
      mensaje: `Su pago por ${formatoCOP(Number(pago.valor_total))} fue aprobado. El comprobante ya está disponible.`,
      idReferencia: pago.id_pago,
    });
  } else {
    await notificar([pago.id_usuario], {
      tipo: 'RECORDATORIO_PAGO',
      titulo: 'Pago rechazado',
      mensaje: `La pasarela rechazó su pago (${estadoPasarela}). Sus cuotas conservan el saldo pendiente.`,
      idReferencia: pago.id_pago,
    });
  }
  await auditar(null, resultado.aprobado ? 'PAGO_APROBADO' : 'PAGO_RECHAZADO', 'pago', pago.id_pago, { referencia, estadoPasarela }, pago.id_usuario);
  return resultado;
}

/** CU-13 Generar comprobante de pago (RN-08: un comprobante por pago aprobado, con consecutivo). */
async function emitirComprobante(idPago: number) {
  const pago = await prisma.pago.findUniqueOrThrow({
    where: { id_pago: idPago },
    include: {
      comprobante: true,
      usuario: true,
      unidad: { include: { torre: true, conjunto: true } },
      detalles: { include: { cuota: true } },
    },
  });
  // Si ya existe y su archivo está disponible, no se emite otro (RN-08). Si el archivo se perdió
  // (el disco de los servidores gratuitos es efímero), se regenera con el mismo consecutivo.
  if (pago.comprobante?.url_archivo && fs.existsSync(path.join(env.uploadDir, pago.comprobante.url_archivo))) {
    return pago.comprobante;
  }
  const comprobante =
    pago.comprobante ??
    (await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`LOCK TABLE comprobante_pago IN SHARE ROW EXCLUSIVE MODE`;
      const n = (await tx.comprobantePago.count()) + 1;
      return tx.comprobantePago.create({
        data: { id_pago: idPago, numero_comprobante: numeroComprobante(n), url_archivo: '' },
      });
    }));
  const archivo = await generarComprobantePDF({
    numero: comprobante.numero_comprobante,
    conjunto: pago.unidad.conjunto.nombre,
    nit: pago.unidad.conjunto.nit,
    unidad: nombreUnidad(pago.unidad),
    pagador: `${pago.usuario.nombres} ${pago.usuario.apellidos}`,
    metodo: pago.metodo_pago,
    referencia: pago.referencia_pasarela,
    fecha: pago.fecha_confirmacion ?? new Date(),
    detalles: pago.detalles.map((d) => ({ concepto: d.cuota.concepto, periodo: d.cuota.periodo, valor: Number(d.valor_aplicado) })),
    total: Number(pago.valor_total),
  });
  return prisma.comprobantePago.update({ where: { id_comprobante: comprobante.id_comprobante }, data: { url_archivo: archivo } });
}

// CU-16 Registrar pago manual (transferencia o efectivo)
finanzasRouter.post('/pagos/manual', requiereRol('ADMINISTRADOR'), async (req, res) => {
  const u = usuarioActual(req);
  const datos = z
    .object({
      id_unidad: z.number().int(),
      valor: z.number().positive(),
      metodo_pago: z.enum(['TRANSFERENCIA', 'EFECTIVO']),
      referencia: z.string().trim().max(60).optional(),
    })
    .parse(req.body);
  await actualizarCuotasVencidas();
  const unidad = await prisma.unidadResidencial.findFirst({
    where: { id_unidad: datos.id_unidad, id_conjunto: u.idConjunto },
    include: { ocupaciones: { where: { fecha_fin: null, es_responsable_pago: true } } },
  });
  if (!unidad) throw notFound('Unidad no encontrada');
  const pagador = unidad.ocupaciones[0]?.id_usuario;
  if (!pagador) throw badRequest('La unidad no tiene responsable de pago vigente (RN-07)');
  const cuotas = await prisma.cuotaAdministracion.findMany({
    where: { id_unidad: datos.id_unidad, estado: { in: ESTADOS_ABIERTOS } },
    orderBy: { fecha_vencimiento: 'asc' },
  });
  const deuda = cuotas.reduce((s, c) => s + Number(c.saldo), 0);
  if (deuda <= 0) throw badRequest('La unidad no tiene cuotas pendientes');
  if (datos.valor > deuda) throw badRequest(`El valor supera la deuda pendiente de la unidad (${formatoCOP(deuda)})`);

  const aplicaciones = aplicarPago(datos.valor, cuotas.map((c) => ({ id: c.id_cuota, saldo: Number(c.saldo) })));
  const referencia = `MAN-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
  const pago = await prisma.pago.create({
    data: {
      id_unidad: datos.id_unidad,
      id_usuario: pagador,
      id_registrado_por: u.id,
      valor_total: datos.valor,
      metodo_pago: datos.metodo_pago,
      referencia_pasarela: datos.referencia ? `${referencia}-${datos.referencia}`.slice(0, 80) : referencia,
      estado: 'PENDIENTE',
      detalles: { create: aplicaciones.map((a) => ({ id_cuota: a.id, valor_aplicado: a.aplicado })) },
    },
  });
  await confirmarPago(pago.referencia_pasarela!, true, 'MANUAL');
  await auditar(req, 'PAGO_MANUAL', 'pago', pago.id_pago, datos);
  res.status(201).json({ id_pago: pago.id_pago, aplicado_a: aplicaciones.length });
});

// CU-14 Consultar histórico de pagos
finanzasRouter.get('/pagos', async (req, res) => {
  const u = usuarioActual(req);
  const esGestion = tieneRol(req, 'ADMINISTRADOR', 'JUNTA');
  const unidades = esGestion ? undefined : await idsUnidadesDelUsuario(u.id);
  const pagos = await prisma.pago.findMany({
    where: {
      unidad: { id_conjunto: u.idConjunto },
      id_unidad: unidades ? { in: unidades } : undefined,
    },
    include: {
      unidad: { include: { torre: true } },
      usuario: { select: { nombres: true, apellidos: true } },
      comprobante: true,
      detalles: { include: { cuota: true } },
    },
    orderBy: { fecha_creacion: 'desc' },
    take: 200,
  });
  res.json(
    pagos.map((p) => ({
      id_pago: p.id_pago,
      id_unidad: p.id_unidad,
      unidad: nombreUnidad(p.unidad),
      pagador: `${p.usuario.nombres} ${p.usuario.apellidos}`,
      valor_total: Number(p.valor_total),
      metodo_pago: p.metodo_pago,
      referencia: p.referencia_pasarela,
      estado: p.estado,
      fecha_creacion: p.fecha_creacion,
      fecha_confirmacion: p.fecha_confirmacion,
      comprobante: p.comprobante?.numero_comprobante ?? null,
      cuotas: p.detalles.map((d) => ({ periodo: d.cuota.periodo, concepto: d.cuota.concepto, valor_aplicado: Number(d.valor_aplicado) })),
    })),
  );
});

finanzasRouter.get('/pagos/:id', async (req, res) => {
  const u = usuarioActual(req);
  const pago = await prisma.pago.findUnique({ where: { id_pago: Number(req.params.id) }, include: { comprobante: true } });
  if (!pago) throw notFound('Pago no encontrado');
  if (!tieneRol(req, 'ADMINISTRADOR', 'JUNTA')) await exigirOcupacion(u.id, pago.id_unidad);
  res.json({
    id_pago: pago.id_pago,
    estado: pago.estado,
    valor_total: Number(pago.valor_total),
    referencia: pago.referencia_pasarela,
    comprobante: pago.comprobante?.numero_comprobante ?? null,
  });
});

// CU-15 Descargar comprobante de pago (PDF)
finanzasRouter.get('/pagos/:id/comprobante', async (req, res) => {
  const u = usuarioActual(req);
  const pago = await prisma.pago.findUnique({ where: { id_pago: Number(req.params.id) }, include: { comprobante: true } });
  if (!pago) throw notFound('Pago no encontrado');
  if (!tieneRol(req, 'ADMINISTRADOR', 'JUNTA')) await exigirOcupacion(u.id, pago.id_unidad);
  if (pago.estado !== 'APROBADO') throw badRequest('El pago no está aprobado; no tiene comprobante');
  const comprobante = await emitirComprobante(pago.id_pago);
  res.download(path.join(env.uploadDir, comprobante.url_archivo), `${comprobante.numero_comprobante}.pdf`);
});
