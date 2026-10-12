/**
 * CU-11 Consultar estado de cuenta y CU-12 Pagar cuotas de administración.
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { API_URL, mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import type { Cuota, EstadoCuentaUnidad } from '../../api/tipos';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Aviso, Boton, Contenido, EstadoVacio, Icono, Pantalla, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { formatoCOP, formatoFecha, formatoPeriodo } from '../../utils/formato';

/**
 * El simulador de pagos del backend arma la URL con su PUBLIC_API_URL (por defecto localhost).
 * Si la app usa otra dirección (p. ej. la IP local desde un teléfono), se reemplaza el origen
 * para que el checkout abra en el dispositivo.
 */
export function ajustarUrlCheckout(url: string): string {
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i;
  if (local.test(url) && !local.test(API_URL)) return url.replace(local, API_URL);
  return url;
}

/** Abre el checkout: en web, en una pestaña nueva; en el teléfono, en el navegador del sistema. */
export async function abrirCheckout(url: string) {
  if (Platform.OS === 'web') {
    const ventana = globalThis.open?.(url, '_blank');
    if (!ventana) avisar('Ventana bloqueada', 'Permita las ventanas emergentes o use el botón "Abrir pasarela de pago".');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export function PagosPantalla() {
  const navegacion = useNavegacion();
  const { puedePagar } = useAuth();
  const carga = useCarga(pagos.estadoCuenta);
  // Cuotas seleccionadas por unidad
  const [seleccion, setSeleccion] = useState<Record<number, number[]>>({});
  const [pagando, setPagando] = useState<number | null>(null);

  const alternar = (idUnidad: number, idCuota: number) =>
    setSeleccion((s) => {
      const actual = s[idUnidad] ?? [];
      return { ...s, [idUnidad]: actual.includes(idCuota) ? actual.filter((c) => c !== idCuota) : [...actual, idCuota] };
    });

  const pagar = async (unidad: EstadoCuentaUnidad) => {
    const cuotas = seleccion[unidad.id_unidad] ?? [];
    if (cuotas.length === 0) return avisar('Seleccione cuotas', 'Marque al menos una cuota para pagar.');
    setPagando(unidad.id_unidad);
    try {
      const pago = await pagos.crear(unidad.id_unidad, cuotas);
      const url = ajustarUrlCheckout(pago.checkout_url);
      setSeleccion((s) => ({ ...s, [unidad.id_unidad]: [] }));
      navegacion.navigate('ResultadoPago', { idPago: pago.id_pago, checkoutUrl: url, referencia: pago.referencia });
      await abrirCheckout(url);
    } catch (e) {
      avisar('No se pudo iniciar el pago', mensajeError(e));
    } finally {
      setPagando(null);
    }
  };

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Boton
        titulo="Historial de pagos y comprobantes"
        variante="secundario"
        icono="receipt-outline"
        alPresionar={() => navegacion.navigate('HistorialPagos')}
        estilo={{ marginBottom: espacio.l }}
      />
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(cuenta) =>
          cuenta.length === 0 ? (
            <EstadoVacio texto="No tiene unidades vinculadas. Comuníquese con la administración." icono="home-outline" />
          ) : (
            cuenta.map((u) => {
              const habilitado = u.es_responsable_pago || puedePagar(u.id_unidad);
              const elegidas = seleccion[u.id_unidad] ?? [];
              const total = u.cuotas.filter((c) => elegidas.includes(c.id_cuota)).reduce((s, c) => s + c.saldo, 0);
              return (
                <View key={u.id_unidad} style={{ marginBottom: espacio.xl }}>
                  <Tarjeta>
                    <Subtitulo>{u.unidad}</Subtitulo>
                    <Text style={estilos.saldo}>{formatoCOP(u.saldo_total)}</Text>
                    <TextoSecundario>
                      {u.cuotas.length} cuota(s) abierta(s){u.cuotas_vencidas > 0 ? ` · ${u.cuotas_vencidas} vencida(s)` : ''}
                    </TextoSecundario>
                  </Tarjeta>

                  {!habilitado && (
                    <Aviso
                      tono="info"
                      texto="Usted no es el responsable de pago de esta unidad. Puede consultar el estado de cuenta, pero solo el propietario o el responsable de pago puede pagar (RN-07)."
                    />
                  )}

                  {u.cuotas.length === 0 ? (
                    <Aviso tono="exito" texto="Esta unidad está al día. No hay cuotas pendientes." />
                  ) : (
                    <>
                      {habilitado && u.cuotas.length > 1 && (
                        <Boton
                          titulo={elegidas.length === u.cuotas.length ? 'Quitar selección' : 'Seleccionar todas'}
                          variante="texto"
                          alPresionar={() =>
                            setSeleccion((s) => ({
                              ...s,
                              [u.id_unidad]: elegidas.length === u.cuotas.length ? [] : u.cuotas.map((c) => c.id_cuota),
                            }))
                          }
                          estilo={{ alignSelf: 'flex-end' }}
                        />
                      )}
                      {u.cuotas.map((c) => (
                        <FilaCuota
                          key={c.id_cuota}
                          cuota={c}
                          seleccionable={habilitado}
                          seleccionada={elegidas.includes(c.id_cuota)}
                          alPresionar={() => alternar(u.id_unidad, c.id_cuota)}
                        />
                      ))}
                      {habilitado && (
                        <Boton
                          titulo={elegidas.length ? `Pagar ${formatoCOP(total)}` : 'Seleccione cuotas para pagar'}
                          icono="card-outline"
                          deshabilitado={elegidas.length === 0}
                          cargando={pagando === u.id_unidad}
                          alPresionar={() => pagar(u)}
                          estilo={{ marginTop: espacio.s }}
                        />
                      )}
                    </>
                  )}
                </View>
              );
            })
          )
        }
      </Contenido>
    </Pantalla>
  );
}

function FilaCuota({
  cuota,
  seleccionable,
  seleccionada,
  alPresionar,
}: {
  cuota: Cuota;
  seleccionable: boolean;
  seleccionada: boolean;
  alPresionar: () => void;
}) {
  const vencida = cuota.estado === 'VENCIDA';
  return (
    <Pressable
      onPress={seleccionable ? alPresionar : undefined}
      disabled={!seleccionable}
      accessibilityRole={seleccionable ? 'checkbox' : undefined}
      accessibilityState={seleccionable ? { checked: seleccionada } : undefined}
      style={[estilos.cuota, vencida && estilos.cuotaVencida, seleccionada && estilos.cuotaSeleccionada]}
    >
      {seleccionable && (
        <View style={[estilos.casilla, seleccionada && { backgroundColor: colores.primario, borderColor: colores.primario }]}>
          {seleccionada && <Icono nombre="checkmark" tamano={16} color={colores.blanco} />}
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={estilos.periodo}>
          {formatoPeriodo(cuota.periodo)} · {cuota.concepto.toLowerCase()}
        </Text>
        <Text style={[estilos.vence, vencida && { color: colores.peligro, fontWeight: '600' }]}>
          {vencida ? 'Venció' : 'Vence'} el {formatoFecha(cuota.fecha_vencimiento)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={estilos.valor}>{formatoCOP(cuota.saldo)}</Text>
        <InsigniaEstado estado={cuota.estado} />
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  saldo: { fontSize: 28, fontWeight: '800', color: colores.primarioOscuro, marginVertical: 4 },
  cuota: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.m,
    padding: espacio.m,
    marginBottom: espacio.s,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  cuotaVencida: { borderColor: colores.peligro, backgroundColor: '#FFF5F5', borderLeftWidth: 5 },
  cuotaSeleccionada: { borderColor: colores.primario, backgroundColor: colores.primarioSuave },
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
  periodo: { fontSize: 15, fontWeight: '600', color: colores.texto, textTransform: 'capitalize' },
  vence: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '700', color: colores.texto },
});
