/**
 * Pago, paso 3 de 3 — confirmación (DS-02 etapa 2).
 * Consulta GET /api/pagos/:id cada pocos segundos mientras el pago siga PENDIENTE y ofrece
 * "Ya pagué, verificar". Al aprobarse muestra "Pago exitoso" con el detalle y el comprobante (CU-15).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import type { PagoResumen } from '../../api/tipos';
import { Aviso, Boton, Icono, NombreIcono, Pantalla, TextoSecundario } from '../../componentes/ui';
import { irAPestana, NOMBRE_MEDIO, PropsApp } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { descargarPdf } from '../../utils/descargas';
import { formatoCOPCompleto, formatoFechaHora } from '../../utils/formato';
import { abrirCheckout } from '../../utils/pasarela';

const INTERVALO_MS = 4000;
const MAX_INTENTOS = 45; // unos 3 minutos

export function ConfirmacionPagoPantalla({ route, navigation }: PropsApp<'ConfirmacionPago'>) {
  const { idPago, checkoutUrl, referencia, concepto, medio } = route.params;
  const [pago, setPago] = useState<PagoResumen | null>(null);
  const [fecha, setFecha] = useState<string | null>(null);
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

  useEffect(() => {
    montado.current = true;
    void consultar();
    return () => {
      montado.current = false;
    };
  }, [consultar]);

  // Consulta periódica mientras esté pendiente o mientras se genera el comprobante
  useEffect(() => {
    const enEspera = !pago || pago.estado === 'PENDIENTE' || (pago.estado === 'APROBADO' && !pago.comprobante);
    if (!enEspera || intentos >= MAX_INTENTOS) return;
    const t = setTimeout(async () => {
      await consultar();
      setIntentos((n) => n + 1);
    }, INTERVALO_MS);
    return () => clearTimeout(t);
  }, [pago, intentos, consultar]);

  // Fecha de confirmación para la tabla del pago exitoso
  useEffect(() => {
    if (pago?.estado !== 'APROBADO' || fecha) return;
    pagos
      .historial()
      .then((lista) => {
        const p = lista.find((x) => x.id_pago === idPago);
        if (montado.current) setFecha(p?.fecha_confirmacion ?? p?.fecha_creacion ?? new Date().toISOString());
      })
      .catch(() => montado.current && setFecha(new Date().toISOString()));
  }, [pago?.estado, fecha, idPago]);

  const verificar = async () => {
    setVerificando(true);
    const p = await consultar();
    setVerificando(false);
    setIntentos(0);
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

  if (estado === 'APROBADO') {
    return (
      <Pantalla>
        <View style={{ alignItems: 'center', marginTop: espacio.xl }}>
          <View style={estilos.check} accessibilityRole="image" accessibilityLabel="Pago aprobado">
            <Icono nombre="checkmark" tamano={64} color={colores.verde} />
          </View>
          <View style={estilos.pastillaExito}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colores.texto }} accessibilityRole="header">
              Pago exitoso
            </Text>
          </View>
          <TextoSecundario estilo={{ textAlign: 'center', marginBottom: espacio.xl }}>Tu pago ha sido procesado correctamente</TextoSecundario>
        </View>

        <View style={estilos.tabla}>
          <FilaTabla etiqueta="Concepto" valor={concepto} />
          <FilaTabla etiqueta="Valor pagado" valor={formatoCOPCompleto(pago?.valor_total)} />
          <FilaTabla etiqueta="Fecha" valor={fecha ? formatoFechaHora(fecha) : '…'} />
          <FilaTabla etiqueta="Medio de pago" valor={NOMBRE_MEDIO[medio]} />
          <FilaTabla etiqueta="Referencia" valor={pago?.referencia ?? referencia} ultima />
        </View>

        <Boton titulo="Volver al inicio" alPresionar={() => irAPestana(navigation, 'Inicio')} estilo={{ marginTop: espacio.xl }} />
        <Boton
          titulo={pago?.comprobante ? 'Descargar comprobante' : 'Generando el comprobante…'}
          variante="secundario"
          icono="download-outline"
          alPresionar={descargar}
          cargando={descargando}
          deshabilitado={!pago?.comprobante}
          estilo={{ marginTop: espacio.s }}
        />
      </Pantalla>
    );
  }

  const aspecto: Record<'PENDIENTE' | 'RECHAZADO' | 'ANULADO', { icono: NombreIcono; color: string; titulo: string; texto: string }> = {
    PENDIENTE: {
      icono: 'time-outline',
      color: colores.texto,
      titulo: 'Esperando la confirmación',
      texto: 'Complete el pago en la pasarela que se abrió. Al terminar, vuelva a esta pantalla: el resultado se actualizará solo, o toque «Ya pagué, verificar».',
    },
    RECHAZADO: {
      icono: 'close-circle-outline',
      color: colores.peligro,
      titulo: 'Pago rechazado',
      texto: 'La pasarela rechazó el pago. Sus cuotas siguen pendientes; puede intentarlo de nuevo.',
    },
    ANULADO: {
      icono: 'remove-circle-outline',
      color: colores.textoSecundario,
      titulo: 'Pago anulado',
      texto: 'Este pago fue anulado. Sus cuotas siguen pendientes.',
    },
  };
  const a = aspecto[estado];

  return (
    <Pantalla>
      <View style={{ alignItems: 'center', marginTop: espacio.xl, marginBottom: espacio.l }}>
        <Icono nombre={a.icono} tamano={88} color={a.color} />
        <Text style={[estilos.titulo, { color: a.color }]} accessibilityRole="header">
          {a.titulo}
        </Text>
        {estado === 'PENDIENTE' && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: espacio.s }}>
            <ActivityIndicator color={colores.turquesa} />
            <TextoSecundario estilo={{ marginLeft: espacio.s }}>
              {intentos < MAX_INTENTOS ? 'Consultando el estado automáticamente…' : 'Consulta automática detenida.'}
            </TextoSecundario>
          </View>
        )}
      </View>

      {error && <Aviso tono="peligro" texto={error} />}
      <Aviso tono={estado === 'PENDIENTE' ? 'info' : estado === 'RECHAZADO' ? 'peligro' : 'neutro'} texto={a.texto} />

      <View style={estilos.tabla}>
        <FilaTabla etiqueta="Concepto" valor={concepto} />
        <FilaTabla etiqueta="Valor" valor={pago ? formatoCOPCompleto(pago.valor_total) : '…'} />
        <FilaTabla etiqueta="Medio de pago" valor={NOMBRE_MEDIO[medio]} />
        <FilaTabla etiqueta="Referencia" valor={pago?.referencia ?? referencia} ultima />
      </View>

      {estado === 'PENDIENTE' && (
        <>
          <Boton titulo="Ya pagué, verificar" icono="refresh" alPresionar={verificar} cargando={verificando} estilo={{ marginTop: espacio.l }} />
          <Boton
            titulo="Abrir pasarela de pago"
            variante="secundario"
            icono="open-outline"
            alPresionar={() => abrirCheckout(checkoutUrl)}
            estilo={{ marginTop: espacio.s }}
          />
        </>
      )}
      {estado !== 'PENDIENTE' && (
        <Boton titulo="Intentar de nuevo" icono="card-outline" alPresionar={() => navigation.replace('EfectuarPago')} estilo={{ marginTop: espacio.l }} />
      )}
      <Boton titulo="Volver a pagos" variante="texto" alPresionar={() => irAPestana(navigation, 'Pagos')} estilo={{ marginTop: espacio.s }} />
    </Pantalla>
  );
}

function FilaTabla({ etiqueta, valor, ultima }: { etiqueta: string; valor: string; ultima?: boolean }) {
  return (
    <View style={[estilos.filaTabla, !ultima && { borderBottomWidth: 1, borderBottomColor: colores.borde }]}>
      <Text style={estilos.etiquetaTabla}>{etiqueta}</Text>
      <Text style={estilos.valorTabla}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  check: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: colores.verde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.l,
  },
  pastillaExito: { backgroundColor: colores.grisClaro, borderRadius: radio.pildora, paddingHorizontal: espacio.l, paddingVertical: 6, marginBottom: espacio.s },
  titulo: { fontSize: 20, fontWeight: '800', marginTop: espacio.m, textAlign: 'center' },
  tabla: { borderWidth: 1, borderColor: colores.texto, borderRadius: radio.s, paddingHorizontal: espacio.m },
  filaTabla: { flexDirection: 'row', paddingVertical: 10, gap: espacio.m },
  etiquetaTabla: { width: 110, color: colores.textoSecundario, fontSize: 14 },
  valorTabla: { flex: 1, color: colores.texto, fontSize: 14, fontWeight: '600' },
});
