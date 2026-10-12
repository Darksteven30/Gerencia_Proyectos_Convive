/**
 * Calendario mensual para elegir el día de una reserva (como en el mockup de Reservas):
 * navegación de mes ‹ ›, selectores de mes y año, días habilitados dentro del rango permitido
 * (desde hoy hasta la anticipación máxima de la zona) y el día elegido marcado en negro.
 * Se dibuja con componentes de React Native para funcionar igual en Android, iOS y web.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, radio, TACTIL_MIN } from '../tema';
import { NOMBRES_MESES } from '../utils/formato';
import { Desplegable, Icono } from './ui';

const DIAS_SEMANA = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'];
const DIAS_SEMANA_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const dosDigitos = (n: number) => String(n).padStart(2, '0');
const aFecha = (a: number, m: number, d: number) => `${a}-${dosDigitos(m + 1)}-${dosDigitos(d)}`;

export function Calendario({
  valor,
  alCambiar,
  minimo,
  maximo,
  hoy,
}: {
  /** Fecha elegida AAAA-MM-DD (o null). */
  valor: string | null;
  alCambiar: (fecha: string) => void;
  /** Primer día seleccionable (AAAA-MM-DD). */
  minimo: string;
  /** Último día seleccionable (AAAA-MM-DD). */
  maximo: string;
  /** Hoy en Colombia (AAAA-MM-DD), para resaltarlo. */
  hoy: string;
}) {
  const base = valor ?? minimo;
  const [anio, setAnio] = useState(Number(base.slice(0, 4)));
  const [mes, setMes] = useState(Number(base.slice(5, 7)) - 1);

  // Si cambia el rango (otra zona) y el mes visible queda fuera, se vuelve al mes del mínimo
  useEffect(() => {
    const visible = `${anio}-${dosDigitos(mes + 1)}`;
    if (visible < minimo.slice(0, 7) || visible > maximo.slice(0, 7)) {
      setAnio(Number(minimo.slice(0, 4)));
      setMes(Number(minimo.slice(5, 7)) - 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimo, maximo]);

  const mesMin = minimo.slice(0, 7);
  const mesMax = maximo.slice(0, 7);
  const actual = `${anio}-${dosDigitos(mes + 1)}`;
  const puedeAtras = actual > mesMin;
  const puedeAdelante = actual < mesMax;

  const mover = (delta: number) => {
    const f = new Date(Date.UTC(anio, mes + delta, 1));
    setAnio(f.getUTCFullYear());
    setMes(f.getUTCMonth());
  };

  const primerDia = new Date(Date.UTC(anio, mes, 1)).getUTCDay();
  const diasMes = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  while (celdas.length % 7) celdas.push(null);

  const anioMin = Number(minimo.slice(0, 4));
  const anioMax = Number(maximo.slice(0, 4));
  const anios = Array.from({ length: anioMax - anioMin + 1 }, (_, i) => anioMin + i);

  return (
    <View>
      <View style={estilos.cabecera}>
        <BotonFlecha icono="chevron-back" etiqueta="Mes anterior" habilitado={puedeAtras} alPresionar={() => mover(-1)} />
        <View style={{ flexDirection: 'row', gap: espacio.s }}>
          <Desplegable
            compacto
            etiquetaAccesible="Mes"
            opciones={NOMBRES_MESES.map((n, i) => {
              const clave = `${anio}-${dosDigitos(i + 1)}`;
              return { valor: i, texto: n.slice(0, 3), deshabilitado: clave < mesMin || clave > mesMax };
            })}
            valor={mes}
            alCambiar={setMes}
          />
          <Desplegable
            compacto
            etiquetaAccesible="Año"
            opciones={anios.map((a) => ({ valor: a, texto: String(a) }))}
            valor={anio}
            alCambiar={(a) => {
              setAnio(a);
              // Ajusta el mes si queda fuera del rango en el nuevo año
              const clave = `${a}-${dosDigitos(mes + 1)}`;
              if (clave < mesMin) setMes(Number(mesMin.slice(5, 7)) - 1);
              if (clave > mesMax) setMes(Number(mesMax.slice(5, 7)) - 1);
            }}
          />
        </View>
        <BotonFlecha icono="chevron-forward" etiqueta="Mes siguiente" habilitado={puedeAdelante} alPresionar={() => mover(1)} />
      </View>

      <View style={estilos.fila}>
        {DIAS_SEMANA.map((d) => (
          <Text key={d} style={estilos.diaSemana}>
            {d}
          </Text>
        ))}
      </View>
      {Array.from({ length: celdas.length / 7 }, (_, semana) => (
        <View key={semana} style={estilos.fila}>
          {celdas.slice(semana * 7, semana * 7 + 7).map((dia, i) => {
            if (!dia) return <View key={i} style={estilos.celda} />;
            const fecha = aFecha(anio, mes, dia);
            const habilitado = fecha >= minimo && fecha <= maximo;
            const elegido = fecha === valor;
            const esHoy = fecha === hoy;
            return (
              <View key={i} style={estilos.celda}>
                <Pressable
                  disabled={!habilitado}
                  onPress={() => alCambiar(fecha)}
                  accessibilityRole="button"
                  accessibilityLabel={`${DIAS_SEMANA_LARGOS[(primerDia + dia - 1) % 7]} ${dia} de ${NOMBRES_MESES[mes].toLowerCase()} de ${anio}${habilitado ? '' : ', no disponible'}`}
                  accessibilityState={{ selected: elegido, disabled: !habilitado }}
                  style={({ pressed }) => [
                    estilos.dia,
                    habilitado && estilos.diaHabilitado,
                    esHoy && !elegido && estilos.diaHoy,
                    elegido && estilos.diaElegido,
                    pressed && !elegido && { backgroundColor: colores.grisMedio },
                  ]}
                >
                  <Text
                    style={[
                      estilos.textoDia,
                      !habilitado && { color: colores.textoTenue, fontWeight: '400' },
                      elegido && { color: colores.blanco },
                    ]}
                  >
                    {dia}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function BotonFlecha({ icono, etiqueta, habilitado, alPresionar }: { icono: 'chevron-back' | 'chevron-forward'; etiqueta: string; habilitado: boolean; alPresionar: () => void }) {
  return (
    <Pressable
      onPress={alPresionar}
      disabled={!habilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: !habilitado }}
      style={({ pressed }) => [estilos.flecha, pressed && { backgroundColor: colores.grisClaro }, !habilitado && { opacity: 0.3 }]}
    >
      <Icono nombre={icono} tamano={22} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.s },
  flecha: { width: TACTIL_MIN, height: TACTIL_MIN, borderRadius: TACTIL_MIN / 2, alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row' },
  diaSemana: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colores.textoSecundario, paddingVertical: 6 },
  celda: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dia: { width: TACTIL_MIN, height: TACTIL_MIN, borderRadius: radio.s, alignItems: 'center', justifyContent: 'center' },
  diaHabilitado: { backgroundColor: colores.grisClaro },
  diaHoy: { borderWidth: 2, borderColor: colores.turquesa },
  diaElegido: { backgroundColor: colores.negro },
  textoDia: { fontSize: 15, fontWeight: '600', color: colores.texto },
});
