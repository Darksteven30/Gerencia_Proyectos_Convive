/**
 * Formulario "Nueva PQRS" (CU-28 Radicar PQRS y CU-29 Adjuntar evidencias: hasta 3 archivos JPG, PNG o PDF de 5 MB).
 * Se usa dentro de la pantalla PQRS (tarjeta del mockup) y en la pantalla Nueva PQRS (accesos rápidos).
 * Se envía como multipart/form-data con el campo "adjuntos".
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { mensajeError } from '../api/cliente';
import { pqrs } from '../api/servicios';
import type { ArchivoAdjunto, PqrsCreada, TipoPqrs } from '../api/tipos';
import { useAuth } from '../contexto/AuthContext';
import { colores, espacio, radio } from '../tema';
import { avisar } from '../utils/dialogos';
import { SelectorUnidad } from './SelectorUnidad';
import { Aviso, Boton, Campo, Desplegable, Icono } from './ui';

const MAX_ADJUNTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

const TIPOS: { valor: TipoPqrs; texto: string }[] = [
  { valor: 'PETICION', texto: 'Petición' },
  { valor: 'QUEJA', texto: 'Queja' },
  { valor: 'RECLAMO', texto: 'Reclamo' },
  { valor: 'SUGERENCIA', texto: 'Sugerencia' },
];

const CATEGORIAS = ['Mantenimiento', 'Seguridad', 'Convivencia', 'Aseo', 'Administración', 'Zonas comunes', 'Otro'];

/** Deduce el tipo MIME a partir del nombre cuando el selector no lo informa. */
function tipoPorNombre(nombre: string): string {
  const ext = nombre.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'pdf') return 'application/pdf';
  return 'image/jpeg';
}

/** Construye el FormData. En web se usan Blob/File reales; en nativo, objetos { uri, name, type }. */
async function construirFormulario(campos: Record<string, string>, adjuntos: ArchivoAdjunto[]): Promise<FormData> {
  const fd = new FormData();
  Object.entries(campos).forEach(([k, v]) => fd.append(k, v));
  for (const a of adjuntos) {
    if (Platform.OS === 'web') {
      const blob = a.archivoWeb ?? (await (await fetch(a.uri)).blob());
      fd.append('adjuntos', blob, a.nombre);
    } else {
      fd.append('adjuntos', { uri: a.uri, name: a.nombre, type: a.tipo } as unknown as Blob);
    }
  }
  return fd;
}

/** Área rayada del mockup ("Foto"), dibujada con react-native-svg. */
function FondoRayado() {
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <Pattern id="rayas" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <Line x1="0" y1="0" x2="0" y2="14" stroke={colores.grisMedio} strokeWidth="6" />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#rayas)" />
    </Svg>
  );
}

export function FormularioPqrs({ alRadicar }: { alRadicar: (r: PqrsCreada) => void }) {
  const { perfil } = useAuth();
  const [tipo, setTipo] = useState<TipoPqrs>('PETICION');
  const [categoria, setCategoria] = useState<string>('Mantenimiento');
  const [asunto, setAsunto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [idUnidad, setIdUnidad] = useState<number | null>(perfil?.unidades[0]?.idUnidad ?? null);
  const [adjuntos, setAdjuntos] = useState<ArchivoAdjunto[]>([]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const agregar = (nuevos: ArchivoAdjunto[]) => {
    const rechazados: string[] = [];
    const validos = nuevos.filter((a) => {
      if (!TIPOS_PERMITIDOS.includes(a.tipo)) {
        rechazados.push(`${a.nombre}: solo se permiten JPG, PNG o PDF`);
        return false;
      }
      if (a.tamano && a.tamano > MAX_BYTES) {
        rechazados.push(`${a.nombre}: supera 5 MB`);
        return false;
      }
      return true;
    });
    const espacioLibre = MAX_ADJUNTOS - adjuntos.length;
    if (validos.length > espacioLibre) rechazados.push(`Solo se permiten ${MAX_ADJUNTOS} adjuntos`);
    setAdjuntos((a) => [...a, ...validos.slice(0, espacioLibre)]);
    if (rechazados.length) avisar('Algunos archivos no se agregaron', rechazados.join('\n'));
  };

  const elegirImagen = async () => {
    try {
      const r = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: MAX_ADJUNTOS - adjuntos.length,
        quality: 0.7,
      });
      if (r.canceled) return;
      agregar(
        r.assets.map((a, i) => {
          const nombre = a.fileName ?? `foto-${Date.now()}-${i}.jpg`;
          return { uri: a.uri, nombre, tipo: a.mimeType ?? tipoPorNombre(nombre), tamano: a.fileSize, archivoWeb: a.file };
        }),
      );
    } catch (e) {
      avisar('No se pudo abrir la galería', mensajeError(e));
    }
  };

  const tomarFoto = async () => {
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return avisar('Permiso requerido', 'Autorice el uso de la cámara para tomar la foto.');
      const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
      if (r.canceled) return;
      const a = r.assets[0];
      const nombre = a.fileName ?? `foto-${Date.now()}.jpg`;
      agregar([{ uri: a.uri, nombre, tipo: a.mimeType ?? tipoPorNombre(nombre), tamano: a.fileSize }]);
    } catch (e) {
      avisar('No se pudo usar la cámara', mensajeError(e));
    }
  };

  const elegirDocumento = async () => {
    try {
      const r = await DocumentPicker.getDocumentAsync({ type: TIPOS_PERMITIDOS, multiple: true, copyToCacheDirectory: true });
      if (r.canceled) return;
      agregar(r.assets.map((a) => ({ uri: a.uri, nombre: a.name, tipo: a.mimeType ?? tipoPorNombre(a.name), tamano: a.size, archivoWeb: a.file })));
    } catch (e) {
      avisar('No se pudo abrir el selector de archivos', mensajeError(e));
    }
  };

  const enviar = async () => {
    const e: Record<string, string> = {};
    if (asunto.trim().length < 5) e.asunto = 'El asunto debe tener al menos 5 caracteres';
    if (descripcion.trim().length < 10) e.descripcion = 'Describa la solicitud con al menos 10 caracteres';
    setErrores(e);
    if (Object.keys(e).length) return;

    setEnviando(true);
    setErrorApi(null);
    try {
      const campos: Record<string, string> = { tipo, categoria, asunto: asunto.trim(), descripcion: descripcion.trim() };
      if (idUnidad) campos.id_unidad = String(idUnidad);
      const r = await pqrs.crear(await construirFormulario(campos, adjuntos));
      avisar('Solicitud radicada', `Radicado ${r.numero_radicado}. Recibirá respuesta a más tardar el ${r.fecha_limite}.`);
      setAsunto('');
      setDescripcion('');
      setAdjuntos([]);
      alRadicar(r);
    } catch (err) {
      setErrorApi(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <View>
      {errorApi && <Aviso tono="peligro" texto={errorApi} />}
      <Desplegable<TipoPqrs> etiqueta="Tipo" opciones={TIPOS} valor={tipo} alCambiar={setTipo} />
      <Desplegable etiqueta="Categoría" opciones={CATEGORIAS.map((c) => ({ valor: c, texto: c }))} valor={categoria} alCambiar={setCategoria} />
      {perfil && <SelectorUnidad unidades={perfil.unidades} valor={idUnidad} alCambiar={setIdUnidad} />}
      <Campo etiqueta="Asunto" value={asunto} onChangeText={setAsunto} maxLength={150} placeholder="Ej.: Daño en el portón" error={errores.asunto} />
      <Campo
        etiqueta="Descripción"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        placeholder="Cuéntenos qué ocurre, dónde y desde cuándo"
        error={errores.descripcion}
      />

      <Text style={estilos.etiqueta}>
        Foto o documento ({adjuntos.length}/{MAX_ADJUNTOS})
      </Text>
      {adjuntos.map((a, i) => (
        <View key={`${a.uri}-${i}`} style={estilos.adjunto}>
          <Icono nombre={a.tipo === 'application/pdf' ? 'document-outline' : 'image-outline'} />
          <Text style={{ flex: 1, marginHorizontal: espacio.s, color: colores.texto }} numberOfLines={1}>
            {a.nombre}
            {a.tamano ? ` · ${Math.ceil(a.tamano / 1024)} KB` : ''}
          </Text>
          <Pressable
            onPress={() => setAdjuntos((l) => l.filter((_, j) => j !== i))}
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${a.nombre}`}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icono nombre="close-circle" color={colores.peligro} />
          </Pressable>
        </View>
      ))}
      {adjuntos.length < MAX_ADJUNTOS && (
        <View style={estilos.areaFoto}>
          <FondoRayado />
          <View style={estilos.botonesFoto}>
            <BotonAdjunto icono="images-outline" texto="Galería" alPresionar={elegirImagen} />
            {Platform.OS !== 'web' && <BotonAdjunto icono="camera-outline" texto="Cámara" alPresionar={tomarFoto} />}
            <BotonAdjunto icono="attach-outline" texto="Documento" alPresionar={elegirDocumento} />
          </View>
          <Text style={estilos.ayudaFoto}>JPG, PNG o PDF de máximo 5 MB</Text>
        </View>
      )}
      <Boton titulo="Radicar" compacto icono="send-outline" alPresionar={enviar} cargando={enviando} estilo={{ marginTop: espacio.m }} />
    </View>
  );
}

function BotonAdjunto({ icono, texto, alPresionar }: { icono: React.ComponentProps<typeof Icono>['nombre']; texto: string; alPresionar: () => void }) {
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={`Adjuntar desde ${texto.toLowerCase()}`}
      style={({ pressed }) => [estilos.botonAdjunto, pressed && { backgroundColor: colores.grisClaro }]}
    >
      <Icono nombre={icono} tamano={18} />
      <Text style={{ marginLeft: 6, fontWeight: '600', color: colores.texto }}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto, marginBottom: 6 },
  adjunto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.grisClaro,
    borderRadius: radio.m,
    paddingLeft: espacio.m,
    marginBottom: espacio.s,
  },
  areaFoto: {
    minHeight: 110,
    borderRadius: radio.s,
    overflow: 'hidden',
    backgroundColor: colores.grisClaro,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacio.m,
  },
  botonesFoto: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, justifyContent: 'center' },
  botonAdjunto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.blanco,
    borderRadius: radio.pildora,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  ayudaFoto: { marginTop: espacio.s, fontSize: 12, color: colores.texto, backgroundColor: colores.blanco, paddingHorizontal: 6, borderRadius: 4 },
});
