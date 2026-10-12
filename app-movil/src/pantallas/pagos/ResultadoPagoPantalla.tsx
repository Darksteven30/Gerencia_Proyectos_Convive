/**
 * DS-02 etapa 2: consulta el resultado del pago después del checkout de la pasarela.
 * Consulta GET /api/pagos/:id cada pocos segundos mientras el pago siga PENDIENTE,
 * y ofrece el botón "Ya pagué, verificar".
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import type { PagoResumen } from '../../api/tipos';
import { Aviso, Boton, FilaDato, Icono, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { descargarPdf } from '../../utils/descargas';
import { formatoCOP } from '../../utils/formato';
import { abrirCheckout } from './PagosPantalla';

const INTERVALO_MS = 4000;
const MAX_INTENTOS = 45; // unos 3 minutos

export function ResultadoPagoPantalla({ route, navigation }: PropsApp<'ResultadoPago'>) {
  const { idPago, checkoutUrl, referencia } = route.params;
  const [pago, setPago] = useState<PagoResumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [intentos, setIntentos] = useState(0);
  const montado = useRef(true);

  const consultar = useCallback(async () => {
    try {
      const p = await pagos.consultar(idPago);
      if (montado.current) {
        setPago(p);
        setError(null);
      }
      return p;
    } catch (e) {
      if (montado.current) setError(mensajeError(e));
      return null;
    }
  }, [idPago]);

  // Consulta periódica mientras el pago esté pendiente
  useEffect(() => {
    montado.current = true;
    void consultar();
    return () => {
      montado.current = false;
    };
  }, [consultar]);

  useEffect(() => {
    // Se sigue consultando si está pendiente o si se aprobó pero el comprobante aún no está listo
    const enEspera = !pago || pago.estado === 'PENDIENTE' || (pago.estado === 'APROBADO' && !pago.comprobante);
    if (!enEspera) return;
    if (intentos >= MAX_INTENTOS) return;
    const t = setTimeout(async () => {
      await consultar();
      setIntentos((n) => n + 1);
    }, INTERVALO_MS);
    return () => clearTimeout(t);
  }, [pago, intentos, consultar]);

  const verificar = async () => {
    setVerificando(true);
    const p = await consultar();
    setVerificando(false);
    setIntentos(0); // reinicia la consulta automática
    if (p?.estado === 'PENDIENTE') {
      avisar('Pago en proceso', 'La pasarela aún no ha confirmado el pago. Si ya lo completó, espere unos segundos y verifique de nuevo.');
    }
  };

  const descargar = async () => {
    setDescargando(true);
    try {
      await descargarPdf(pagos.rutaComprobante(idPago), `comprobante-${pago?.comprobante ?? idPago}.pdf`);
    } catch (e) {
      avisar('No se pudo descargar', mensajeError(e));
    } finally {
      setDescargando(false);
    }
  };

  const estado = pago?.estado ?? 'PENDIENTE';
  const aspecto = {
    PENDIENTE: { icono: 'time-outline', color: colores.primario, titulo: 'Esperando la confirmación del pago' },
    APROBADO: { icono: 'checkmark-circle', color: colores.exito, titulo: '¡Pago aprobado!' },
    RECHAZADO: { icono: 'close-circle', color: colores.peligro, titulo: 'Pago rechazado' },
    ANULADO: { icono: 'remove-circle', color: colores.textoSecundario, titulo: 'Pago anulado' },
  }[estado] as { icono: React.ComponentProps<typeof Icono>['nombre']; color: string; titulo: string };

  return (
    <Pantalla>
      <Tarjeta estilo={{ alignItems: 'center', paddingVertical: espacio.xl }}>
        <Icono nombre={aspecto.icono} tamano={64} color={aspecto.color} />
        <Text style={[estilos.titulo, { color: aspecto.color }]}>{aspecto.titulo}</Text>
        {estado === 'PENDIENTE' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: espacio.s }}>
            <ActivityIndicator color={colores.primario} />
            <TextoSecundario estilo={{ marginLeft: espacio.s }}>
              {intentos < MAX_INTENTOS ? 'Consultando el estado automáticamente…' : 'Consulta automática detenida.'}
            </TextoSecundario>
          </View>
        )}
      </Tarjeta>

      {error && <Aviso tono="peligro" texto={error} />}

      <Tarjeta>
        <FilaDato etiqueta="Referencia" valor={pago?.referencia ?? referencia} />
        <FilaDato etiqueta="Valor" valor={pago ? formatoCOP(pago.valor_total) : '…'} />
        {pago?.comprobante && <FilaDato etiqueta="Comprobante" valor={pago.comprobante} />}
      </Tarjeta>

      {estado === 'PENDIENTE' && (
        <>
          <Aviso
            tono="info"
            texto="Complete el pago en la pasarela que se abrió. Al terminar, vuelva a esta pantalla: el resultado se actualizará solo, o toque «Ya pagué, verificar»."
          />
          <Boton titulo="Ya pagué, verificar" icono="refresh" alPresionar={verificar} cargando={verificando} />
          <Boton
            titulo="Abrir pasarela de pago"
            variante="secundario"
            icono="open-outline"
            alPresionar={() => abrirCheckout(checkoutUrl)}
            estilo={{ marginTop: espacio.s }}
          />
        </>
      )}
      {estado === 'APROBADO' && (
        <>
          <Boton
            titulo="Descargar comprobante (PDF)"
            icono="download-outline"
            alPresionar={descargar}
            cargando={descargando}
            deshabilitado={!pago?.comprobante}
          />
          {!pago?.comprobante && <TextoSecundario estilo={{ marginTop: espacio.s }}>Generando el comprobante…</TextoSecundario>}
        </>
      )}
      {estado === 'RECHAZADO' && (
        <Aviso tono="peligro" texto="La pasarela rechazó el pago. Sus cuotas siguen pendientes; puede intentarlo de nuevo." />
      )}
      <Boton
        titulo="Volver a pagos"
        variante="texto"
        alPresionar={() => navigation.navigate('Pestanas', { screen: 'Pagos' })}
        estilo={{ marginTop: espacio.m }}
      />
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  titulo: { fontSize: 20, fontWeight: '800', marginTop: espacio.m, textAlign: 'center' },
});
