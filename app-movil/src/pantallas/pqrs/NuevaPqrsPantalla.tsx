/**
 * CU-28 Radicar PQRS y CU-29 Adjuntar evidencias (hasta 3 archivos JPG, PNG o PDF de 5 MB).
 * Se envía como multipart/form-data con el campo "adjuntos".
 */
import React, { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { mensajeError } from '../../api/cliente';
import { pqrs } from '../../api/servicios';
import type { ArchivoAdjunto, TipoPqrs } from '../../api/tipos';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';
import { Aviso, Boton, Campo, Icono, Opciones, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';

const MAX_ADJUNTOS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'application/pdf'];

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

export function NuevaPqrsPantalla({ navigation }: PropsApp<'NuevaPqrs'>) {
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
      const r = await DocumentPicker.getDocumentAsync({
        type: TIPOS_PERMITIDOS,
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (r.canceled) return;
      agregar(
        r.assets.map((a) => ({
          uri: a.uri,
          nombre: a.name,
          tipo: a.mimeType ?? tipoPorNombre(a.name),
          tamano: a.size,
          archivoWeb: a.file,
        })),
      );
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
      navigation.replace('DetallePqrs', { idPqrs: r.id_pqrs });
    } catch (err) {
      setErrorApi(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <Tarjeta>
        {errorApi && <Aviso tono="peligro" texto={errorApi} />}
        <Opciones<TipoPqrs>
          etiqueta="Tipo de solicitud"
          opciones={[
            { valor: 'PETICION', texto: 'Petición' },
            { valor: 'QUEJA', texto: 'Queja' },
            { valor: 'RECLAMO', texto: 'Reclamo' },
            { valor: 'SUGERENCIA', texto: 'Sugerencia' },
          ]}
          valor={tipo}
          alCambiar={setTipo}
        />
        <Opciones etiqueta="Categoría" opciones={CATEGORIAS.map((c) => ({ valor: c, texto: c }))} valor={categoria} alCambiar={setCategoria} />
        {perfil && <SelectorUnidad unidades={perfil.unidades} valor={idUnidad} alCambiar={setIdUnidad} />}
        <Campo
          etiqueta="Asunto"
          value={asunto}
          onChangeText={setAsunto}
          maxLength={150}
          placeholder="Ej.: Fuga de agua en el parqueadero"
          error={errores.asunto}
        />
        <Campo
          etiqueta="Descripción"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          placeholder="Cuéntenos qué ocurre, dónde y desde cuándo"
          error={errores.descripcion}
        />

        <Text style={{ fontWeight: '600', color: colores.texto, marginBottom: 6 }}>
          Adjuntos ({adjuntos.length}/{MAX_ADJUNTOS})
        </Text>
        <TextoSecundario estilo={{ marginBottom: espacio.s }}>Fotos o documentos JPG, PNG o PDF de máximo 5 MB.</TextoSecundario>
        {adjuntos.map((a, i) => (
          <View
            key={`${a.uri}-${i}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: colores.primarioSuave,
              borderRadius: radio.m,
              padding: espacio.m,
              marginBottom: espacio.s,
            }}
          >
            <Icono nombre={a.tipo === 'application/pdf' ? 'document-outline' : 'image-outline'} />
            <Text style={{ flex: 1, marginHorizontal: espacio.s, color: colores.texto }} numberOfLines={1}>
              {a.nombre}
              {a.tamano ? ` · ${Math.ceil(a.tamano / 1024)} KB` : ''}
            </Text>
            <Pressable onPress={() => setAdjuntos((l) => l.filter((_, j) => j !== i))} accessibilityLabel={`Quitar ${a.nombre}`} hitSlop={10}>
              <Icono nombre="close-circle" color={colores.peligro} />
            </Pressable>
          </View>
        ))}
        {adjuntos.length < MAX_ADJUNTOS && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, marginBottom: espacio.l }}>
            <Boton titulo="Imagen" variante="secundario" icono="images-outline" alPresionar={elegirImagen} estilo={{ flexGrow: 1 }} />
            {Platform.OS !== 'web' && (
              <Boton titulo="Cámara" variante="secundario" icono="camera-outline" alPresionar={tomarFoto} estilo={{ flexGrow: 1 }} />
            )}
            <Boton titulo="Documento" variante="secundario" icono="attach-outline" alPresionar={elegirDocumento} estilo={{ flexGrow: 1 }} />
          </View>
        )}
        <Boton titulo="Radicar solicitud" icono="send-outline" alPresionar={enviar} cargando={enviando} />
      </Tarjeta>
    </Pantalla>
  );
}
