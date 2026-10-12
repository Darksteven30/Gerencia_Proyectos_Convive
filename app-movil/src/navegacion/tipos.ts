/**
 * Rutas de la navegación y sus parámetros.
 */
import { CompositeNavigationProp, NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Visita, Zona } from '../api/tipos';

export type RutasAuth = {
  Ingreso: undefined;
  Activar: undefined;
  Recuperar: undefined;
};

export type RutasPestanas = {
  Inicio: undefined;
  Pagos: undefined;
  Reservas: undefined;
  Pqrs: undefined;
  Visitas: undefined;
  Avisos: undefined;
};

export type RutasApp = {
  Pestanas: NavigatorScreenParams<RutasPestanas>;
  ResultadoPago: { idPago: number; checkoutUrl: string; referencia: string };
  HistorialPagos: undefined;
  Reservar: { zona: Zona };
  MisReservas: undefined;
  NuevaPqrs: undefined;
  DetallePqrs: { idPqrs: number };
  NuevaVisita: undefined;
  DetalleVisita: { visita: Visita };
  Noticias: undefined;
  DetalleNoticia: { idNoticia: number };
  Perfil: undefined;
};

export type PropsApp<R extends keyof RutasApp> = NativeStackScreenProps<RutasApp, R>;
export type PropsAuth<R extends keyof RutasAuth> = NativeStackScreenProps<RutasAuth, R>;

/** Navegación disponible desde cualquier pantalla (pestañas y pila principal). */
export type NavegacionApp = CompositeNavigationProp<BottomTabNavigationProp<RutasPestanas>, NativeStackNavigationProp<RutasApp>>;

/** Hook tipado para navegar desde componentes que no reciben `navigation` como propiedad. */
export const useNavegacion = () => useNavigation<NavegacionApp>();
