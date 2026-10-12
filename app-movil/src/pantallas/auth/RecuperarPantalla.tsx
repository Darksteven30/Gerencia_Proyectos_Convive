/**
 * CU-03 Recuperar contraseña: solicitar el código y restablecer la contraseña.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { auth } from '../../api/servicios';
import { Logo } from '../../componentes/Marca';
import { Aviso, Boton, Campo, Pantalla, TextoSecundario } from '../../componentes/ui';
import { ListaRequisitos } from '../CambiarContrasenaPantalla';
import type { PropsAuth } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { contrasenaSegura, correoValido } from '../../utils/formato';

export function RecuperarPantalla({ navigation }: PropsAuth<'Recuperar'>) {
  const [paso, setPaso] = useState<1 | 2>(1);
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [codigoDemo, setCodigoDemo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const solicitar = async () => {
    if (!correoValido(correo)) return setError('Ingrese un correo electrónico válido.');
    setEnviando(true);
    setError(null);
    try {
      const r = await auth.recuperar(correo);
      setMensaje(r.mensaje ?? 'Si el correo está registrado, recibirá un código de recuperación.');
      setCodigoDemo(r.codigoDemo ?? null);
      setPaso(2);
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  const restablecer = async () => {
    if (codigo.trim().length < 4) return setError('Ingrese el código recibido.');
    if (!contrasenaSegura(contrasena)) return setError('La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.');
    if (contrasena !== confirmacion) return setError('Las contraseñas no coinciden.');
    setEnviando(true);
    setError(null);
    try {
      const r = await auth.restablecer(correo, codigo, contrasena);
      avisar('Contraseña actualizada', r.mensaje ?? 'Inicie sesión con la nueva contraseña.');
      navigation.navigate('Ingreso');
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla estilo={{ maxWidth: 480, width: '100%', alignSelf: 'center', paddingHorizontal: espacio.xl }}>
      <View style={{ alignItems: 'center', marginBottom: espacio.l }}>
        <Logo tamano={56} />
        <TextoSecundario estilo={{ textAlign: 'center', marginTop: espacio.m }}>
          {paso === 1
            ? 'Escriba el correo de su cuenta. Le enviaremos un código para crear una nueva contraseña.'
            : 'Ingrese el código recibido y su nueva contraseña.'}
        </TextoSecundario>
      </View>
      <View>
        {error && <Aviso tono="peligro" texto={error} />}
        {paso === 1 ? (
          <>
            <Campo
              etiqueta="Correo electrónico"
              value={correo}
              onChangeText={setCorreo}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="nombre@correo.com"
              onSubmitEditing={solicitar}
            />
            <Boton titulo="Enviar código" variante="oscuro" icono="mail-outline" alPresionar={solicitar} cargando={enviando} />
          </>
        ) : (
          <>
            {mensaje && <Aviso tono="info" texto={mensaje} />}
            {codigoDemo && (
              <Aviso tono="advertencia" icono="flask-outline">
                <Text style={{ color: colores.advertencia }}>
                  Modo de pruebas: su código es <Text style={{ fontWeight: '800', fontSize: 16 }}>{codigoDemo}</Text>
                </Text>
              </Aviso>
            )}
            <Campo
              etiqueta="Código de recuperación"
              value={codigo}
              onChangeText={(t) => setCodigo(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="Ej.: 4F2A9C"
            />
            <Campo
              etiqueta="Nueva contraseña"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <Campo etiqueta="Confirmar contraseña" value={confirmacion} onChangeText={setConfirmacion} secureTextEntry autoCapitalize="none" />
            <ListaRequisitos contrasena={contrasena} confirmacion={confirmacion} />
            <Boton titulo="Restablecer contraseña" icono="key-outline" alPresionar={restablecer} cargando={enviando} />
            <Boton titulo="Solicitar otro código" variante="texto" alPresionar={() => setPaso(1)} estilo={{ marginTop: espacio.s }} />
          </>
        )}
      </View>
    </Pantalla>
  );
}
