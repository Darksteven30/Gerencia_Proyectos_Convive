/**
 * Navegación de la app (React Navigation):
 * - Sin sesión: pila de autenticación (ingreso, activación, recuperación).
 * - Con sesión: pila principal con las pestañas inferiores y las pantallas de detalle.
 */
import React from 'react';
import { Platform, Pressable } from 'react-native';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { EstadoCarga } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { ActivarPantalla } from '../pantallas/auth/ActivarPantalla';
import { IngresoPantalla } from '../pantallas/auth/IngresoPantalla';
import { RecuperarPantalla } from '../pantallas/auth/RecuperarPantalla';
import { InicioPantalla } from '../pantallas/InicioPantalla';
import { PerfilPantalla } from '../pantallas/PerfilPantalla';
import { colores } from '../tema';
import { RutasApp, RutasAuth, RutasPestanas, useNavegacion } from './tipos';

const PilaAuth = createNativeStackNavigator<RutasAuth>();
const PilaApp = createNativeStackNavigator<RutasApp>();
const Pestanas = createBottomTabNavigator<RutasPestanas>();

const tema: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colores.primario, background: colores.fondo, card: colores.blanco, text: colores.texto },
};

const opcionesEncabezado = {
  headerTitleStyle: { fontWeight: '700' as const, color: colores.texto },
  headerTintColor: colores.primario,
  headerShadowVisible: false,
  headerBackTitle: 'Atrás',
};

type NombreIcono = React.ComponentProps<typeof Ionicons>['name'];
const ICONOS: Record<keyof RutasPestanas, [NombreIcono, NombreIcono]> = {
  Inicio: ['home', 'home-outline'],
  Pagos: ['card', 'card-outline'],
  Reservas: ['calendar', 'calendar-outline'],
  Pqrs: ['chatbubbles', 'chatbubbles-outline'],
  Visitas: ['people', 'people-outline'],
  Avisos: ['notifications', 'notifications-outline'],
};

function BotonPerfil() {
  const navegacion = useNavegacion();
  return (
    <Pressable onPress={() => navegacion.navigate('Perfil')} hitSlop={10} style={{ marginHorizontal: 16 }} accessibilityLabel="Mi perfil">
      <Ionicons name="person-circle-outline" size={28} color={colores.primario} />
    </Pressable>
  );
}

function PestanasPrincipales() {
  return (
    <Pestanas.Navigator
      screenOptions={({ route }) => ({
        ...opcionesEncabezado,
        headerRight: () => <BotonPerfil />,
        tabBarActiveTintColor: colores.primario,
        tabBarInactiveTintColor: colores.textoSecundario,
        tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
        // En el navegador no hay área segura inferior: se da más alto a la barra para que no se corten las etiquetas
        tabBarStyle: Platform.OS === 'web' ? { height: 66, paddingTop: 4, paddingBottom: 6 } : undefined,
        tabBarIcon: ({ focused, color, size }) => <Ionicons name={ICONOS[route.name][focused ? 0 : 1]} size={size} color={color} />,
      })}
    >
      <Pestanas.Screen name="Inicio" component={InicioPantalla} options={{ title: 'Convive', tabBarLabel: 'Inicio' }} />
    </Pestanas.Navigator>
  );
}

function PilaPrincipal() {
  return (
    <PilaApp.Navigator screenOptions={opcionesEncabezado}>
      <PilaApp.Screen name="Pestanas" component={PestanasPrincipales} options={{ headerShown: false, title: 'Convive' }} />
      <PilaApp.Screen name="Perfil" component={PerfilPantalla} options={{ title: 'Mi perfil' }} />
    </PilaApp.Navigator>
  );
}

function PilaAutenticacion() {
  return (
    <PilaAuth.Navigator screenOptions={opcionesEncabezado}>
      <PilaAuth.Screen name="Ingreso" component={IngresoPantalla} options={{ headerShown: false, title: 'Ingresar' }} />
      <PilaAuth.Screen name="Activar" component={ActivarPantalla} options={{ title: 'Activar cuenta' }} />
      <PilaAuth.Screen name="Recuperar" component={RecuperarPantalla} options={{ title: 'Recuperar contraseña' }} />
    </PilaAuth.Navigator>
  );
}

export function Navegacion() {
  const { perfil, iniciando } = useAuth();
  if (iniciando) return <EstadoCarga texto="Iniciando Convive…" />;
  return (
    <NavigationContainer theme={tema} documentTitle={{ formatter: (opciones) => `${opciones?.title ?? 'Convive'} · Convive` }}>
      {perfil ? <PilaPrincipal /> : <PilaAutenticacion />}
    </NavigationContainer>
  );
}
