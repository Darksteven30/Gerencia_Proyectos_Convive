/**
 * Selector de fecha simple: atajos para los próximos días y campo AAAA-MM-DD con validación.
 * (No usa un date picker nativo para funcionar igual en Android, iOS y web.)
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { espacio } from '../tema';
import { etiquetaDia, fechaValida, hoyColombia, mascaraFecha, sumarDias } from '../utils/formato';
import { Campo, Chip, estilos } from './ui';

export function SelectorFecha({
  etiqueta,
  valor,
  alCambiar,
  dias = 7,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (fecha: string) => void;
  /** Cantidad de días a mostrar como atajo (desde hoy). */
  dias?: number;
}) {
  const hoy = hoyColombia();
  const atajos = Array.from({ length: Math.max(1, Math.min(dias, 14)) }, (_, i) => sumarDias(hoy, i));
  const error = valor.length === 10 && !fechaValida(valor) ? 'Fecha inválida' : valor.length > 0 && valor.length < 10 ? 'Use el formato AAAA-MM-DD' : null;

  return (
    <View>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: espacio.s }} contentContainerStyle={{ gap: espacio.s }}>
        {atajos.map((f) => {
          return <Chip key={f} texto={etiquetaDia(f)} rol="radio" activo={f === valor} alPresionar={() => alCambiar(f)} />;
        })}
      </ScrollView>
      <Campo
        etiqueta="O escriba la fecha"
        value={valor}
        onChangeText={(t) => alCambiar(mascaraFecha(t))}
        keyboardType="number-pad"
        placeholder="AAAA-MM-DD"
        maxLength={10}
        error={error}
      />
    </View>
  );
}
