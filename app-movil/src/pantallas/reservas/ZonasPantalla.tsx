/**
 * CU-21 Consultar zonas comunes: reglamento, horario, aforo y costo.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { reservas } from '../../api/servicios';
import { Boton, Contenido, EstadoVacio, FilaDato, Icono, Insignia, Pantalla, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { formatoCOP } from '../../utils/formato';

export function ZonasPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(reservas.zonas, { alEnfocar: false });

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Boton
        titulo="Mis reservas"
        variante="secundario"
        icono="bookmark-outline"
        alPresionar={() => navegacion.navigate('MisReservas')}
        estilo={{ marginBottom: espacio.l }}
      />
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(zonas) =>
          zonas.length === 0 ? (
            <EstadoVacio texto="No hay zonas comunes configuradas." icono="business-outline" />
          ) : (
            zonas.map((z) => {
              const activa = z.estado === 'ACTIVA';
              return (
                <Tarjeta key={z.id_zona} alPresionar={activa ? () => navegacion.navigate('Reservar', { zona: z }) : undefined}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Subtitulo>{z.nombre}</Subtitulo>
                    {activa ? <Insignia texto="Disponible" tono="exito" /> : <Insignia texto={z.estado.toLowerCase()} tono="advertencia" />}
                  </View>
                  {z.descripcion ? <TextoSecundario estilo={{ marginTop: 4 }}>{z.descripcion}</TextoSecundario> : null}
                  <View style={{ marginTop: espacio.s }}>
                    <FilaDato etiqueta="Horario" valor={`${z.hora_apertura} a ${z.hora_cierre}`} />
                    <FilaDato etiqueta="Aforo máximo" valor={`${z.aforo_maximo} personas`} />
                    <FilaDato etiqueta="Costo" valor={z.costo_reserva > 0 ? formatoCOP(z.costo_reserva) : 'Sin costo'} />
                    <FilaDato etiqueta="Duración máxima" valor={`${z.duracion_max_horas} h`} />
                  </View>
                  {z.reglamento ? (
                    <View style={{ flexDirection: 'row', marginTop: espacio.s }}>
                      <Icono nombre="document-text-outline" tamano={16} color={colores.textoSecundario} />
                      <Text style={{ color: colores.textoSecundario, fontSize: 13, marginLeft: 6, flex: 1 }}>{z.reglamento}</Text>
                    </View>
                  ) : null}
                  {activa && (
                    <Text style={{ color: colores.primario, fontWeight: '700', marginTop: espacio.m }}>Ver disponibilidad y reservar ›</Text>
                  )}
                </Tarjeta>
              );
            })
          )
        }
      </Contenido>
    </Pantalla>
  );
}
