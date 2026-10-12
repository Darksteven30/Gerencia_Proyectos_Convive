/**
 * PQRS: CU-30 consultar mis solicitudes con su estado (lista "#radicado — asunto") y
 * tarjeta "Nueva PQRS" para radicar desde la misma pantalla (CU-28, CU-29), como en el mockup.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pqrs } from '../../api/servicios';
import type { Pqrs } from '../../api/tipos';
import { FormularioPqrs } from '../../componentes/FormularioPqrs';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Contenido, EstadoVacio, Icono, NombreIcono, Opciones, Pantalla, Tarjeta } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { etiquetaEstado, formatoFecha } from '../../utils/formato';

type Filtro = 'TODAS' | 'ABIERTAS' | 'RESPONDIDA' | 'CERRADA';

const ICONO_TIPO: Record<string, NombreIcono> = {
  PETICION: 'help-circle-outline',
  QUEJA: 'alert-circle-outline',
  RECLAMO: 'warning-outline',
  SUGERENCIA: 'bulb-outline',
};

/** Radicado "PQ-2026-000231" → "#000231" (como en el mockup). */
const radicadoCorto = (r: string) => `#${r.split('-').pop() ?? r}`;

export function PqrsListaPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(pqrs.mias);
  const [filtro, setFiltro] = useState<Filtro>('TODAS');

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Opciones<Filtro>
        desplazable
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
          return (
            <View style={{ marginBottom: espacio.m }}>
              {filtradas.map((p) => (
                <FilaPqrs key={p.id_pqrs} p={p} alPresionar={() => navegacion.navigate('DetallePqrs', { idPqrs: p.id_pqrs })} />
              ))}
            </View>
          );
        }}
      </Contenido>

      <Tarjeta>
        <Text style={estilos.tituloTarjeta}>Nueva PQRS</Text>
        <FormularioPqrs
          alRadicar={(r) => {
            void carga.refrescar();
            navegacion.navigate('DetallePqrs', { idPqrs: r.id_pqrs });
          }}
        />
      </Tarjeta>
    </Pantalla>
  );
}

function FilaPqrs({ p, alPresionar }: { p: Pqrs; alPresionar: () => void }) {
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={`${p.numero_radicado}, ${p.asunto}, estado ${etiquetaEstado(p.estado)}`}
      style={({ pressed }) => [estilos.fila, pressed && { backgroundColor: colores.grisClaro }]}
    >
      <Icono nombre={ICONO_TIPO[p.tipo] ?? 'chatbubble-outline'} tamano={22} />
      <View style={{ flex: 1, marginHorizontal: espacio.s }}>
        <Text style={estilos.titulo} numberOfLines={1}>
          {radicadoCorto(p.numero_radicado)} — {p.asunto}
        </Text>
        <Text style={estilos.detalle} numberOfLines={1}>
          {etiquetaEstado(p.tipo)} · {p.categoria} · respuesta antes del {formatoFecha(p.fecha_limite)}
          {p.vencida ? ' · plazo vencido' : ''}
          {p.calificacion ? ` · ${'★'.repeat(p.calificacion)}` : ''}
        </Text>
      </View>
      <InsigniaEstado estado={p.estado} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tituloTarjeta: { fontSize: 15, fontWeight: '700', color: colores.texto, marginBottom: espacio.m },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: espacio.s,
    paddingHorizontal: espacio.xs,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    gap: 4,
  },
  titulo: { fontSize: 15, fontWeight: '600', color: colores.texto },
  detalle: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
});
