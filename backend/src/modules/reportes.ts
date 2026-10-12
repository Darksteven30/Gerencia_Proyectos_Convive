/**
 * Reportes financieros y administrativos (RF-08; CU-19 y CU-20).
 * GET /api/reportes/:tipo?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&formato=json|pdf|xlsx
 */
import { Router } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { autenticar, requiereRol, usuarioActual } from '../middleware/auth';
import { auditar } from '../services/auditoria';
import { formatoCOP, generarTablaPDF } from '../services/pdf';
import { nombreUnidad } from '../services/unidades';
import { dateAFecha, fechaADate, timeAHora } from '../utils/dominio';
import { badRequest } from '../utils/errors';

export const reportesRouter = Router();
reportesRouter.use(autenticar, requiereRol('ADMINISTRADOR', 'JUNTA'));

const TIPOS = ['RECAUDO', 'CARTERA', 'PQRS', 'RESERVAS', 'VISITAS'] as const;
type Tipo = (typeof TIPOS)[number];

interface Tabla {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
  resumen: Record<string, string | number>;
}

async function construir(tipo: Tipo, idConjunto: number, desde: string, hasta: string): Promise<Tabla> {
  const inicio = new Date(`${desde}T00:00:00-05:00`);
  const fin = new Date(`${hasta}T23:59:59-05:00`);

  switch (tipo) {
    case 'RECAUDO': {
      const pagos = await prisma.pago.findMany({
        where: { unidad: { id_conjunto: idConjunto }, estado: 'APROBADO', fecha_confirmacion: { gte: inicio, lte: fin } },
        include: { unidad: { include: { torre: true } }, usuario: true, comprobante: true },
        orderBy: { fecha_confirmacion: 'asc' },
      });
      const total = pagos.reduce((s, p) => s + Number(p.valor_total), 0);
      return {
        titulo: 'Reporte de recaudo',
        columnas: ['Fecha', 'Unidad', 'Pagador', 'Medio', 'Comprobante', 'Valor'],
        filas: pagos.map((p) => [
          p.fecha_confirmacion!.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          nombreUnidad(p.unidad),
          `${p.usuario.nombres} ${p.usuario.apellidos}`,
          p.metodo_pago,
          p.comprobante?.numero_comprobante ?? '',
          Number(p.valor_total),
        ]),
        resumen: { 'Pagos aprobados': pagos.length, 'Total recaudado': formatoCOP(total) },
      };
    }
    case 'CARTERA': {
      const cuotas = await prisma.cuotaAdministracion.findMany({
        where: { unidad: { id_conjunto: idConjunto }, estado: { in: ['PENDIENTE', 'PARCIAL', 'VENCIDA'] }, fecha_vencimiento: { lte: fechaADate(hasta) } },
        include: { unidad: { include: { torre: true } } },
        orderBy: [{ id_unidad: 'asc' }, { fecha_vencimiento: 'asc' }],
      });
      const total = cuotas.reduce((s, c) => s + Number(c.saldo), 0);
      const vencido = cuotas.filter((c) => c.estado === 'VENCIDA').reduce((s, c) => s + Number(c.saldo), 0);
      return {
        titulo: 'Reporte de cartera',
        columnas: ['Unidad', 'Periodo', 'Concepto', 'Vence', 'Estado', 'Valor', 'Saldo'],
        filas: cuotas.map((c) => [
          nombreUnidad(c.unidad),
          c.periodo,
          c.concepto,
          dateAFecha(c.fecha_vencimiento),
          c.estado,
          Number(c.valor),
          Number(c.saldo),
        ]),
        resumen: { 'Cuotas abiertas': cuotas.length, 'Cartera total': formatoCOP(total), 'Cartera vencida': formatoCOP(vencido) },
      };
    }
    case 'PQRS': {
      const pqrs = await prisma.pqrs.findMany({
        where: { fecha_radicacion: { gte: inicio, lte: fin }, solicitante: { roles: { some: { id_conjunto: idConjunto } } } },
        include: { solicitante: true },
        orderBy: { fecha_radicacion: 'asc' },
      });
      const cerradas = pqrs.filter((p) => p.estado === 'CERRADA' || p.estado === 'RESPONDIDA').length;
      const calificadas = pqrs.filter((p) => p.calificacion);
      return {
        titulo: 'Reporte de PQRS',
        columnas: ['Radicado', 'Fecha', 'Tipo', 'Categoría', 'Asunto', 'Estado', 'Límite', 'Calificación'],
        filas: pqrs.map((p) => [
          p.numero_radicado,
          p.fecha_radicacion.toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
          p.tipo,
          p.categoria,
          p.asunto,
          p.estado,
          dateAFecha(p.fecha_limite),
          p.calificacion ?? '',
        ]),
        resumen: {
          'PQRS radicadas': pqrs.length,
          'Respondidas o cerradas': cerradas,
          'Calificación promedio': calificadas.length
            ? (calificadas.reduce((s, p) => s + (p.calificacion ?? 0), 0) / calificadas.length).toFixed(1)
            : 'N/A',
        },
      };
    }
    case 'RESERVAS': {
      const reservas = await prisma.reserva.findMany({
        where: { zona: { id_conjunto: idConjunto }, fecha_reserva: { gte: fechaADate(desde), lte: fechaADate(hasta) } },
        include: { zona: true, unidad: { include: { torre: true } } },
        orderBy: [{ fecha_reserva: 'asc' }, { hora_inicio: 'asc' }],
      });
      return {
        titulo: 'Reporte de reservas de zonas comunes',
        columnas: ['Fecha', 'Zona', 'Horario', 'Unidad', 'Asistentes', 'Estado', 'Valor'],
        filas: reservas.map((r) => [
          dateAFecha(r.fecha_reserva),
          r.zona.nombre,
          `${timeAHora(r.hora_inicio)}-${timeAHora(r.hora_fin)}`,
          nombreUnidad(r.unidad),
          r.numero_asistentes,
          r.estado,
          Number(r.valor),
        ]),
        resumen: {
          Reservas: reservas.length,
          Confirmadas: reservas.filter((r) => r.estado === 'CONFIRMADA').length,
          Canceladas: reservas.filter((r) => r.estado === 'CANCELADA').length,
        },
      };
    }
    case 'VISITAS': {
      const visitas = await prisma.visita.findMany({
        where: { unidad: { id_conjunto: idConjunto }, fecha_programada: { gte: fechaADate(desde), lte: fechaADate(hasta) } },
        include: { visitante: true, unidad: { include: { torre: true } } },
        orderBy: [{ fecha_programada: 'asc' }, { hora_desde: 'asc' }],
      });
      const hora = (d: Date | null) => (d ? d.toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }) : '');
      return {
        titulo: 'Reporte de visitas',
        columnas: ['Fecha', 'Visitante', 'Documento', 'Unidad', 'Franja', 'Ingreso', 'Salida', 'Estado'],
        filas: visitas.map((v) => [
          dateAFecha(v.fecha_programada),
          `${v.visitante.nombres} ${v.visitante.apellidos}`,
          `${v.visitante.tipo_documento} ${v.visitante.numero_documento}`,
          nombreUnidad(v.unidad),
          `${timeAHora(v.hora_desde)}-${timeAHora(v.hora_hasta)}`,
          hora(v.fecha_hora_ingreso),
          hora(v.fecha_hora_salida),
          v.estado,
        ]),
        resumen: { 'Visitas programadas': visitas.length, Ingresadas: visitas.filter((v) => v.fecha_hora_ingreso).length },
      };
    }
  }
}

reportesRouter.get('/:tipo', async (req, res) => {
  const u = usuarioActual(req);
  const tipo = z.enum(TIPOS).parse(String(req.params.tipo).toUpperCase());
  const q = z
    .object({
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      formato: z.enum(['json', 'pdf', 'xlsx']).default('json'),
    })
    .parse(req.query);
  if (q.desde > q.hasta) throw badRequest('El rango de fechas no es válido: "desde" es posterior a "hasta"', 'RANGO_INVALIDO');

  const tabla = await construir(tipo, u.idConjunto, q.desde, q.hasta);
  const conjunto = await prisma.conjunto.findUniqueOrThrow({ where: { id_conjunto: u.idConjunto } });
  const subtitulo = `${conjunto.nombre} · Periodo ${q.desde} a ${q.hasta} · Generado por ${u.nombre}`;

  if (q.formato !== 'json') {
    await prisma.reporte.create({
      data: {
        id_conjunto: u.idConjunto,
        id_usuario: u.id,
        tipo,
        fecha_inicio: fechaADate(q.desde),
        fecha_fin: fechaADate(q.hasta),
        formato: q.formato.toUpperCase(),
      },
    });
    await auditar(req, 'EXPORTAR_REPORTE', 'reporte', null, { tipo, ...q });
  }

  const nombre = `convive_${tipo.toLowerCase()}_${q.desde}_${q.hasta}`;
  if (q.formato === 'pdf') {
    const filas = [...tabla.filas, ...Object.entries(tabla.resumen).map(([k, v]) => [k, String(v)])];
    const pdf = await generarTablaPDF(tabla.titulo, subtitulo, tabla.columnas, filas);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.pdf"`);
    return res.send(pdf);
  }
  if (q.formato === 'xlsx') {
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet(tipo);
    hoja.addRow([tabla.titulo]).font = { bold: true, size: 14 };
    hoja.addRow([subtitulo]);
    hoja.addRow([]);
    hoja.addRow(tabla.columnas).font = { bold: true };
    tabla.filas.forEach((f) => hoja.addRow(f));
    hoja.addRow([]);
    Object.entries(tabla.resumen).forEach(([k, v]) => (hoja.addRow([k, v]).font = { bold: true }));
    hoja.columns.forEach((c) => (c.width = 18));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}.xlsx"`);
    return res.send(Buffer.from(await libro.xlsx.writeBuffer()));
  }
  res.json({ tipo, ...tabla, subtitulo });
});
