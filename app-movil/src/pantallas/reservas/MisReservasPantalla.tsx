/**
 * CU-25 Consultar mis reservas y CU-24 Cancelar reserva.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { reservas } from '../../api/servicios';
import type { Reserva } from '../../api/tipos';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Boton, Contenido, EstadoVacio, FilaDato, Pantalla, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { colores, espacio } from '../../tema';
import { avisar, confirmar } from '../../utils/dialogos';
import { formatoCOP, formatoFecha, hoyColombia } from '../../utils/formato';

export function MisReservasPantalla() {
  const carga = useCarga(reservas.mias);
  const [cancelando, setCancelando] = useState<number | null>(null);

  const cancelar = async (r: Reserva) => {
    const ok = await confirmar('Cancelar reserva', `¿Desea cancelar la reserva de ${r.zona} del ${formatoFecha(r.fecha)}?`, 'Sí, cancelar');
    if (!ok) return;
    setCancelando(r.id_reserva);
    try {
      await reservas.cancelar(r.id_reserva);
      await carga.refrescar();
    } catch (e) {
      avisar('No se pudo cancelar', mensajeError(e));
    } finally {
      setCancelando(null);
    }
  };

  const hoy = hoyColombia();

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(lista) =>
          lista.length === 0 ? (
            <EstadoVacio texto="Aún no tiene reservas." icono="calendar-outline" />
          ) : (
            lista.map((r) => (
              <Tarjeta key={r.id_reserva} estilo={r.estado !== 'CONFIRMADA' ? { opacity: 0.75 } : undefined}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Subtitulo>{r.zona}</Subtitulo>
                  <InsigniaEstado estado={r.estado} />
                </View>
                <TextoSecundario estilo={{ color: colores.texto, marginTop: 4 }}>
                  {formatoFecha(r.fecha)} · {r.hora_inicio} – {r.hora_fin}
                </TextoSecundario>
                <View style={{ marginTop: espacio.s }}>
                  <FilaDato etiqueta="Unidad" valor={r.unidad} />
                  <FilaDato etiqueta="Asistentes" valor={r.numero_asistentes} />
                  {r.valor > 0 && <FilaDato etiqueta="Valor" valor={formatoCOP(r.valor)} />}
                  {r.observaciones ? <FilaDato etiqueta="Observaciones" valor={r.observaciones} /> : null}
                </View>
                {r.estado === 'CONFIRMADA' && r.fecha >= hoy && (
                  <Boton
                    titulo="Cancelar reserva"
                    variante="peligro"
                    icono="close-circle-outline"
                    cargando={cancelando === r.id_reserva}
                    alPresionar={() => cancelar(r)}
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
