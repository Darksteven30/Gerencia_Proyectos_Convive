/**
 * Pago, paso 2 de 3 — "Realizar pago": concepto, valor y medio de pago (CU-12).
 * Los tres medios (PSE, tarjeta, Nequi/Daviplata) usan la misma pasarela de pruebas; el medio elegido
 * se guarda en el estado de la app (parámetros de la ruta) y se muestra en la confirmación.
 * "Continuar" crea el pago (POST /api/pagos) y abre el checkout_url de la pasarela.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import { Aviso, Boton, Icono, Monto, NombreIcono, Pastilla, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { MedioPago, NOMBRE_MEDIO, PropsApp } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { formatoCOPCompleto } from '../../utils/formato';
import { abrirCheckout, ajustarUrlCheckout } from '../../utils/pasarela';

const MEDIOS: { medio: MedioPago; icono?: NombreIcono; detalle: string }[] = [
  { medio: 'PSE', detalle: 'Pagos seguros en línea desde su banco' },
  { medio: 'TARJETA', icono: 'card-outline', detalle: 'Visa, Mastercard y otras franquicias' },
  { medio: 'BILLETERA', icono: 'phone-portrait-outline', detalle: 'Billeteras digitales' },
];

export function RealizarPagoPantalla({ route, navigation }: PropsApp<'RealizarPago'>) {
  const { idUnidad, cuotas, concepto, valor } = route.params;
  const [medio, setMedio] = useState<MedioPago | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continuar = async () => {
    if (!medio) return;
    setEnviando(true);
    setError(null);
    try {
      const pago = await pagos.crear(idUnidad, cuotas);
      const url = ajustarUrlCheckout(pago.checkout_url);
      navigation.replace('ConfirmacionPago', { idPago: pago.id_pago, checkoutUrl: url, referencia: pago.referencia, concepto, medio });
      await abrirCheckout(url);
    } catch (e) {
      setError(mensajeError(e));
      setEnviando(false);
    }
  };

  return (
    <Pantalla pie={<Boton titulo="Continuar" alPresionar={continuar} cargando={enviando} deshabilitado={!medio} />}>
      <Pastilla texto="Realizar pago" estilo={{ alignSelf: 'center', marginBottom: espacio.m }} />
      <Tarjeta>
        <TextoSecundario>Concepto</TextoSecundario>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colores.texto, marginBottom: espacio.m }}>{concepto}</Text>
        <TextoSecundario>Valor a pagar</TextoSecundario>
        <Monto>{formatoCOPCompleto(valor)}</Monto>
        <TextoSecundario estilo={{ fontSize: 13 }}>{cuotas.length} cuota(s) seleccionada(s)</TextoSecundario>
      </Tarjeta>

      {error && <Aviso tono="peligro" texto={error} />}

      <Pastilla texto="Seleccione el medio de pago" estilo={{ marginBottom: espacio.s }} />
      <View accessibilityRole="radiogroup">
        {MEDIOS.map((m) => {
          const activo = medio === m.medio;
          return (
            <Pressable
              key={m.medio}
              onPress={() => setMedio(m.medio)}
              accessibilityRole="radio"
              accessibilityState={{ checked: activo }}
              accessibilityLabel={NOMBRE_MEDIO[m.medio]}
              style={({ pressed }) => [estilos.medio, activo && estilos.medioActivo, pressed && !activo && { backgroundColor: colores.grisMedio }]}
            >
              {m.icono ? (
                <View style={estilos.iconoMedio}>
                  <Icono nombre={m.icono} tamano={24} />
                </View>
              ) : (
                <View style={[estilos.iconoMedio, estilos.pse]}>
                  <Text style={{ color: colores.blanco, fontWeight: '800', fontSize: 13 }}>pse</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colores.texto }}>{NOMBRE_MEDIO[m.medio]}</Text>
                <Text style={{ fontSize: 13, color: colores.textoSecundario }}>{m.detalle}</Text>
              </View>
              <Icono nombre={activo ? 'radio-button-on' : 'radio-button-off'} tamano={22} />
            </Pressable>
          );
        })}
      </View>
      <TextoSecundario estilo={{ fontSize: 12, marginTop: espacio.s }}>
        Prototipo académico: los tres medios usan la pasarela de pruebas, que se abre en el navegador para aprobar o rechazar el pago.
      </TextoSecundario>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  medio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    backgroundColor: colores.grisClaro,
    borderRadius: radio.m,
    padding: espacio.m,
    minHeight: 64,
    marginBottom: espacio.s,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  medioActivo: { backgroundColor: colores.blanco, borderColor: colores.negro },
  iconoMedio: { width: 44, height: 44, borderRadius: 22, backgroundColor: colores.blanco, alignItems: 'center', justifyContent: 'center' },
  pse: { backgroundColor: '#1F4E8C' },
});
