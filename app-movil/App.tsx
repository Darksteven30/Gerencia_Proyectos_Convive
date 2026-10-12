/**
 * Punto de entrada de la app móvil Convive (propietarios y residentes).
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/contexto/AuthContext';
import { NotificacionesProvider } from './src/contexto/NotificacionesContext'; // @RF-05
import { Navegacion } from './src/navegacion/Navegacion';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NotificacionesProvider> {/* @RF-05 */}
          <StatusBar style="dark" />
          <Navegacion />
        </NotificacionesProvider> {/* @RF-05 */}
      </AuthProvider>
    </SafeAreaProvider>
  );
}
