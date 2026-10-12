/**
 * Código QR de acceso del visitante (CU-42), compartirlo y CU-44 cancelar la visita.
 */
import React, { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { mensajeError } from '../../api/cliente';
import { visitas } from '../../api/servicios';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Aviso, Boton, FilaDato, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { avisar, confirmar } from '../../utils/dialogos';
import { formatoFecha, formatoFechaHora } from '../../utils/formato';

export function DetalleVisitaPantalla({ route, navigation }: PropsApp<'DetalleVisita'>) {
  const { perfil } = useAuth();
  const [visita, setVisita] = useState(route.params.visita);
  const [cancelando, setCancelando] = useState(false);
  const activa = visita.estado === 'PREREGISTRADA' && !!visita.codigo_qr;

  const texto =
    `Hola, ${visita.visitante.nombre}. Le espero en ${perfil?.conjunto?.nombre ?? 'el conjunto'} (${visita.unidad}) ` +
    `el ${formatoFecha(visita.fecha_programada)} entre ${visita.hora_desde} y ${visita.hora_hasta}. ` +
    `Presente este código de acceso en portería: ${visita.codigo_qr}`;

  const compartir = async () => {
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(texto);
        avisar('Copiado', 'El mensaje con el código de acceso se copió al portapapeles. Péguelo en el chat con su visitante.');
      } else {
        await Share.share({ message: texto, title: 'Código de acceso Convive' });
      }
    } catch (e) {
      avisar('No se pudo compartir', mensajeError(e));
    }
  };

  const cancelar = async () => {
    const ok = await confirmar('Cancelar visita', `¿Desea cancelar la visita de ${visita.visitante.nombre}? El código QR dejará de funcionar.`, 'Sí, cancelar');
    if (!ok) return;
    setCancelando(true);
    try {
      await visitas.cancelar(visita.id_visita);
      setVisita({ ...visita, estado: 'CANCELADA' });
      avisar('Visita cancelada');
      navigation.goBack();
    } catch (e) {
      avisar('No se pudo cancelar', mensajeError(e));
    } finally {
      setCancelando(false);
    }
  };

  return (
    <Pantalla>
      <Tarjeta estilo={{ alignItems: 'center', paddingVertical: espacio.xl }}>
        <InsigniaEstado estado={visita.estado} />
        <Text style={{ fontSize: 20, fontWeight: '800', color: colores.texto, marginTop: espacio.m, textAlign: 'center' }}>
          {visita.visitante.nombre}
        </Text>
        <TextoSecundario>
          {formatoFecha(visita.fecha_programada)} · {visita.hora_desde} – {visita.hora_hasta}
        </TextoSecundario>
        {activa ? (
          <>
            <View style={{ padding: espacio.l, backgroundColor: colores.blanco, borderRadius: 16, marginTop: espacio.l, borderWidth: 1, borderColor: colores.borde }}>
              <QRCode value={visita.codigo_qr!} size={240} color={colores.texto} backgroundColor={colores.blanco} />
            </View>
            <Text selectable style={{ marginTop: espacio.m, color: colores.textoSecundario, fontSize: 12, textAlign: 'center' }}>
              {visita.codigo_qr}
            </Text>
            <TextoSecundario estilo={{ marginTop: espacio.s, textAlign: 'center' }}>
              Válido hasta {formatoFechaHora(visita.qr_expira)}
            </TextoSecundario>
          </>
        ) : (
          <Aviso
            tono="neutro"
            texto={
              visita.estado === 'INGRESADA'
                ? 'El visitante ya ingresó al conjunto.'
                : 'Este código ya no está vigente.'
            }
          />
        )}
      </Tarjeta>

      {activa && (
        <>
          <Boton
            titulo={Platform.OS === 'web' ? 'Copiar mensaje con el código' : 'Compartir código'}
            icono={Platform.OS === 'web' ? 'copy-outline' : 'share-social-outline'}
            alPresionar={compartir}
          />
          <Boton
            titulo="Cancelar visita"
            variante="peligro"
            icono="close-circle-outline"
            alPresionar={cancelar}
            cargando={cancelando}
            estilo={{ marginTop: espacio.s, marginBottom: espacio.l }}
          />
        </>
      )}

      <Tarjeta>
        <FilaDato etiqueta="Documento" valor={`${visita.visitante.tipo_documento} ${visita.visitante.numero_documento}`} />
        {visita.visitante.telefono && <FilaDato etiqueta="Teléfono" valor={visita.visitante.telefono} />}
        {visita.visitante.placa_vehiculo && <FilaDato etiqueta="Placa" valor={visita.visitante.placa_vehiculo} />}
        <FilaDato etiqueta="Unidad" valor={visita.unidad} />
        {visita.motivo && <FilaDato etiqueta="Motivo" valor={visita.motivo} />}
        {visita.fecha_hora_ingreso && <FilaDato etiqueta="Ingreso" valor={formatoFechaHora(visita.fecha_hora_ingreso)} />}
        {visita.fecha_hora_salida && <FilaDato etiqueta="Salida" valor={formatoFechaHora(visita.fecha_hora_salida)} />}
        {visita.parqueadero && <FilaDato etiqueta="Parqueadero" valor={visita.parqueadero} />}
      </Tarjeta>
    </Pantalla>
  );
}
