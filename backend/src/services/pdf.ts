import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import { env } from '../config/env';

export const formatoCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

/** Ruta absoluta dentro del directorio de archivos, creando la carpeta si no existe. */
export function rutaArchivo(...partes: string[]) {
  const ruta = path.join(env.uploadDir, ...partes);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  return ruta;
}

export interface DatosComprobante {
  numero: string;
  conjunto: string;
  nit: string;
  unidad: string;
  pagador: string;
  metodo: string;
  referencia: string | null;
  fecha: Date;
  detalles: { concepto: string; periodo: string; valor: number }[];
  total: number;
}

/** Genera el comprobante de pago en PDF (CU-13, RN-08). Devuelve la ruta relativa al directorio de archivos. */
export function generarComprobantePDF(d: DatosComprobante): Promise<string> {
  const relativo = path.join('comprobantes', `${d.numero}.pdf`);
  const destino = rutaArchivo(relativo);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });
    const stream = fs.createWriteStream(destino);
    doc.pipe(stream);

    doc.fontSize(18).fillColor('#1d4ed8').text('Convive', { continued: true }).fillColor('#111').text('  ·  Comprobante de pago');
    doc.moveDown(0.3).fontSize(10).fillColor('#555').text(`${d.conjunto} — NIT ${d.nit}`);
    doc.moveDown();
    doc.fillColor('#111').fontSize(12).text(`Comprobante N.º ${d.numero}`, { underline: true });
    doc.moveDown(0.5).fontSize(10);
    const fila = (k: string, v: string) => doc.font('Helvetica-Bold').text(`${k}: `, { continued: true }).font('Helvetica').text(v);
    fila('Fecha', d.fecha.toLocaleString('es-CO', { timeZone: 'America/Bogota' }));
    fila('Unidad', d.unidad);
    fila('Pagador', d.pagador);
    fila('Medio de pago', d.metodo);
    if (d.referencia) fila('Referencia', d.referencia);
    doc.moveDown();

    const x = 50;
    let y = doc.y;
    doc.font('Helvetica-Bold').text('Concepto', x, y).text('Periodo', 280, y).text('Valor aplicado', 420, y);
    y += 16;
    doc.moveTo(x, y).lineTo(560, y).strokeColor('#ccc').stroke();
    doc.font('Helvetica');
    for (const det of d.detalles) {
      y += 6;
      doc.text(det.concepto, x, y).text(det.periodo, 280, y).text(formatoCOP(det.valor), 420, y);
      y += 14;
    }
    y += 6;
    doc.moveTo(x, y).lineTo(560, y).stroke();
    doc.font('Helvetica-Bold').text('Total pagado', x, y + 8).text(formatoCOP(d.total), 420, y + 8);

    doc.moveDown(4).font('Helvetica').fontSize(8).fillColor('#777').text(
      'Documento generado automáticamente por el prototipo académico Convive. Pago procesado en entorno de pruebas (sandbox); no corresponde a una transacción monetaria real.',
      50,
      undefined,
      { width: 510 },
    );
    doc.end();
    stream.on('finish', () => resolve(relativo.replace(/\\/g, '/')));
    stream.on('error', reject);
  });
}

/** Genera un PDF tabular genérico para los reportes (RF-08). */
export function generarTablaPDF(titulo: string, subtitulo: string, columnas: string[], filas: (string | number)[][]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', layout: 'landscape', margin: 40 });
    const partes: Buffer[] = [];
    doc.on('data', (c: Buffer) => partes.push(c));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    doc.fontSize(16).text(titulo).fontSize(9).fillColor('#555').text(subtitulo).fillColor('#111').moveDown();
    const ancho = (792 - 80) / columnas.length;
    let y = doc.y;
    const dibujarFila = (valores: (string | number)[], negrita: boolean) => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(8);
      const alto = Math.max(...valores.map((v, i) => doc.heightOfString(String(v), { width: ancho - 6 })), 10);
      if (y + alto > 572) {
        doc.addPage();
        y = 40;
      }
      valores.forEach((v, i) => doc.text(String(v), 40 + i * ancho, y, { width: ancho - 6 }));
      y += alto + 4;
    };
    dibujarFila(columnas, true);
    filas.forEach((f) => dibujarFila(f, false));
    if (filas.length === 0) doc.font('Helvetica-Oblique').text('Sin datos para el periodo consultado.', 40, y);
    doc.end();
  });
}
