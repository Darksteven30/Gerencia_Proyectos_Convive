/**
 * CU-44 Consultar mis visitas (pre-registradas, ingresadas, vencidas o canceladas).
 */
import React from 'react';
import { Text, View } from 'react-native';
import { visitas } from '../../api/servicios';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Boton, Contenido, EstadoVacio, Icono, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { formatoFecha } from '../../utils/formato';

export function VisitasPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(visitas.mias);

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Boton
        titulo="Pre-registrar visitante"
        icono="person-add-outline"
        alPresionar={() => navegacion.navigate('NuevaVisita')}
        estilo={{ marginBottom: espacio.l }}
      />
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(lista) =>
          lista.length === 0 ? (
            <EstadoVacio texto="No tiene visitas registradas. Pre-registre a sus visitantes para que ingresen con un código QR." icono="people-outline" />
          ) : (
            lista.map((v) => (
              <Tarjeta key={v.id_visita} alPresionar={() => navegacion.navigate('DetalleVisita', { visita: v })}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colores.texto, flex: 1 }} numberOfLines={1}>
                    {v.visitante.nombre}
                  </Text>
                  <InsigniaEstado estado={v.estado} />
                </View>
                <TextoSecundario estilo={{ marginTop: 4 }}>
                  {formatoFecha(v.fecha_programada)} · {v.hora_desde} – {v.hora_hasta} · {v.unidad}
                </TextoSecundario>
                {v.motivo ? <TextoSecundario>{v.motivo}</TextoSecundario> : null}
                {v.estado === 'PREREGISTRADA' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: espacio.s }}>
                    <Icono nombre="qr-code-outline" tamano={18} />
                    <Text style={{ color: colores.primario, fontWeight: '700', marginLeft: 6 }}>Ver código QR y compartir</Text>
                  </View>
                )}
              </Tarjeta>
            ))
          )
        }
      </Contenido>
    </Pantalla>
  );
}
