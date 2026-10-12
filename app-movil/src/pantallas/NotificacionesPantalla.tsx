/**
 * Bandeja de notificaciones (mecanismo principal de avisos dentro de la app).
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { mensajeError } from '../api/cliente';
import { notificaciones } from '../api/servicios';
import type { Notificacion } from '../api/tipos';
import { Boton, Contenido, EstadoVacio, Icono, Pastilla, Pantalla, Tarjeta, TextoSecundario } from '../componentes/ui';
import { useNotificaciones } from '../contexto/NotificacionesContext';
import { useCarga } from '../hooks/useCarga';
import { irAPestana, useNavegacion } from '../navegacion/tipos';
import { colores, espacio } from '../tema';
import { avisar } from '../utils/dialogos';
import { formatoFechaHora } from '../utils/formato';

const ICONOS: Record<string, React.ComponentProps<typeof Icono>['nombre']> = {
  NOTICIA: 'newspaper-outline',
  PQRS: 'chatbubble-ellipses-outline',
  RESERVA: 'calendar-outline',
  RECORDATORIO_PAGO: 'card-outline',
  PAGO: 'card-outline',
  VISITA: 'people-outline',
  BLOQUEO: 'construct-outline',
};

export function NotificacionesPantalla() {
  const navegacion = useNavegacion();
  const { fijarNoLeidas } = useNotificaciones();
  const [marcando, setMarcando] = useState(false);
  const carga = useCarga(async () => {
    const b = await notificaciones.bandeja();
    fijarNoLeidas(b.no_leidas);
    return b;
  });

  const abrir = async (n: Notificacion) => {
    if (!n.fecha_lectura) {
      try {
        await notificaciones.marcarLeida(n.id_notificacion);
        carga.setDatos((b) =>
          b
            ? {
                no_leidas: Math.max(0, b.no_leidas - 1),
                notificaciones: b.notificaciones.map((x) =>
                  x.id_notificacion === n.id_notificacion ? { ...x, estado: 'LEIDA', fecha_lectura: new Date().toISOString() } : x,
                ),
              }
            : b,
        );
        fijarNoLeidas(Math.max(0, (carga.datos?.no_leidas ?? 1) - 1));
      } catch (e) {
        avisar('No se pudo marcar como leída', mensajeError(e));
      }
    }
    // Ir al detalle relacionado, si lo hay
    if (n.id_noticia) navegacion.navigate('DetalleNoticia', { idNoticia: n.id_noticia });
    else if (n.tipo === 'PQRS' && n.id_referencia) navegacion.navigate('DetallePqrs', { idPqrs: n.id_referencia });
    else if (n.tipo === 'RESERVA' || n.tipo === 'BLOQUEO') navegacion.navigate('MisReservas');
    // La confirmación de un pago llega como RECORDATORIO_PAGO con el título "Pago aprobado/rechazado"
    else if (n.tipo === 'PAGO' || (n.tipo === 'RECORDATORIO_PAGO' && /^pago /i.test(n.titulo))) navegacion.navigate('HistorialPagos');
    else if (n.tipo === 'RECORDATORIO_PAGO') irAPestana(navegacion, 'Pagos');
    else if (n.tipo === 'VISITA') irAPestana(navegacion, 'Visitas');
  };

  const marcarTodas = async () => {
    setMarcando(true);
    try {
      await notificaciones.marcarTodas();
      fijarNoLeidas(0);
      await carga.refrescar();
    } catch (e) {
      avisar('No se pudo actualizar', mensajeError(e));
    } finally {
      setMarcando(false);
    }
  };

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Pastilla texto="Avisos" estilo={{ marginBottom: espacio.m }} />
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(b) =>
          b.notificaciones.length === 0 ? (
            <EstadoVacio texto="No tiene notificaciones." icono="notifications-off-outline" />
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: espacio.m }}>
                <TextoSecundario>{b.no_leidas > 0 ? `${b.no_leidas} sin leer` : 'Todas leídas'}</TextoSecundario>
                {b.no_leidas > 0 && <Boton titulo="Marcar todas como leídas" variante="texto" compacto alPresionar={marcarTodas} cargando={marcando} />}
              </View>
              {b.notificaciones.map((n) => {
                const noLeida = !n.fecha_lectura;
                return (
                  <Tarjeta
                    key={n.id_notificacion}
                    alPresionar={() => abrir(n)}
                    estilo={noLeida ? { borderLeftWidth: 4, borderLeftColor: colores.turquesa, backgroundColor: colores.grisClaro } : undefined}
                    etiquetaAccesible={`${noLeida ? 'Sin leer: ' : ''}${n.titulo}. ${n.mensaje}`}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <View style={{ marginRight: espacio.m, marginTop: 2 }}>
                        <Icono nombre={ICONOS[n.tipo] ?? 'notifications-outline'} tamano={22} color={noLeida ? colores.turquesaOscuro : colores.textoSecundario} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: noLeida ? '800' : '600', color: colores.texto, fontSize: 15 }}>{n.titulo}</Text>
                        <Text style={{ color: colores.texto, marginTop: 2, lineHeight: 20 }}>{n.mensaje}</Text>
                        <TextoSecundario estilo={{ fontSize: 12, marginTop: 4 }}>{formatoFechaHora(n.fecha_creacion)}</TextoSecundario>
                      </View>
                    </View>
                  </Tarjeta>
                );
              })}
            </>
          )
        }
      </Contenido>
    </Pantalla>
  );
}
