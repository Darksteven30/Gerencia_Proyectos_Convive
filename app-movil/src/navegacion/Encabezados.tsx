/**
 * Piezas de navegación con el estilo de los mockups:
 * - EncabezadoPrincipal: ☰ (menú lateral), título "Convive" centrado, avatar (perfil) y chips de secciones.
 * - MenuLateral: atajos a Mi perfil, Noticias, Mis visitas, Avisos, Historial de pagos, Mis reservas y Cerrar sesión.
 * - BarraInferior: Inicio, Visitas (QR), Avisos (con contador de no leídas) y Perfil.
 * - EncabezadoFlujo: "✕ Cancelar" + "Convive" + avatar, para los pasos del pago.
 */
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Perfil } from '../api/tipos';
import { Avatar } from '../componentes/Marca';
import { Chip, NombreIcono } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { useNotificaciones } from '../contexto/NotificacionesContext';
import { colores, espacio, TACTIL_MIN } from '../tema';
import { confirmar } from '../utils/dialogos';
import { irAPestana, RutasPrincipal, Seccion, useNavegacion } from './tipos';

/** true si el usuario puede ver la sección "General" (junta de administración o administrador). */
export function esGestion(perfil: Pick<Perfil, 'roles'> | null | undefined): boolean {
  return !!perfil?.roles.some((r) => r === 'JUNTA' || r === 'ADMINISTRADOR');
}

const SECCIONES: { ruta: Seccion; texto: string; soloGestion?: boolean }[] = [
  { ruta: 'Inicio', texto: 'Inicio' },
  { ruta: 'Pagos', texto: 'Pagos' },
  { ruta: 'Reservas', texto: 'Reservas' },
  { ruta: 'Pqrs', texto: 'PQRS' },
  { ruta: 'General', texto: 'General', soloGestion: true },
];

export const ES_SECCION = (ruta: string): ruta is Seccion => SECCIONES.some((s) => s.ruta === ruta);

function BotonIcono({ icono, etiqueta, alPresionar }: { icono: NombreIcono; etiqueta: string; alPresionar: () => void }) {
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [estilos.botonIcono, pressed && { backgroundColor: colores.grisClaro }]}
    >
      <Ionicons name={icono} size={26} color={colores.texto} />
    </Pressable>
  );
}

export function EncabezadoPrincipal({ rutaActiva }: { rutaActiva: keyof RutasPrincipal }) {
  const insets = useSafeAreaInsets();
  const navegacion = useNavegacion();
  const { perfil } = useAuth();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const mostrarChips = ES_SECCION(rutaActiva);
  const secciones = SECCIONES.filter((s) => !s.soloGestion || esGestion(perfil));

  return (
    <View style={[estilos.encabezado, { paddingTop: insets.top }]}>
      <View style={estilos.barraSuperior}>
        <BotonIcono icono="menu" etiqueta="Abrir menú" alPresionar={() => setMenuAbierto(true)} />
        <Text style={estilos.titulo} accessibilityRole="header">
          Convive
        </Text>
        <Avatar perfil={perfil} alPresionar={() => irAPestana(navegacion, 'Perfil')} />
      </View>
      {mostrarChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={estilos.chips}
          accessibilityRole="tablist"
        >
          {secciones.map((s) => (
            <Chip key={s.ruta} compacto texto={s.texto} rol="tab" activo={rutaActiva === s.ruta} alPresionar={() => irAPestana(navegacion, s.ruta)} />
          ))}
        </ScrollView>
      )}
      <MenuLateral visible={menuAbierto} alCerrar={() => setMenuAbierto(false)} />
    </View>
  );
}

function MenuLateral({ visible, alCerrar }: { visible: boolean; alCerrar: () => void }) {
  const insets = useSafeAreaInsets();
  const navegacion = useNavegacion();
  const { perfil, cerrarSesion } = useAuth();
  const { noLeidas } = useNotificaciones(); // @RF-05

  const ir = (accion: () => void) => {
    alCerrar();
    accion();
  };

  const opciones: { texto: string; icono: NombreIcono; accion: () => void; contador?: number }[] = [
    { texto: 'Mi perfil', icono: 'person-outline', accion: () => irAPestana(navegacion, 'Perfil') },
    { texto: 'Noticias', icono: 'newspaper-outline', accion: () => navegacion.navigate('Noticias') }, // @RF-05
    { texto: 'Mis visitas', icono: 'qr-code-outline', accion: () => irAPestana(navegacion, 'Visitas') }, // @RF-06
    { texto: 'Avisos', icono: 'notifications-outline', accion: () => irAPestana(navegacion, 'Avisos'), contador: noLeidas }, // @RF-05
    { texto: 'Historial de pagos', icono: 'receipt-outline', accion: () => navegacion.navigate('HistorialPagos') }, // @RF-02
    { texto: 'Mis reservas', icono: 'calendar-outline', accion: () => navegacion.navigate('MisReservas') }, // @RF-03
  ];

  const salir = async () => {
    alCerrar();
    if (await confirmar('Cerrar sesión', '¿Desea cerrar la sesión en este dispositivo?', 'Cerrar sesión')) await cerrarSesion();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={alCerrar}>
      <View style={estilos.veloMenu}>
        <View style={[estilos.panelMenu, { paddingTop: insets.top + espacio.m, paddingBottom: insets.bottom + espacio.m }]} accessibilityViewIsModal>
          <View style={[estilos.fila, { marginBottom: espacio.l, paddingHorizontal: espacio.l }]}>
            <Avatar perfil={perfil} tamano={44} />
            <View style={{ flex: 1, marginLeft: espacio.m }}>
              <Text style={{ fontWeight: '700', fontSize: 16, color: colores.texto }} numberOfLines={1}>
                {perfil?.nombres} {perfil?.apellidos}
              </Text>
              <Text style={{ color: colores.textoSecundario, fontSize: 13 }} numberOfLines={1}>
                {perfil?.correo}
              </Text>
            </View>
          </View>
          <ScrollView>
            {opciones.map((o) => (
              <Pressable
                key={o.texto}
                onPress={() => ir(o.accion)}
                accessibilityRole="menuitem"
                accessibilityLabel={o.contador ? `${o.texto}, ${o.contador} sin leer` : o.texto}
                style={({ pressed }) => [estilos.opcionMenu, pressed && { backgroundColor: colores.grisClaro }]}
              >
                <Ionicons name={o.icono} size={22} color={colores.texto} />
                <Text style={estilos.textoMenu}>{o.texto}</Text>
                {!!o.contador && <Contador valor={o.contador} />}
              </Pressable>
            ))}
            <View style={{ height: 1, backgroundColor: colores.borde, marginVertical: espacio.s }} />
            <Pressable
              onPress={salir}
              accessibilityRole="menuitem"
              style={({ pressed }) => [estilos.opcionMenu, pressed && { backgroundColor: colores.peligroClaro }]}
            >
              <Ionicons name="log-out-outline" size={22} color={colores.peligro} />
              <Text style={[estilos.textoMenu, { color: colores.peligro }]}>Cerrar sesión</Text>
            </Pressable>
          </ScrollView>
        </View>
        <Pressable style={{ flex: 1 }} onPress={alCerrar} accessibilityRole="button" accessibilityLabel="Cerrar menú" />
      </View>
    </Modal>
  );
}

function Contador({ valor }: { valor: number }) {
  return (
    <View style={estilos.contador}>
      <Text style={estilos.textoContador}>{valor > 99 ? '99+' : valor}</Text>
    </View>
  );
}

/** Encabezado de los pasos del pago: "✕ Cancelar" (vuelve a donde empezó), "Convive" y avatar. */
export function EncabezadoFlujo({ alCancelar }: { alCancelar?: () => void }) {
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth();
  return (
    <View style={[estilos.encabezado, { paddingTop: insets.top }]}>
      <View style={estilos.barraSuperior}>
        <View style={{ width: 104 }}>
          {alCancelar && (
            <Pressable
              onPress={alCancelar}
              accessibilityRole="button"
              accessibilityLabel="Cancelar el pago"
              style={({ pressed }) => [estilos.cancelar, pressed && { backgroundColor: colores.grisClaro }]}
            >
              <Ionicons name="close" size={20} color={colores.texto} />
              <Text style={{ fontSize: 14, color: colores.texto, marginLeft: 2 }}>Cancelar</Text>
            </Pressable>
          )}
        </View>
        <Text style={estilos.titulo} accessibilityRole="header">
          Convive
        </Text>
        <View style={{ width: 104, alignItems: 'flex-end' }}>
          <Avatar perfil={perfil} />
        </View>
      </View>
    </View>
  );
}

const ICONOS_BARRA: { ruta: 'Inicio' | 'Visitas' | 'Avisos' | 'Perfil'; texto: string; icono: [NombreIcono, NombreIcono] }[] = [
  { ruta: 'Inicio', texto: 'Inicio', icono: ['home', 'home-outline'] },
  { ruta: 'Visitas', texto: 'Visitas', icono: ['qr-code', 'qr-code-outline'] }, // @RF-06
  { ruta: 'Avisos', texto: 'Avisos', icono: ['notifications', 'notifications-outline'] }, // @RF-05
  { ruta: 'Perfil', texto: 'Perfil', icono: ['person', 'person-outline'] },
];

/** Barra inferior: "Inicio" queda activo mientras se navega por las secciones de los chips. */
export function BarraInferior({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { noLeidas } = useNotificaciones(); // @RF-05
  const actual = state.routes[state.index]?.name ?? 'Inicio';
  const activa = ES_SECCION(actual) ? 'Inicio' : actual;

  return (
    <View style={[estilos.barraInferior, { paddingBottom: Math.max(insets.bottom, 6) }]} accessibilityRole="tablist">
      {ICONOS_BARRA.map((b) => {
        const enfocada = activa === b.ruta;
        const contador = b.ruta === 'Avisos' ? noLeidas : 0;
        return (
          <Pressable
            key={b.ruta}
            onPress={() => navigation.navigate(b.ruta)}
            accessibilityRole="tab"
            accessibilityState={{ selected: enfocada }}
            accessibilityLabel={contador ? `${b.texto}, ${contador} sin leer` : b.texto}
            style={estilos.botonBarra}
          >
            <View>
              <Ionicons name={b.icono[enfocada ? 0 : 1]} size={24} color={enfocada ? colores.texto : colores.textoSecundario} />
              {contador > 0 && (
                <View style={estilos.contadorBarra}>
                  <Text style={estilos.textoContador}>{contador > 99 ? '99+' : contador}</Text>
                </View>
              )}
            </View>
            <Text style={[estilos.textoBarra, enfocada && { color: colores.texto, fontWeight: '700' }]}>{b.texto}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  encabezado: { backgroundColor: colores.fondo },
  barraSuperior: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.s,
    minHeight: 56,
  },
  titulo: { fontSize: 18, fontWeight: '700', color: colores.texto, textAlign: 'center', flex: 1 },
  botonIcono: { width: TACTIL_MIN, height: TACTIL_MIN, borderRadius: TACTIL_MIN / 2, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 6, paddingHorizontal: espacio.m, paddingBottom: espacio.s, paddingTop: 2 },
  fila: { flexDirection: 'row', alignItems: 'center' },
  veloMenu: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)' },
  panelMenu: { width: 290, maxWidth: '82%', backgroundColor: colores.fondo, height: '100%' },
  opcionMenu: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: espacio.l },
  textoMenu: { flex: 1, marginLeft: espacio.m, fontSize: 16, color: colores.texto, fontWeight: '500' },
  contador: { backgroundColor: colores.peligro, borderRadius: 10, minWidth: 22, height: 20, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  contadorBarra: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: colores.peligro,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoContador: { color: colores.blanco, fontSize: 11, fontWeight: '700' },
  cancelar: { flexDirection: 'row', alignItems: 'center', minHeight: TACTIL_MIN, paddingHorizontal: espacio.s, borderRadius: 22 },
  barraInferior: {
    flexDirection: 'row',
    backgroundColor: colores.fondo,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingTop: 6,
  },
  botonBarra: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  textoBarra: { fontSize: 11, color: colores.textoSecundario, marginTop: 2 },
});
