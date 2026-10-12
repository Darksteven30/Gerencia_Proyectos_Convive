/**
 * Rutas de la navegación y sus parámetros.
 *
 * Jerarquía con sesión:
 *   PilaApp (pila)
 *   ├─ Principal (pestañas con barra inferior personalizada)
 *   │   ├─ Inicio · Pagos · Reservas · Pqrs · General   ← chips superiores (General solo JUNTA/ADMINISTRADOR)
 *   │   └─ Visitas · Avisos · Perfil                     ← iconos de la barra inferior (Inicio lleva a la sección Inicio)
 *   └─ Pantallas de pila: flujo de pago en 3 pasos, detalles, formularios y Cambiar contraseña.
 *
 * Desde cualquier pantalla, para ir a una pestaña se usa navigate('Principal', { screen: 'Pagos' }).
 */
import { CompositeNavigationProp, NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Visita } from '../api/tipos';

export type RutasAuth = {
  Ingreso: undefined;
  Activar: undefined;
  Recuperar: undefined;
};

export type RutasPrincipal = {
  Inicio: undefined;
  Pagos: undefined;
  Reservas: undefined;
  Pqrs: undefined;
  General: undefined;
  Visitas: undefined;
  Avisos: undefined;
  Perfil: undefined;
};

/** Secciones que se muestran como chips en el encabezado. */
export type Seccion = 'Inicio' | 'Pagos' | 'Reservas' | 'Pqrs' | 'General';

/** Medio de pago elegido en el paso 2 (la pasarela de pruebas es la misma para los tres). */
export type MedioPago = 'PSE' | 'TARJETA' | 'BILLETERA';

export const NOMBRE_MEDIO: Record<MedioPago, string> = {
  PSE: 'PSE',
  TARJETA: 'Tarjeta de crédito/débito',
  BILLETERA: 'Nequi/Daviplata',
};

export type RutasApp = {
  Principal: NavigatorScreenParams<RutasPrincipal>;
  // Flujo de pago en 3 pasos
  EfectuarPago: undefined;
  RealizarPago: { idUnidad: number; cuotas: number[]; concepto: string; valor: number };
  ConfirmacionPago: { idPago: number; checkoutUrl: string; referencia: string; concepto: string; medio: MedioPago };
  HistorialPagos: undefined;
  MisReservas: undefined;
  NuevaPqrs: undefined;
  DetallePqrs: { idPqrs: number };
  NuevaVisita: undefined;
  DetalleVisita: { visita: Visita };
  Noticias: undefined;
  DetalleNoticia: { idNoticia: number };
  CambiarContrasena: undefined;
};

export type PropsApp<R extends keyof RutasApp> = NativeStackScreenProps<RutasApp, R>;
export type PropsAuth<R extends keyof RutasAuth> = NativeStackScreenProps<RutasAuth, R>;

/** Navegación disponible desde cualquier pantalla (pestañas y pila principal). */
export type NavegacionApp = CompositeNavigationProp<BottomTabNavigationProp<RutasPrincipal>, NativeStackNavigationProp<RutasApp>>;

/** Hook tipado para navegar desde componentes que no reciben `navigation` como propiedad. */
export const useNavegacion = () => useNavigation<NavegacionApp>();

/**
 * Lleva a una pestaña del navegador principal desde cualquier nivel de la jerarquía.
 * `pop: true` hace que, si se llama desde una pantalla de la pila, se regrese a "Principal" en vez de apilar otra copia.
 */
export function irAPestana(navegacion: Pick<NativeStackNavigationProp<RutasApp>, 'navigate'>, pestana: keyof RutasPrincipal) {
  navegacion.navigate('Principal', { screen: pestana }, { pop: true });
}
