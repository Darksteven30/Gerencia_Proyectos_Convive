/**
 * Registro opcional del token de notificaciones push (Expo).
 *
 * Solo se intenta en un dispositivo físico y cuando la app tiene un projectId de EAS.
 * Cualquier fallo se ignora: la bandeja de notificaciones dentro de la app es el mecanismo
 * principal. Expo Go en Android no soporta notificaciones push remotas desde el SDK 53, por
 * lo que allí ni siquiera se intenta.
 */
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { auth } from '../api/servicios';

export async function registrarNotificacionesPush(): Promise<void> {
  try {
    if (Platform.OS === 'web' || !Device.isDevice) return;
    const esExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (esExpoGo && Platform.OS === 'android') return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) return;

    // Se importa de forma diferida para no cargar el módulo cuando no se usa
    const Notifications = await import('expo-notifications');
    const permisos = await Notifications.getPermissionsAsync();
    let estado = permisos.status;
    if (estado !== 'granted') estado = (await Notifications.requestPermissionsAsync()).status;
    if (estado !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Convive',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await auth.registrarDispositivo(token, Platform.OS === 'ios' ? 'IOS' : 'ANDROID');
  } catch (e) {
    // Push no disponible en este entorno: se continúa sin él
    console.log('Notificaciones push no disponibles:', e instanceof Error ? e.message : e);
  }
}
