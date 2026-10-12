/**
 * Pago, paso 1 de 3 — "Efectuar pago": saldo y selección del concepto a pagar (CU-12).
 * Las cuotas abiertas se agrupan por concepto (administración, extraordinaria y otros); al elegir un
 * concepto se seleccionan todas sus cuotas, y el usuario puede desmarcar las que no quiera pagar ahora.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pagos } from '../../api/servicios';
import type { EstadoCuentaUnidad } from '../../api/tipos';
import { usePuedeAbonar } from '../../componentes/EstadoCuenta';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Aviso, Boton, Contenido, Icono, Monto, Opciones, Pastilla, Pantalla, Renglon, Tarjeta } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio, radio, TACTIL_MIN } from '../../tema';
import { conceptoCorto, formatoCOP, formatoCOPCompleto, formatoPeriodo } from '../../utils/formato';
import { ClaveConcepto, CONCEPTOS_PAGO, grupoDeCuota } from '../../utils/pasarela';

export function EfectuarPagoPantalla({ navigation }: PropsApp<'EfectuarPago'>) {
  const carga = useCarga(pagos.estadoCuenta, { alEnfocar: false });
  return (
    <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
      {(cuenta) => <Seleccion cuenta={cuenta} alContinuar={(p) => navigation.navigate('RealizarPago', p)} />}
    </Contenido>
  );
}

function Seleccion({
  cuenta,
  alContinuar,
}: {
  cuenta: EstadoCuentaUnidad[];
  alContinuar: (p: { idUnidad: number; cuotas: number[]; concepto: string; valor: number }) => void;
}) {
  const { pagables } = usePuedeAbonar(cuenta);
  const [idUnidad, setIdUnidad] = useState<number | null>(pagables.find((u) => u.cuotas.length > 0)?.id_unidad ?? pagables[0]?.id_unidad ?? null);
  const [grupo, setGrupo] = useState<ClaveConcepto | null>(null);
  const [elegidas, setElegidas] = useState<number[]>([]);
  const unidad = pagables.find((u) => u.id_unidad === idUnidad) ?? null;

  const grupos = useMemo(
    () =>
      CONCEPTOS_PAGO.map((g) => {
        const cuotas = (unidad?.cuotas ?? []).filter((c) => grupoDeCuota(c) === g.clave);
        return { ...g, cuotas, total: cuotas.reduce((s, c) => s + c.saldo, 0) };
      }),
    [unidad],
  );
  const actual = grupos.find((g) => g.clave === grupo);
  const valor = actual ? actual.cuotas.filter((c) => elegidas.includes(c.id_cuota)).reduce((s, c) => s + c.saldo, 0) : 0;

  const elegirGrupo = (clave: ClaveConcepto) => {
    const g = grupos.find((x) => x.clave === clave)!;
    setGrupo(clave);
    setElegidas(g.cuotas.map((c) => c.id_cuota));
  };
  const alternar = (id: number) => setElegidas((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  const continuar = () => {
    if (!unidad || !actual || elegidas.length === 0) return;
    alContinuar({ idUnidad: unidad.id_unidad, cuotas: elegidas, concepto: actual.nombre, valor });
  };

  if (pagables.length === 0) {
    return (
      <Pantalla>
        <Aviso tono="info" texto="Usted no es el responsable de pago de ninguna unidad. Solo el propietario o el responsable de pago puede abonar (RN-07)." />
      </Pantalla>
    );
  }

  return (
    <Pantalla
      pie={
        <Boton
          titulo={elegidas.length ? `Continuar · ${formatoCOP(valor)}` : 'Continuar'}
          alPresionar={continuar}
          deshabilitado={!actual || elegidas.length === 0}
          etiquetaAccesible="Continuar"
        />
      }
    >
      <Pastilla texto="Efectuar pago" estilo={{ alignSelf: 'center', marginBottom: espacio.m }} />
      {pagables.length > 1 && (
        <Opciones
          etiqueta="Unidad"
          opciones={pagables.map((u) => ({ valor: u.id_unidad, texto: u.unidad }))}
          valor={idUnidad}
          alCambiar={(id) => {
            setIdUnidad(id);
            setGrupo(null);
            setElegidas([]);
          }}
        />
      )}
      <Tarjeta>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colores.texto }}>Estado de la cuenta</Text>
        <Monto>{formatoCOPCompleto(unidad?.saldo_total ?? 0)}</Monto>
      </Tarjeta>

      <Pastilla texto="Seleccione el concepto" estilo={{ marginBottom: espacio.s }} />
      {unidad && unidad.cuotas.length === 0 && <Aviso tono="exito" texto="Esta unidad está al día. No hay cuotas pendientes." />}
      {grupos.map((g) => (
        <View key={g.clave}>
          <Renglon
            titulo={g.nombre}
            detalle={g.cuotas.length ? `${g.cuotas.length} cuota(s) · ${formatoCOP(g.total)}` : 'Sin saldo pendiente'}
            icono={g.clave === 'ADMINISTRACION' ? 'document-text-outline' : g.clave === 'EXTRAORDINARIA' ? 'construct-outline' : 'ellipsis-horizontal-circle-outline'}
            seleccionado={grupo === g.clave}
            alPresionar={g.cuotas.length ? () => elegirGrupo(g.clave) : undefined}
            etiquetaAccesible={`${g.nombre}, ${formatoCOP(g.total)}`}
          />
          {grupo === g.clave &&
            g.cuotas.map((c) => {
              const marcada = elegidas.includes(c.id_cuota);
              return (
                <Pressable
                  key={c.id_cuota}
                  onPress={() => alternar(c.id_cuota)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: marcada }}
                  accessibilityLabel={`${formatoPeriodo(c.periodo)}, ${formatoCOP(c.saldo)}`}
                  style={[estilos.cuota, c.estado === 'VENCIDA' && { borderColor: colores.peligro }]}
                >
                  <View style={[estilos.casilla, marcada && { backgroundColor: colores.negro, borderColor: colores.negro }]}>
                    {marcada && <Icono nombre="checkmark" tamano={16} color={colores.blanco} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colores.texto, textTransform: 'capitalize' }}>{formatoPeriodo(c.periodo)}</Text>
                    <Text style={{ color: colores.textoSecundario, fontSize: 13 }}>{conceptoCorto(c.concepto)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontWeight: '700', color: colores.texto }}>{formatoCOP(c.saldo)}</Text>
                    <InsigniaEstado estado={c.estado} />
                  </View>
                </Pressable>
              );
            })}
        </View>
      ))}
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  cuota: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: espacio.l,
    marginBottom: espacio.s,
    padding: espacio.m,
    minHeight: TACTIL_MIN,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.m,
  },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.textoSecundario,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacio.m,
  },
});
