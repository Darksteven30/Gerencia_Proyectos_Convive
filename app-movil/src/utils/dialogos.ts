/**
 * Diálogos que funcionan en Android, iOS y web.
 * (En react-native-web, Alert.alert no muestra nada; allí se usan window.alert y window.confirm.)
 */
import { Alert, Platform } from 'react-native';

export function avisar(titulo: string, mensaje?: string) {
  if (Platform.OS === 'web') {
    globalThis.alert?.(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
    return;
  }
  Alert.alert(titulo, mensaje);
}

export function confirmar(titulo: string, mensaje: string, textoAceptar = 'Aceptar'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(globalThis.confirm?.(`${titulo}\n\n${mensaje}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      titulo,
      mensaje,
      [
        { text: 'No', style: 'cancel', onPress: () => resolve(false) },
        { text: textoAceptar, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
