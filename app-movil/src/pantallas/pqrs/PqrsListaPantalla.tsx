/**
 * CU-30 Consultar mis PQRS con su estado.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { pqrs } from '../../api/servicios';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Boton, Contenido, EstadoVacio, Insignia, Opciones, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { etiquetaEstado, formatoFecha, formatoFechaHora } from '../../utils/formato';

type Filtro = 'TODAS' | 'ABIERTAS' | 'RESPONDIDA' | 'CERRADA';

export function PqrsListaPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(pqrs.mias);
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Boton
        titulo="Nueva solicitud"
        icono="add-circle-outline"
        alPresionar={() => navegacion.navigate('NuevaPqrs')}
        estilo={{ marginBottom: espacio.l }}
      />
      <Opciones<Filtro>
        opciones={[
          { valor: 'TODAS', texto: 'Todas' },
          { valor: 'ABIERTAS', texto: 'Abiertas' },
          { valor: 'RESPONDIDA', texto: 'Respondidas' },
          { valor: 'CERRADA', texto: 'Cerradas' },
        ]}
        valor={filtro}
        alCambiar={setFiltro}
      />
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(lista) => {
          const filtradas = lista.filter((p) =>
            filtro === 'TODAS' ? true : filtro === 'ABIERTAS' ? ['RADICADA', 'EN_TRAMITE'].includes(p.estado) : p.estado === filtro,
          );
          if (filtradas.length === 0) {
            return (
              <EstadoVacio
                texto={lista.length === 0 ? 'No ha radicado peticiones, quejas, reclamos ni sugerencias.' : 'No hay solicitudes con este filtro.'}
                icono="chatbubbles-outline"
              />
            );
          }
          return filtradas.map((p) => (
            <Tarjeta key={p.id_pqrs} alPresionar={() => navegacion.navigate('DetallePqrs', { idPqrs: p.id_pqrs })}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ color: colores.textoSecundario, fontWeight: '600' }}>{p.numero_radicado}</Text>
                <InsigniaEstado estado={p.estado} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colores.texto }} numberOfLines={2}>
                {p.asunto}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, marginTop: espacio.s }}>
                <Insignia texto={etiquetaEstado(p.tipo)} tono="neutro" />
                <Insignia texto={p.categoria} tono="neutro" />
                {p.vencida && <Insignia texto="Plazo vencido" tono="peligro" />}
                {p.calificacion ? <Insignia texto={`${'★'.repeat(p.calificacion)}`} tono="advertencia" /> : null}
              </View>
              <TextoSecundario estilo={{ fontSize: 12, marginTop: espacio.s }}>
                Radicada el {formatoFechaHora(p.fecha_radicacion)} · Respuesta antes del {formatoFecha(p.fecha_limite)}
              </TextoSecundario>
            </Tarjeta>
          ));
        }}
      </Contenido>
    </Pantalla>
  );
}
