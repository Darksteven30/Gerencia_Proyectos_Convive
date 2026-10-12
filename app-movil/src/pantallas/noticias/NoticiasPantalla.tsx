/**
 * CU-37 Consultar noticias y comunicados del conjunto.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { noticias } from '../../api/servicios';
import { Contenido, EstadoVacio, Insignia, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { formatoFechaHora } from '../../utils/formato';

export const TONO_NOTICIA = { NOTICIA: 'info', COMUNICADO: 'neutro', URGENTE: 'peligro' } as const;
export const TEXTO_NOTICIA = { NOTICIA: 'Noticia', COMUNICADO: 'Comunicado', URGENTE: 'Urgente' } as const;

export function NoticiasPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(noticias.listar);

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(lista) =>
          lista.length === 0 ? (
            <EstadoVacio texto="No hay noticias publicadas." icono="newspaper-outline" />
          ) : (
            lista.map((n) => (
              <Tarjeta key={n.id_noticia} alPresionar={() => navegacion.navigate('DetalleNoticia', { idNoticia: n.id_noticia })}>
                <View style={{ flexDirection: 'row', gap: espacio.s, marginBottom: espacio.s }}>
                  <Insignia texto={TEXTO_NOTICIA[n.tipo] ?? n.tipo} tono={TONO_NOTICIA[n.tipo] ?? 'info'} />
                  {n.torre_destino && <Insignia texto={n.torre_destino} tono="neutro" />}
                </View>
                <Text style={{ fontSize: 17, fontWeight: '700', color: colores.texto }}>{n.titulo}</Text>
                <TextoSecundario lineas={3} estilo={{ marginTop: 4 }}>
                  {n.contenido}
                </TextoSecundario>
                <TextoSecundario estilo={{ fontSize: 12, marginTop: espacio.s }}>
                  {formatoFechaHora(n.fecha_publicacion ?? n.fecha_creacion)}
                  {n.autor ? ` · ${n.autor}` : ''}
                </TextoSecundario>
              </Tarjeta>
            ))
          )
        }
      </Contenido>
    </Pantalla>
  );
}
