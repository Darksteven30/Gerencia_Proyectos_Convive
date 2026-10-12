/**
 * Componentes de interfaz reutilizables con el estilo de los mockups de Figma:
 * fondo blanco, tarjetas con borde gris claro, títulos de sección en "pastilla",
 * chips tipo píldora (activo negro), botón principal verde y botón secundario negro.
 */
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, radio, TACTIL_MIN } from '../tema';

export type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];

// --- Contenedores ---

/** Pantalla desplazable con relleno, ajuste del teclado y "jalar para refrescar" opcional. */
export function Pantalla({
  children,
  refrescando,
  alRefrescar,
  estilo,
  pie,
}: {
  children: React.ReactNode;
  refrescando?: boolean;
  alRefrescar?: () => void;
  estilo?: StyleProp<ViewStyle>;
  /** Contenido fijo al pie de la pantalla (por ejemplo, el botón "Continuar" del flujo de pago). */
  pie?: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[estilos.pantalla, estilo]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          alRefrescar ? (
            <RefreshControl refreshing={!!refrescando} onRefresh={alRefrescar} colors={[colores.turquesa]} tintColor={colores.turquesa} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
      {pie ? <View style={estilos.pie}>{pie}</View> : null}
    </KeyboardAvoidingView>
  );
}

export function Tarjeta({
  children,
  estilo,
  alPresionar,
  etiquetaAccesible,
}: {
  children: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
  alPresionar?: () => void;
  etiquetaAccesible?: string;
}) {
  if (alPresionar) {
    return (
      <Pressable
        onPress={alPresionar}
        style={({ pressed }) => [estilos.tarjeta, pressed && { backgroundColor: colores.grisClaro }, estilo]}
        accessibilityRole="button"
        accessibilityLabel={etiquetaAccesible}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.tarjeta, estilo]}>{children}</View>;
}

/** Título de sección en "pastilla" gris claro, como en los mockups ("Resumen financiero", "Datos personales"…). */
export function Pastilla({ texto, estilo }: { texto: string; estilo?: StyleProp<ViewStyle> }) {
  return (
    <View style={[estilos.pastilla, estilo]}>
      <Text style={estilos.textoPastilla} accessibilityRole="header">
        {texto}
      </Text>
    </View>
  );
}

export function Seccion({
  titulo,
  accion,
  children,
  estilo,
}: {
  titulo: string;
  accion?: React.ReactNode;
  children?: React.ReactNode;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginBottom: espacio.l }, estilo]}>
      <View style={estilos.encabezadoSeccion}>
        <Pastilla texto={titulo} />
        {accion}
      </View>
      {children}
    </View>
  );
}

// --- Texto ---

export function Titulo({ children, estilo }: { children: React.ReactNode; estilo?: StyleProp<TextStyle> }) {
  return (
    <Text style={[estilos.titulo, estilo]} accessibilityRole="header">
      {children}
    </Text>
  );
}

export function Subtitulo({ children, estilo }: { children: React.ReactNode; estilo?: StyleProp<TextStyle> }) {
  return <Text style={[estilos.subtitulo, estilo]}>{children}</Text>;
}

export function TextoSecundario({ children, estilo, lineas }: { children: React.ReactNode; estilo?: StyleProp<TextStyle>; lineas?: number }) {
  return (
    <Text style={[estilos.secundario, estilo]} numberOfLines={lineas}>
      {children}
    </Text>
  );
}

/** Monto grande y en negrita ("$ 45.678,90"). */
export function Monto({ children, estilo }: { children: React.ReactNode; estilo?: StyleProp<TextStyle> }) {
  return <Text style={[estilos.monto, estilo]}>{children}</Text>;
}

export function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <View style={estilos.filaDato}>
      <Text style={estilos.filaEtiqueta}>{etiqueta}</Text>
      <Text style={estilos.filaValor}>{valor}</Text>
    </View>
  );
}

// --- Botones ---

/**
 * - primario: verde con texto oscuro (acción principal: Abonar, Continuar, Agendar, Radicar…).
 * - oscuro: negro con texto blanco (como "Continuar" del Sign In).
 * - secundario: gris claro con texto oscuro.
 * - peligro: rojo claro con texto rojo.
 * - texto: solo texto (enlace).
 */
type VarianteBoton = 'primario' | 'oscuro' | 'secundario' | 'peligro' | 'texto';

const ESTILO_BOTON: Record<VarianteBoton, { fondo: string; texto: string; presionado: string }> = {
  primario: { fondo: colores.verde, texto: colores.textoSobreVerde, presionado: colores.verdePresionado },
  oscuro: { fondo: colores.negro, texto: colores.blanco, presionado: '#333333' },
  secundario: { fondo: colores.grisClaro, texto: colores.texto, presionado: colores.grisMedio },
  peligro: { fondo: colores.peligroClaro, texto: colores.peligro, presionado: '#F8D3D3' },
  texto: { fondo: 'transparent', texto: colores.enlace, presionado: colores.grisClaro },
};

export function Boton({
  titulo,
  alPresionar,
  variante = 'primario',
  cargando,
  deshabilitado,
  icono,
  estilo,
  compacto,
  etiquetaAccesible,
}: {
  titulo: string;
  alPresionar: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: NombreIcono;
  estilo?: StyleProp<ViewStyle>;
  /** Botón tipo píldora pequeño (por ejemplo, "Abonar"); mantiene 44 px de alto. */
  compacto?: boolean;
  etiquetaAccesible?: string;
}) {
  const inactivo = deshabilitado || cargando;
  const aspecto = ESTILO_BOTON[variante];
  return (
    <Pressable
      onPress={alPresionar}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? titulo}
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      style={({ pressed }) => [
        estilos.boton,
        compacto && estilos.botonCompacto,
        { backgroundColor: pressed ? aspecto.presionado : aspecto.fondo },
        inactivo && { opacity: 0.5 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={aspecto.texto} />
      ) : (
        <View style={estilos.filaCentrada}>
          {icono && <Ionicons name={icono} size={18} color={aspecto.texto} style={{ marginRight: espacio.s }} />}
          <Text style={[estilos.textoBoton, compacto && { fontSize: 14 }, { color: aspecto.texto }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** Chip tipo píldora: activo con fondo negro y texto blanco; inactivo gris claro. */
export function Chip({
  texto,
  activo,
  alPresionar,
  icono,
  rol = 'button',
  deshabilitado,
  compacto,
}: {
  texto: string;
  activo?: boolean;
  alPresionar: () => void;
  icono?: NombreIcono;
  rol?: 'button' | 'radio' | 'tab';
  deshabilitado?: boolean;
  /** Menos relleno lateral (fila de secciones del encabezado), manteniendo 44 px de alto. */
  compacto?: boolean;
}) {
  return (
    <Pressable
      onPress={alPresionar}
      disabled={deshabilitado}
      accessibilityRole={rol}
      accessibilityLabel={texto}
      accessibilityState={{ selected: !!activo, disabled: !!deshabilitado }}
      style={({ pressed }) => [estilos.chip, compacto && { paddingHorizontal: 12 }, activo && estilos.chipActivo, pressed && !activo && { backgroundColor: colores.grisMedio }, deshabilitado && { opacity: 0.5 }]}
    >
      {icono && <Ionicons name={icono} size={16} color={activo ? colores.blanco : colores.texto} style={{ marginRight: 6 }} />}
      <Text style={[estilos.textoChip, activo && { color: colores.blanco }]}>{texto}</Text>
    </Pressable>
  );
}

// --- Formularios ---

export function Campo({
  etiqueta,
  error,
  ayuda,
  estilo,
  etiquetaPastilla,
  ...props
}: TextInputProps & {
  etiqueta: string;
  error?: string | null;
  ayuda?: string;
  estilo?: StyleProp<ViewStyle>;
  /** Muestra la etiqueta como pastilla (pantalla Cambiar contraseña). */
  etiquetaPastilla?: boolean;
}) {
  return (
    <View style={[{ marginBottom: espacio.m }, estilo]}>
      {etiquetaPastilla ? <Pastilla texto={etiqueta} estilo={{ marginBottom: espacio.s }} /> : <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <TextInput
        placeholderTextColor={colores.textoSecundario}
        {...props}
        style={[
          estilos.entrada,
          props.multiline && { minHeight: 110, textAlignVertical: 'top' },
          !!error && { borderColor: colores.peligro },
        ]}
        accessibilityLabel={etiqueta}
      />
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

/** Selector de una opción entre varias, en forma de chips. */
export function Opciones<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  desplazable,
}: {
  etiqueta?: string;
  opciones: { valor: T; texto: string }[];
  valor: T | null;
  alCambiar: (v: T) => void;
  /** true: una sola fila con desplazamiento horizontal. */
  desplazable?: boolean;
}) {
  const chips = opciones.map((o) => (
    <Chip key={String(o.valor)} texto={o.texto} activo={o.valor === valor} rol="radio" alPresionar={() => alCambiar(o.valor)} />
  ));
  return (
    <View style={{ marginBottom: espacio.m }}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      {desplazable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: espacio.s }}>
          {chips}
        </ScrollView>
      ) : (
        <View style={estilos.chips}>{chips}</View>
      )}
    </View>
  );
}

/**
 * Lista desplegable: un botón con el valor actual que abre un modal con las opciones.
 * (Funciona igual en Android, iOS y web, sin dependencias adicionales.)
 */
export function Desplegable<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
  compacto,
  etiquetaAccesible,
}: {
  etiqueta?: string;
  opciones: { valor: T; texto: string; deshabilitado?: boolean }[];
  valor: T | null;
  alCambiar: (v: T) => void;
  /** Versión pequeña (selectores de mes y año del calendario, periodo del resumen). */
  compacto?: boolean;
  etiquetaAccesible?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const insets = useSafeAreaInsets();
  const actual = opciones.find((o) => o.valor === valor);
  const nombre = etiquetaAccesible ?? etiqueta ?? 'Seleccionar';
  return (
    <View style={!compacto ? { marginBottom: espacio.m } : undefined}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <Pressable
        onPress={() => setAbierto(true)}
        accessibilityRole="button"
        accessibilityLabel={`${nombre}: ${actual?.texto ?? 'sin seleccionar'}`}
        style={({ pressed }) => [compacto ? estilos.desplegableCompacto : estilos.entrada, estilos.filaEntre, pressed && { backgroundColor: colores.grisClaro }]}
      >
        <Text style={{ color: actual ? colores.texto : colores.textoSecundario, fontSize: compacto ? 14 : 16, fontWeight: compacto ? '600' : '400' }}>
          {actual?.texto ?? 'Seleccione…'}
        </Text>
        <Ionicons name="chevron-down" size={compacto ? 14 : 18} color={colores.texto} style={{ marginLeft: 6 }} />
      </Pressable>
      <Modal visible={abierto} transparent animationType="fade" onRequestClose={() => setAbierto(false)}>
        <Pressable style={estilos.velo} onPress={() => setAbierto(false)} accessibilityLabel="Cerrar lista">
          <Pressable style={[estilos.hojaOpciones, { marginBottom: insets.bottom }]} onPress={() => undefined}>
            <Text style={[estilos.subtitulo, { marginBottom: espacio.s }]}>{nombre}</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {opciones.map((o) => {
                const activo = o.valor === valor;
                return (
                  <Pressable
                    key={String(o.valor)}
                    disabled={o.deshabilitado}
                    onPress={() => {
                      alCambiar(o.valor);
                      setAbierto(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: activo, disabled: !!o.deshabilitado }}
                    style={({ pressed }) => [estilos.opcionLista, activo && { backgroundColor: colores.grisClaro }, pressed && { backgroundColor: colores.grisMedio }]}
                  >
                    <Text style={{ flex: 1, fontSize: 16, color: o.deshabilitado ? colores.textoTenue : colores.texto, fontWeight: activo ? '700' : '400' }}>
                      {o.texto}
                    </Text>
                    {activo && <Ionicons name="checkmark" size={20} color={colores.texto} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function Casilla({ marcada, alCambiar, children }: { marcada: boolean; alCambiar: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Pressable onPress={() => alCambiar(!marcada)} style={estilos.casillaFila} accessibilityRole="checkbox" accessibilityState={{ checked: marcada }}>
      <View style={[estilos.casilla, marcada && { backgroundColor: colores.negro, borderColor: colores.negro }]}>
        {marcada && <Ionicons name="checkmark" size={16} color={colores.blanco} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

// --- Insignias y avisos ---

export type Tono = 'info' | 'exito' | 'peligro' | 'advertencia' | 'neutro';

export const TONOS: Record<Tono, { fondo: string; texto: string }> = {
  info: { fondo: colores.infoClaro, texto: colores.info },
  exito: { fondo: colores.exitoClaro, texto: colores.exito },
  peligro: { fondo: colores.peligroClaro, texto: colores.peligro },
  advertencia: { fondo: colores.advertenciaClaro, texto: colores.advertencia },
  neutro: { fondo: colores.neutroClaro, texto: colores.neutroTexto },
};

export function Insignia({ texto, tono = 'info' }: { texto: string; tono?: Tono }) {
  return (
    <View style={[estilos.insignia, { backgroundColor: TONOS[tono].fondo }]}>
      <Text style={[estilos.textoInsignia, { color: TONOS[tono].texto }]}>{texto}</Text>
    </View>
  );
}

export function Aviso({ texto, tono = 'info', icono, children }: { texto?: string; tono?: Tono; icono?: NombreIcono; children?: React.ReactNode }) {
  const iconoPorTono: Record<Tono, NombreIcono> = {
    info: 'information-circle',
    exito: 'checkmark-circle',
    peligro: 'alert-circle',
    advertencia: 'warning',
    neutro: 'information-circle',
  };
  return (
    <View style={[estilos.aviso, { backgroundColor: TONOS[tono].fondo }]} accessibilityRole={tono === 'peligro' ? 'alert' : undefined}>
      <Ionicons name={icono ?? iconoPorTono[tono]} size={20} color={TONOS[tono].texto} style={{ marginRight: espacio.s, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {texto ? <Text style={{ color: TONOS[tono].texto, lineHeight: 20 }}>{texto}</Text> : null}
        {children}
      </View>
    </View>
  );
}

// --- Estados de carga, vacío y error ---

export function EstadoCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <View style={estilos.estado}>
      <ActivityIndicator size="large" color={colores.turquesa} />
      <Text style={[estilos.secundario, { marginTop: espacio.m }]}>{texto}</Text>
    </View>
  );
}

export function EstadoVacio({ texto, icono = 'file-tray-outline', children }: { texto: string; icono?: NombreIcono; children?: React.ReactNode }) {
  return (
    <View style={[estilos.estado, { minHeight: 180 }]}>
      <Ionicons name={icono} size={44} color={colores.textoTenue} />
      <Text style={[estilos.secundario, { marginTop: espacio.m, textAlign: 'center' }]}>{texto}</Text>
      {children}
    </View>
  );
}

export function EstadoError({ mensaje, alReintentar }: { mensaje: string; alReintentar?: () => void }) {
  return (
    <View style={estilos.estado}>
      <Ionicons name="cloud-offline-outline" size={44} color={colores.peligro} />
      <Text style={[estilos.secundario, { marginTop: espacio.m, textAlign: 'center', color: colores.peligro }]}>{mensaje}</Text>
      {alReintentar && <Boton titulo="Reintentar" variante="secundario" icono="refresh" alPresionar={alReintentar} estilo={{ marginTop: espacio.l }} />}
    </View>
  );
}

/** Muestra carga, error o el contenido, según el estado del hook useCarga. */
export function Contenido<T>({
  cargando,
  error,
  datos,
  alReintentar,
  children,
}: {
  cargando: boolean;
  error: string | null;
  datos: T | null;
  alReintentar: () => void;
  children: (datos: T) => React.ReactNode;
}) {
  if (cargando && datos === null) return <EstadoCarga />;
  if (error && datos === null) return <EstadoError mensaje={error} alReintentar={alReintentar} />;
  if (datos === null) return <EstadoCarga />;
  return (
    <>
      {error ? <Aviso tono="peligro" texto={error} /> : null}
      {children(datos)}
    </>
  );
}

export function Icono({ nombre, tamano = 20, color = colores.texto }: { nombre: NombreIcono; tamano?: number; color?: string }) {
  return <Ionicons name={nombre} size={tamano} color={color} />;
}

/** Renglón de lista con icono, texto y flecha (lista de PQRS, menú, conceptos de pago…). */
export function Renglon({
  titulo,
  detalle,
  icono,
  derecha,
  alPresionar,
  seleccionado,
  sinFlecha,
  etiquetaAccesible,
}: {
  titulo: string;
  detalle?: string;
  icono?: NombreIcono;
  derecha?: React.ReactNode;
  alPresionar?: () => void;
  seleccionado?: boolean;
  sinFlecha?: boolean;
  etiquetaAccesible?: string;
}) {
  const contenido = (
    <>
      {icono && (
        <View style={estilos.iconoRenglon}>
          <Ionicons name={icono} size={20} color={colores.texto} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={estilos.tituloRenglon} numberOfLines={2}>
          {titulo}
        </Text>
        {detalle ? <Text style={[estilos.secundario, { fontSize: 13 }]}>{detalle}</Text> : null}
      </View>
      {derecha}
      {alPresionar && !sinFlecha && <Ionicons name="arrow-forward" size={20} color={colores.texto} style={{ marginLeft: espacio.s }} />}
    </>
  );
  if (!alPresionar) return <View style={[estilos.renglon, seleccionado && estilos.renglonSeleccionado]}>{contenido}</View>;
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={etiquetaAccesible ?? titulo}
      accessibilityState={{ selected: !!seleccionado }}
      style={({ pressed }) => [estilos.renglon, seleccionado && estilos.renglonSeleccionado, pressed && { backgroundColor: colores.grisMedio }]}
    >
      {contenido}
    </Pressable>
  );
}

export const estilos = StyleSheet.create({
  pantalla: { padding: espacio.l, paddingBottom: espacio.xxl * 2, flexGrow: 1, backgroundColor: colores.fondo },
  pie: { padding: espacio.l, paddingTop: espacio.s, backgroundColor: colores.fondo, borderTopWidth: 1, borderTopColor: colores.borde },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    padding: espacio.l,
    marginBottom: espacio.m,
  },
  pastilla: {
    alignSelf: 'flex-start',
    backgroundColor: colores.grisClaro,
    borderRadius: radio.pildora,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  textoPastilla: { fontSize: 15, fontWeight: '700', color: colores.texto },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.s, gap: espacio.s },
  titulo: { fontSize: 22, fontWeight: '700', color: colores.texto, marginBottom: espacio.xs },
  subtitulo: { fontSize: 16, fontWeight: '700', color: colores.texto },
  secundario: { fontSize: 14, color: colores.textoSecundario, lineHeight: 20 },
  monto: { fontSize: 30, fontWeight: '800', color: colores.texto, letterSpacing: -0.5, marginVertical: espacio.xs },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: espacio.m },
  filaEtiqueta: { color: colores.textoSecundario, fontSize: 14 },
  filaValor: { color: colores.texto, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  boton: {
    borderRadius: radio.m,
    paddingVertical: 12,
    paddingHorizontal: espacio.l,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  botonCompacto: { alignSelf: 'flex-start', borderRadius: radio.pildora, minHeight: TACTIL_MIN, paddingVertical: 8, paddingHorizontal: 18 },
  filaCentrada: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  textoBoton: { fontSize: 16, fontWeight: '700' },
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto, marginBottom: 6 },
  entrada: {
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.textoTenue,
    borderRadius: radio.s,
    paddingHorizontal: espacio.m,
    paddingVertical: 11,
    minHeight: TACTIL_MIN,
    fontSize: 16,
    color: colores.texto,
  },
  desplegableCompacto: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colores.textoTenue,
    borderRadius: radio.s,
    paddingHorizontal: 10,
    minHeight: TACTIL_MIN,
  },
  errorCampo: { color: colores.peligro, fontSize: 13, marginTop: 4 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    minHeight: TACTIL_MIN,
    borderRadius: radio.pildora,
    backgroundColor: colores.grisClaro,
  },
  chipActivo: { backgroundColor: colores.negro },
  textoChip: { color: colores.texto, fontWeight: '600', fontSize: 14 },
  casillaFila: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: espacio.m, minHeight: TACTIL_MIN },
  casilla: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colores.textoSecundario,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: espacio.m,
    marginTop: 1,
  },
  insignia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radio.pildora, alignSelf: 'flex-start' },
  textoInsignia: { fontSize: 12, fontWeight: '700' },
  aviso: { flexDirection: 'row', padding: espacio.m, borderRadius: radio.m, marginBottom: espacio.m },
  estado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, minHeight: 260 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  velo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', alignItems: 'center' },
  hojaOpciones: {
    backgroundColor: colores.blanco,
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: radio.l,
    borderTopRightRadius: radio.l,
    padding: espacio.l,
  },
  opcionLista: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: espacio.m, borderRadius: radio.s },
  renglon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.grisClaro,
    borderRadius: radio.m,
    paddingHorizontal: espacio.m,
    paddingVertical: espacio.m,
    minHeight: 56,
    marginBottom: espacio.s,
  },
  renglonSeleccionado: { backgroundColor: colores.blanco, borderWidth: 2, borderColor: colores.negro },
  iconoRenglon: { width: 32, alignItems: 'center', marginRight: espacio.s },
  tituloRenglon: { fontSize: 15, fontWeight: '600', color: colores.texto },
});
