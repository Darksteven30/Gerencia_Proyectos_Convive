/**
 * Almacenamiento seguro de los tokens:
 * - Android / iOS: expo-secure-store (Keystore / Keychain).
 * - Web: localStorage (expo-secure-store no está disponible en el navegador).
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AlmacenamientoTokens } from './cliente';

const almacenamientoWeb: AlmacenamientoTokens = {
  async obtener(clave) {
    try {
      return globalThis.localStorage?.getItem(clave) ?? null;
    } catch {
      return null;
    }
  },
  async guardar(clave, valor) {
    try {
      globalThis.localStorage?.setItem(clave, valor);
    } catch {
      // Navegación privada o almacenamiento bloqueado: la sesión dura solo mientras la pestaña esté abierta
    }
  },
  async borrar(clave) {
    try {
      globalThis.localStorage?.removeItem(clave);
    } catch {
      // Sin acceso al almacenamiento
    }
  },
};

const almacenamientoNativo: AlmacenamientoTokens = {
  obtener: (clave) => SecureStore.getItemAsync(clave),
  guardar: (clave, valor) => SecureStore.setItemAsync(clave, valor),
  borrar: (clave) => SecureStore.deleteItemAsync(clave),
};

export const almacenamientoPlataforma: AlmacenamientoTokens = Platform.OS === 'web' ? almacenamientoWeb : almacenamientoNativo;
