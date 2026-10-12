/**
 * Detalle de una noticia o comunicado.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { noticias } from '../../api/servicios';
import { Contenido, Insignia, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { formatoFechaHora } from '../../utils/formato';
import { TEXTO_NOTICIA, TONO_NOTICIA } from './NoticiasPantalla';

export function DetalleNoticiaPantalla({ route }: PropsApp<'DetalleNoticia'>) {
  const carga = useCarga(() => noticias.detalle(route.params.idNoticia), { alEnfocar: false });

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(n) => (
          <Tarjeta>
            <View style={{ flexDirection: 'row', gap: espacio.s, marginBottom: espacio.m }}>
              <Insignia texto={TEXTO_NOTICIA[n.tipo] ?? n.tipo} tono={TONO_NOTICIA[n.tipo] ?? 'info'} />
              {n.torre_destino && <Insignia texto={n.torre_destino} tono="neutro" />}
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: colores.texto }}>{n.titulo}</Text>
            <TextoSecundario estilo={{ marginTop: 4, marginBottom: espacio.l }}>
              {formatoFechaHora(n.fecha_publicacion ?? n.fecha_creacion)}
              {n.autor ? ` · ${n.autor}` : ''}
            </TextoSecundario>
            <Text style={{ fontSize: 16, color: colores.texto, lineHeight: 24 }}>{n.contenido}</Text>
            {n.fecha_expiracion && (
              <TextoSecundario estilo={{ marginTop: espacio.l, fontSize: 12 }}>Vigente hasta {formatoFechaHora(n.fecha_expiracion)}</TextoSecundario>
            )}
          </Tarjeta>
        )}
      </Contenido>
    </Pantalla>
  );
}
