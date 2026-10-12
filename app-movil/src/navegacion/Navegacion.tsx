/**
 * Navegación de la app (React Navigation):
 * - Sin sesión: pila de autenticación (ingreso, activación, recuperación).
 * - Con sesión: pila principal cuyo primer elemento son las pestañas "Principal". Las pestañas no usan la
 *   barra estándar: el encabezado muestra ☰, "Convive", el avatar y los chips de secciones (Inicio, Pagos,
 *   Reservas, PQRS y General), y la barra inferior personalizada muestra Inicio, Visitas, Avisos y Perfil.
 */
import React from 'react';
import { DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { EstadoCarga } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { ActivarPantalla } from '../pantallas/auth/ActivarPantalla';
import { IngresoPantalla } from '../pantallas/auth/IngresoPantalla';
import { RecuperarPantalla } from '../pantallas/auth/RecuperarPantalla';
import { CambiarContrasenaPantalla } from '../pantallas/CambiarContrasenaPantalla';
import { GeneralPantalla } from '../pantallas/general/GeneralPantalla'; // @RF-09
import { InicioPantalla } from '../pantallas/InicioPantalla';
import { NotificacionesPantalla } from '../pantallas/NotificacionesPantalla'; // @RF-05
import { DetalleNoticiaPantalla } from '../pantallas/noticias/DetalleNoticiaPantalla'; // @RF-05
import { NoticiasPantalla } from '../pantallas/noticias/NoticiasPantalla'; // @RF-05
import { ConfirmacionPagoPantalla } from '../pantallas/pagos/ConfirmacionPagoPantalla'; // @RF-02
import { EfectuarPagoPantalla } from '../pantallas/pagos/EfectuarPagoPantalla'; // @RF-02
import { HistorialPagosPantalla } from '../pantallas/pagos/HistorialPagosPantalla'; // @RF-02
import { PagosPantalla } from '../pantallas/pagos/PagosPantalla'; // @RF-02
import { RealizarPagoPantalla } from '../pantallas/pagos/RealizarPagoPantalla'; // @RF-02
import { PerfilPantalla } from '../pantallas/PerfilPantalla';
import { DetallePqrsPantalla } from '../pantallas/pqrs/DetallePqrsPantalla'; // @RF-04
import { NuevaPqrsPantalla } from '../pantallas/pqrs/NuevaPqrsPantalla'; // @RF-04
import { PqrsListaPantalla } from '../pantallas/pqrs/PqrsListaPantalla'; // @RF-04
import { MisReservasPantalla } from '../pantallas/reservas/MisReservasPantalla'; // @RF-03
import { ReservasPantalla } from '../pantallas/reservas/ReservasPantalla'; // @RF-03
import { DetalleVisitaPantalla } from '../pantallas/visitas/DetalleVisitaPantalla'; // @RF-06
import { NuevaVisitaPantalla } from '../pantallas/visitas/NuevaVisitaPantalla'; // @RF-06
import { VisitasPantalla } from '../pantallas/visitas/VisitasPantalla'; // @RF-06
import { colores } from '../tema';
import { BarraInferior, EncabezadoFlujo, EncabezadoPrincipal, esGestion } from './Encabezados';
import { RutasApp, RutasAuth, RutasPrincipal } from './tipos';

const PilaAuth = createNativeStackNavigator<RutasAuth>();
const PilaApp = createNativeStackNavigator<RutasApp>();
const Pestanas = createBottomTabNavigator<RutasPrincipal>();

const tema: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, primary: colores.texto, background: colores.fondo, card: colores.fondo, text: colores.texto, border: colores.borde },
};

const opcionesEncabezado: NativeStackNavigationOptions = {
  headerTitleStyle: { fontWeight: '700', color: colores.texto },
  headerTitleAlign: 'center',
  headerTintColor: colores.texto,
  headerStyle: { backgroundColor: colores.fondo },
  headerShadowVisible: false,
  headerBackTitle: 'Atrás',
  contentStyle: { backgroundColor: colores.fondo },
};

function PestanasPrincipales() {
  const { perfil } = useAuth();
  return (
    <Pestanas.Navigator
      tabBar={(props) => <BarraInferior {...props} />}
      screenOptions={({ route }) => ({
        header: () => <EncabezadoPrincipal rutaActiva={route.name} />,
        sceneStyle: { backgroundColor: colores.fondo },
      })}
    >
      <Pestanas.Screen name="Inicio" component={InicioPantalla} options={{ title: 'Inicio' }} />
      <Pestanas.Screen name="Pagos" component={PagosPantalla} options={{ title: 'Pagos' }} />{/* @RF-02 */}
      <Pestanas.Screen name="Reservas" component={ReservasPantalla} options={{ title: 'Reservas' }} />{/* @RF-03 */}
      <Pestanas.Screen name="Pqrs" component={PqrsListaPantalla} options={{ title: 'PQRS' }} />{/* @RF-04 */}
      {/* #region @RF-09 */}
      {esGestion(perfil) && <Pestanas.Screen name="General" component={GeneralPantalla} options={{ title: 'General' }} />}
      {/* #endregion @RF-09 */}
      <Pestanas.Screen name="Visitas" component={VisitasPantalla} options={{ title: 'Mis visitas' }} />{/* @RF-06 */}
      <Pestanas.Screen name="Avisos" component={NotificacionesPantalla} options={{ title: 'Avisos' }} />{/* @RF-05 */}
      <Pestanas.Screen name="Perfil" component={PerfilPantalla} options={{ title: 'Mi perfil' }} />
    </Pestanas.Navigator>
  );
}

function PilaPrincipal() {
  return (
    <PilaApp.Navigator screenOptions={opcionesEncabezado}>
      <PilaApp.Screen name="Principal" component={PestanasPrincipales} options={{ headerShown: false, title: 'Convive' }} />
      {/* #region @RF-02 */}
      <PilaApp.Screen
        name="EfectuarPago"
        component={EfectuarPagoPantalla}
        options={({ navigation }) => ({ title: 'Efectuar pago', header: () => <EncabezadoFlujo alCancelar={() => navigation.goBack()} /> })}
      />
      <PilaApp.Screen
        name="RealizarPago"
        component={RealizarPagoPantalla}
        options={({ navigation }) => ({ title: 'Realizar pago', header: () => <EncabezadoFlujo alCancelar={() => navigation.popToTop()} /> })}
      />
      <PilaApp.Screen
        name="ConfirmacionPago"
        component={ConfirmacionPagoPantalla}
        options={{ title: 'Confirmación del pago', header: () => <EncabezadoFlujo />, gestureEnabled: false }}
      />
      <PilaApp.Screen name="HistorialPagos" component={HistorialPagosPantalla} options={{ title: 'Historial de pagos' }} />
      {/* #endregion @RF-02 */}
      <PilaApp.Screen name="MisReservas" component={MisReservasPantalla} options={{ title: 'Mis reservas' }} />{/* @RF-03 */}
      <PilaApp.Screen name="NuevaPqrs" component={NuevaPqrsPantalla} options={{ title: 'Nueva PQRS' }} />{/* @RF-04 */}
      <PilaApp.Screen name="DetallePqrs" component={DetallePqrsPantalla} options={{ title: 'Detalle de la PQRS' }} />{/* @RF-04 */}
      <PilaApp.Screen name="NuevaVisita" component={NuevaVisitaPantalla} options={{ title: 'Registrar visitante' }} />{/* @RF-06 */}
      <PilaApp.Screen name="DetalleVisita" component={DetalleVisitaPantalla} options={{ title: 'Código de acceso' }} />{/* @RF-06 */}
      <PilaApp.Screen name="Noticias" component={NoticiasPantalla} options={{ title: 'Noticias' }} />{/* @RF-05 */}
      <PilaApp.Screen name="DetalleNoticia" component={DetalleNoticiaPantalla} options={{ title: 'Noticia' }} />{/* @RF-05 */}
      <PilaApp.Screen name="CambiarContrasena" component={CambiarContrasenaPantalla} options={{ title: 'Cambiar contraseña' }} />
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
