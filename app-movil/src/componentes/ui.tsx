/**
 * Componentes de interfaz reutilizables (tarjetas, botones, campos, insignias y estados).
 */
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colores, espacio, radio, sombra } from '../tema';

type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];

// --- Contenedores ---

/** Pantalla desplazable con relleno, ajuste del teclado y "jalar para refrescar" opcional. */
export function Pantalla({
  children,
  refrescando,
  alRefrescar,
  estilo,
}: {
  children: React.ReactNode;
  refrescando?: boolean;
  alRefrescar?: () => void;
  estilo?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colores.fondo }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[estilos.pantalla, estilo]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          alRefrescar ? (
            <RefreshControl refreshing={!!refrescando} onRefresh={alRefrescar} colors={[colores.primario]} tintColor={colores.primario} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function Tarjeta({ children, estilo, alPresionar }: { children: React.ReactNode; estilo?: StyleProp<ViewStyle>; alPresionar?: () => void }) {
  if (alPresionar) {
    return (
      <Pressable
        onPress={alPresionar}
        style={({ pressed }) => [estilos.tarjeta, pressed && { opacity: 0.85 }, estilo]}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[estilos.tarjeta, estilo]}>{children}</View>;
}

export function Seccion({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={{ marginBottom: espacio.l }}>
      <View style={estilos.encabezadoSeccion}>
        <Text style={estilos.tituloSeccion}>{titulo}</Text>
        {accion}
      </View>
      {children}
    </View>
  );
}

// --- Texto ---

export function Titulo({ children, estilo }: { children: React.ReactNode; estilo?: object }) {
  return <Text style={[estilos.titulo, estilo]}>{children}</Text>;
}

export function Subtitulo({ children, estilo }: { children: React.ReactNode; estilo?: object }) {
  return <Text style={[estilos.subtitulo, estilo]}>{children}</Text>;
}

export function TextoSecundario({ children, estilo, lineas }: { children: React.ReactNode; estilo?: object; lineas?: number }) {
  return (
    <Text style={[estilos.secundario, estilo]} numberOfLines={lineas}>
      {children}
    </Text>
  );
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

type VarianteBoton = 'primario' | 'secundario' | 'peligro' | 'texto';

export function Boton({
  titulo,
  alPresionar,
  variante = 'primario',
  cargando,
  deshabilitado,
  icono,
  estilo,
}: {
  titulo: string;
  alPresionar: () => void;
  variante?: VarianteBoton;
  cargando?: boolean;
  deshabilitado?: boolean;
  icono?: NombreIcono;
  estilo?: StyleProp<ViewStyle>;
}) {
  const inactivo = deshabilitado || cargando;
  const fondo = {
    primario: colores.primario,
    secundario: colores.primarioClaro,
    peligro: colores.peligroClaro,
    texto: 'transparent',
  }[variante];
  const color = {
    primario: colores.blanco,
    secundario: colores.primarioOscuro,
    peligro: colores.peligro,
    texto: colores.primario,
  }[variante];
  return (
    <Pressable
      onPress={alPresionar}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactivo, busy: !!cargando }}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: fondo },
        variante === 'texto' && { paddingVertical: espacio.s },
        inactivo && { opacity: 0.55 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={estilos.filaCentrada}>
          {icono && <Ionicons name={icono} size={18} color={color} style={{ marginRight: espacio.s }} />}
          <Text style={[estilos.textoBoton, { color }]}>{titulo}</Text>
        </View>
      )}
    </Pressable>
  );
}

// --- Formularios ---

export function Campo({
  etiqueta,
  error,
  ayuda,
  estilo,
  ...props
}: TextInputProps & { etiqueta: string; error?: string | null; ayuda?: string; estilo?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ marginBottom: espacio.m }, estilo]}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        style={[estilos.entrada, props.multiline && { minHeight: 110, textAlignVertical: 'top' }, !!error && { borderColor: colores.peligro }]}
        accessibilityLabel={etiqueta}
      />
      {error ? <Text style={estilos.errorCampo}>{error}</Text> : ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
}

/** Selector de una opción entre varias, en forma de "chips". */
export function Opciones<T extends string | number>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  etiqueta?: string;
  opciones: { valor: T; texto: string }[];
  valor: T | null;
  alCambiar: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: espacio.m }}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <View style={estilos.chips}>
        {opciones.map((o) => {
          const activo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              onPress={() => alCambiar(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: activo }}
              style={[estilos.chip, activo && estilos.chipActivo]}
            >
              <Text style={[estilos.textoChip, activo && { color: colores.blanco }]}>{o.texto}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Casilla({ marcada, alCambiar, children }: { marcada: boolean; alCambiar: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={() => alCambiar(!marcada)}
      style={estilos.casillaFila}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada }}
    >
      <View style={[estilos.casilla, marcada && { backgroundColor: colores.primario, borderColor: colores.primario }]}>
        {marcada && <Ionicons name="checkmark" size={16} color={colores.blanco} />}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

// --- Insignias y avisos ---

export type Tono = 'info' | 'exito' | 'peligro' | 'advertencia' | 'neutro';

const tonos: Record<Tono, { fondo: string; texto: string }> = {
  info: { fondo: colores.primarioClaro, texto: colores.primarioOscuro },
  exito: { fondo: colores.exitoClaro, texto: colores.exito },
  peligro: { fondo: colores.peligroClaro, texto: colores.peligro },
  advertencia: { fondo: colores.advertenciaClaro, texto: colores.advertencia },
  neutro: { fondo: colores.neutroClaro, texto: '#334155' },
};

export function Insignia({ texto, tono = 'info' }: { texto: string; tono?: Tono }) {
  return (
    <View style={[estilos.insignia, { backgroundColor: tonos[tono].fondo }]}>
      <Text style={[estilos.textoInsignia, { color: tonos[tono].texto }]}>{texto}</Text>
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
    <View style={[estilos.aviso, { backgroundColor: tonos[tono].fondo }]}>
      <Ionicons name={icono ?? iconoPorTono[tono]} size={20} color={tonos[tono].texto} style={{ marginRight: espacio.s, marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        {texto ? <Text style={{ color: tonos[tono].texto, lineHeight: 20 }}>{texto}</Text> : null}
        {children}
      </View>
    </View>
  );
}

// --- Estados de carga, vacío y error ---

export function EstadoCarga({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <View style={estilos.estado}>
      <ActivityIndicator size="large" color={colores.primario} />
      <Text style={[estilos.secundario, { marginTop: espacio.m }]}>{texto}</Text>
    </View>
  );
}

export function EstadoVacio({ texto, icono = 'file-tray-outline', children }: { texto: string; icono?: NombreIcono; children?: React.ReactNode }) {
  return (
    <View style={estilos.estado}>
      <Ionicons name={icono} size={48} color="#94A3B8" />
      <Text style={[estilos.secundario, { marginTop: espacio.m, textAlign: 'center' }]}>{texto}</Text>
      {children}
    </View>
  );
}

export function EstadoError({ mensaje, alReintentar }: { mensaje: string; alReintentar?: () => void }) {
  return (
    <View style={estilos.estado}>
      <Ionicons name="cloud-offline-outline" size={48} color={colores.peligro} />
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

export function Icono({ nombre, tamano = 20, color = colores.primario }: { nombre: NombreIcono; tamano?: number; color?: string }) {
  return <Ionicons name={nombre} size={tamano} color={color} />;
}

export const estilos = StyleSheet.create({
  pantalla: { padding: espacio.l, paddingBottom: espacio.xxl * 2, flexGrow: 1 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.l,
    padding: espacio.l,
    marginBottom: espacio.m,
    ...sombra,
  },
  encabezadoSeccion: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.s },
  tituloSeccion: { fontSize: 17, fontWeight: '700', color: colores.texto },
  titulo: { fontSize: 22, fontWeight: '700', color: colores.texto, marginBottom: espacio.xs },
  subtitulo: { fontSize: 16, fontWeight: '600', color: colores.texto },
  secundario: { fontSize: 14, color: colores.textoSecundario, lineHeight: 20 },
  filaDato: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, gap: espacio.m },
  filaEtiqueta: { color: colores.textoSecundario, fontSize: 14 },
  filaValor: { color: colores.texto, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  boton: {
    borderRadius: radio.m,
    paddingVertical: 14,
    paddingHorizontal: espacio.l,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  filaCentrada: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  textoBoton: { fontSize: 16, fontWeight: '600' },
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto, marginBottom: 6 },
  entrada: {
    backgroundColor: colores.blanco,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.m,
    paddingHorizontal: espacio.m,
    paddingVertical: 12,
    fontSize: 16,
    color: colores.texto,
  },
  errorCampo: { color: colores.peligro, fontSize: 13, marginTop: 4 },
  ayuda: { color: colores.textoSecundario, fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colores.primarioClaro,
    backgroundColor: colores.primarioSuave,
  },
  chipActivo: { backgroundColor: colores.primario, borderColor: colores.primario },
  textoChip: { color: colores.primarioOscuro, fontWeight: '600', fontSize: 14 },
  casillaFila: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: espacio.m },
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
  insignia: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
  textoInsignia: { fontSize: 12, fontWeight: '700' },
  aviso: { flexDirection: 'row', padding: espacio.m, borderRadius: radio.m, marginBottom: espacio.m },
  estado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, minHeight: 260 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
