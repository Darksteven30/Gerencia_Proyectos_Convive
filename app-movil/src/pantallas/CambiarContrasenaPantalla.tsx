/**
 * CU-04 Cambiar contraseña (PUT /api/auth/me): contraseña actual, nueva y confirmación, con la lista
 * de requisitos que se marca en verde a medida que se cumplen.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { mensajeError } from '../api/cliente';
import { auth } from '../api/servicios';
import { Aviso, Boton, Campo, Icono, Pantalla } from '../componentes/ui';
import type { PropsApp } from '../navegacion/tipos';
import { colores, espacio, radio } from '../tema';
import { avisar } from '../utils/dialogos';
import { contrasenaSegura } from '../utils/formato';

/** Requisitos de la política de contraseñas de la API (mínimo 8 caracteres, una mayúscula y un número). */
export function requisitosContrasena(c: string) {
  return [
    { texto: 'Mínimo 8 caracteres', ok: c.length >= 8 },
    { texto: 'Una mayúscula', ok: /[A-Z]/.test(c) },
    { texto: 'Un número', ok: /\d/.test(c) },
  ];
}

export function ListaRequisitos({ contrasena, confirmacion }: { contrasena: string; confirmacion?: string }) {
  const lista = requisitosContrasena(contrasena);
  if (confirmacion !== undefined) lista.push({ texto: 'Las contraseñas coinciden', ok: !!contrasena && contrasena === confirmacion });
  return (
    <View style={{ backgroundColor: colores.grisClaro, borderRadius: radio.m, padding: espacio.m, marginBottom: espacio.m }}>
      {lista.map((r) => (
        <View key={r.texto} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }} accessibilityLabel={`${r.texto}: ${r.ok ? 'cumplido' : 'pendiente'}`}>
          <Icono nombre={r.ok ? 'checkmark' : 'ellipse-outline'} tamano={r.ok ? 18 : 10} color={r.ok ? colores.exito : colores.textoSecundario} />
          <Text style={{ marginLeft: 8, fontWeight: r.ok ? '700' : '500', color: r.ok ? colores.exito : colores.textoSecundario }}>{r.texto}</Text>
        </View>
      ))}
    </View>
  );
}

export function CambiarContrasenaPantalla({ navigation }: PropsApp<'CambiarContrasena'>) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!actual) return setError('Ingrese su contraseña actual.');
    if (!contrasenaSegura(nueva)) return setError('La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.');
    if (nueva !== confirmacion) return setError('Las contraseñas no coinciden.');
    setError(null);
    setGuardando(true);
    try {
      await auth.actualizarPerfil({ contrasenaActual: actual, contrasenaNueva: nueva });
      avisar('Contraseña actualizada', 'Use la nueva contraseña en su próximo ingreso.');
      navigation.goBack();
    } catch (e) {
      setError(mensajeError(e));
      setGuardando(false);
    }
  };

  return (
    <Pantalla pie={<Boton titulo="Guardar cambios" alPresionar={guardar} cargando={guardando} />}>
      {error && <Aviso tono="peligro" texto={error} />}
      <Campo etiquetaPastilla etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry autoCapitalize="none" autoComplete="current-password" />
      <Campo
        etiquetaPastilla
        etiqueta="Nueva contraseña"
        value={nueva}
        onChangeText={setNueva}
        secureTextEntry
        autoCapitalize="none"
        textContentType="newPassword"
        autoComplete="new-password"
      />
      <Campo etiquetaPastilla etiqueta="Confirmar nueva contraseña" value={confirmacion} onChangeText={setConfirmacion} secureTextEntry autoCapitalize="none" />
      <ListaRequisitos contrasena={nueva} confirmacion={confirmacion} />
    </Pantalla>
  );
}
