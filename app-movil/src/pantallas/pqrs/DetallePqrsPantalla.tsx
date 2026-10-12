/**
 * Detalle de una PQRS: historial de seguimiento, respuesta y CU-34 Calificar la atención (1 a 5).
 */
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pqrs } from '../../api/servicios';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Aviso, Boton, Contenido, FilaDato, Icono, Insignia, Pantalla, Seccion, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { etiquetaEstado, formatoFecha, formatoFechaHora } from '../../utils/formato';

export function DetallePqrsPantalla({ route }: PropsApp<'DetallePqrs'>) {
  const { idPqrs } = route.params;
  const carga = useCarga(() => pqrs.detalle(idPqrs));
  const [estrellas, setEstrellas] = useState(0);
  const [calificando, setCalificando] = useState(false);

  const calificar = async () => {
    if (!estrellas) return;
    setCalificando(true);
    try {
      await pqrs.calificar(idPqrs, estrellas);
      avisar('¡Gracias!', 'Su calificación fue registrada.');
      await carga.refrescar();
    } catch (e) {
      avisar('No se pudo calificar', mensajeError(e));
    } finally {
      setCalificando(false);
    }
  };

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(p) => {
          const puedeCalificar = ['RESPONDIDA', 'CERRADA'].includes(p.estado);
          const seleccion = estrellas || p.calificacion || 0;
          return (
            <>
              <Tarjeta>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: colores.textoSecundario, fontWeight: '700' }}>{p.numero_radicado}</Text>
                  <InsigniaEstado estado={p.estado} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: '700', color: colores.texto, marginVertical: espacio.s }}>{p.asunto}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, marginBottom: espacio.s }}>
                  <Insignia texto={etiquetaEstado(p.tipo)} tono="neutro" />
                  <Insignia texto={p.categoria} tono="neutro" />
                  <Insignia texto={`Prioridad ${p.prioridad.toLowerCase()}`} tono="neutro" />
                  {p.vencida && <Insignia texto="Plazo vencido" tono="peligro" />}
                </View>
                <Text style={{ color: colores.texto, lineHeight: 21 }}>{p.descripcion}</Text>
                <View style={{ marginTop: espacio.m }}>
                  <FilaDato etiqueta="Radicada" valor={formatoFechaHora(p.fecha_radicacion)} />
                  <FilaDato etiqueta="Fecha límite de respuesta" valor={formatoFecha(p.fecha_limite)} />
                  {p.unidad && <FilaDato etiqueta="Unidad" valor={p.unidad} />}
                  {p.responsable && <FilaDato etiqueta="Responsable" valor={p.responsable} />}
                  {p.fecha_cierre && <FilaDato etiqueta="Cerrada" valor={formatoFechaHora(p.fecha_cierre)} />}
                </View>
              </Tarjeta>

              {p.respuesta ? (
                <Seccion titulo="Respuesta de la administración">
                  <Tarjeta estilo={{ borderLeftWidth: 4, borderLeftColor: colores.exito }}>
                    <Text style={{ color: colores.texto, lineHeight: 21 }}>{p.respuesta}</Text>
                  </Tarjeta>
                </Seccion>
              ) : (
                <Aviso tono="info" texto={`Su solicitud está en proceso. La administración debe responder a más tardar el ${formatoFecha(p.fecha_limite)}.`} />
              )}

              {puedeCalificar && (
                <Seccion titulo={p.calificacion ? 'Su calificación' : 'Califique la atención'}>
                  <Tarjeta>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: espacio.s, marginBottom: espacio.m }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Pressable key={n} onPress={() => setEstrellas(n)} accessibilityLabel={`${n} estrella(s)`} hitSlop={6}>
                          <Icono nombre={n <= seleccion ? 'star' : 'star-outline'} tamano={36} color="#F59E0B" />
                        </Pressable>
                      ))}
                    </View>
                    <Boton
                      titulo={p.calificacion ? 'Actualizar calificación' : 'Enviar calificación'}
                      alPresionar={calificar}
                      cargando={calificando}
                      deshabilitado={!estrellas || estrellas === p.calificacion}
                    />
                  </Tarjeta>
                </Seccion>
              )}

              {p.lista_adjuntos.length > 0 && (
                <Seccion titulo="Adjuntos">
                  <Tarjeta>
                    {p.lista_adjuntos.map((a) => (
                      <View key={a.id_adjunto} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                        <Icono nombre={a.tipo_mime === 'application/pdf' ? 'document-outline' : 'image-outline'} tamano={18} />
                        <Text style={{ marginLeft: espacio.s, flex: 1, color: colores.texto }} numberOfLines={1}>
                          {a.nombre_archivo}
                        </Text>
                        <TextoSecundario>{a.tamano_kb} KB</TextoSecundario>
                      </View>
                    ))}
                  </Tarjeta>
                </Seccion>
              )}

              <Seccion titulo="Seguimiento">
                <Tarjeta>
                  {p.seguimientos.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', marginBottom: i < p.seguimientos.length - 1 ? espacio.m : 0 }}>
                      <View style={{ alignItems: 'center', marginRight: espacio.m }}>
                        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: colores.primario, marginTop: 4 }} />
                        {i < p.seguimientos.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: colores.primarioClaro, marginTop: 2 }} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: colores.texto }}>{etiquetaEstado(s.estado_nuevo)}</Text>
                        {s.comentario ? <Text style={{ color: colores.texto, marginTop: 2 }}>{s.comentario}</Text> : null}
                        <TextoSecundario estilo={{ fontSize: 12, marginTop: 2 }}>
                          {formatoFechaHora(s.fecha_registro)}
                          {s.usuario ? ` · ${s.usuario}` : ''}
                        </TextoSecundario>
                      </View>
                    </View>
                  ))}
                </Tarjeta>
              </Seccion>
            </>
          );
        }}
      </Contenido>
    </Pantalla>
  );
}
