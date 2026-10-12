/**
 * CU-14 Historial de pagos y CU-15 Descargar comprobante de pago (PDF).
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import type { Pago } from '../../api/tipos';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Boton, Contenido, EstadoVacio, FilaDato, Pantalla, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { colores, espacio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { descargarPdf } from '../../utils/descargas';
import { formatoCOP, formatoFechaHora, formatoPeriodo } from '../../utils/formato';

export function HistorialPagosPantalla() {
  const carga = useCarga(pagos.historial);
  const [descargando, setDescargando] = useState<number | null>(null);

  const descargar = async (p: Pago) => {
    setDescargando(p.id_pago);
    try {
      await descargarPdf(pagos.rutaComprobante(p.id_pago), `comprobante-${p.comprobante ?? p.id_pago}.pdf`);
    } catch (e) {
      avisar('No se pudo descargar el comprobante', mensajeError(e));
    } finally {
      setDescargando(null);
    }
  };

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(lista) =>
          lista.length === 0 ? (
            <EstadoVacio texto="Aún no hay pagos registrados." icono="receipt-outline" />
          ) : (
            lista.map((p) => (
              <Tarjeta key={p.id_pago}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Subtitulo>{formatoCOP(p.valor_total)}</Subtitulo>
                  <InsigniaEstado estado={p.estado} />
                </View>
                <TextoSecundario>
                  {p.unidad} · {formatoFechaHora(p.fecha_confirmacion ?? p.fecha_creacion)}
                </TextoSecundario>
                <View style={{ marginTop: espacio.s }}>
                  <FilaDato etiqueta="Método" valor={p.metodo_pago.toLowerCase()} />
                  {p.referencia && <FilaDato etiqueta="Referencia" valor={p.referencia} />}
                  <FilaDato etiqueta="Pagado por" valor={p.pagador} />
                  {p.cuotas.map((c, i) => (
                    <Text key={i} style={{ color: colores.textoSecundario, fontSize: 13, marginTop: 2 }}>
                      • {formatoPeriodo(c.periodo)} ({c.concepto.toLowerCase()}): {formatoCOP(c.valor_aplicado)}
                    </Text>
                  ))}
                </View>
                {p.estado === 'APROBADO' && p.comprobante && (
                  <Boton
                    titulo={`Comprobante ${p.comprobante}`}
                    variante="secundario"
                    icono="download-outline"
                    cargando={descargando === p.id_pago}
                    alPresionar={() => descargar(p)}
                    estilo={{ marginTop: espacio.m }}
                  />
                )}
              </Tarjeta>
            ))
          )
        }
      </Contenido>
    </Pantalla>
  );
}
