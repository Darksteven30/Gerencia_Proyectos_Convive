/**
 * CU-05 Activar cuenta por invitación + CU-06 Aceptar el tratamiento de datos personales (Ley 1581 de 2012).
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { auth } from '../../api/servicios';
import { Aviso, Boton, Campo, Casilla, Pantalla, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import type { PropsAuth } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { contrasenaSegura, correoValido } from '../../utils/formato';

export const TEXTO_POLITICA_DATOS =
  'En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013, el conjunto residencial, como responsable del ' +
  'tratamiento, recolecta sus datos personales (identificación, contacto, unidad, pagos, reservas, PQRS y registro de ' +
  'visitantes) con la finalidad exclusiva de administrar la copropiedad, comunicarse con usted y controlar el acceso. ' +
  'Sus datos no se venden ni se comparten con terceros, salvo obligación legal. Como titular, usted puede conocer, ' +
  'actualizar, rectificar y solicitar la supresión de sus datos, así como revocar esta autorización, mediante una PQRS ' +
  'o comunicándose con la administración.';

export function ActivarPantalla({ navigation }: PropsAuth<'Activar'>) {
  const [correo, setCorreo] = useState('');
  const [codigo, setCodigo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const activar = async () => {
    const e: Record<string, string> = {};
    if (!correoValido(correo)) e.correo = 'Ingrese un correo válido';
    if (codigo.trim().length < 4) e.codigo = 'Ingrese el código de invitación';
    if (!contrasenaSegura(contrasena)) e.contrasena = 'Mínimo 8 caracteres, una mayúscula y un número';
    if (contrasena !== confirmacion) e.confirmacion = 'Las contraseñas no coinciden';
    if (!acepta) e.acepta = 'Debe aceptar la política de tratamiento de datos para activar la cuenta';
    setErrores(e);
    if (Object.keys(e).length) return;

    setEnviando(true);
    setErrorApi(null);
    try {
      const r = await auth.activar(correo, codigo, contrasena);
      avisar('Cuenta activada', r.mensaje ?? 'Ya puede iniciar sesión.');
      navigation.navigate('Ingreso');
    } catch (err) {
      setErrorApi(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla estilo={{ maxWidth: 560, width: '100%', alignSelf: 'center' }}>
      <TextoSecundario estilo={{ marginBottom: espacio.l }}>
        Ingrese el correo registrado por la administración y el código de invitación que recibió. Luego cree su contraseña.
      </TextoSecundario>
      <Tarjeta>
        {errorApi && <Aviso tono="peligro" texto={errorApi} />}
        <Campo
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="nombre@correo.com"
          error={errores.correo}
        />
        <Campo
          etiqueta="Código de invitación"
          value={codigo}
          onChangeText={(t) => setCodigo(t.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Ej.: A1B2C3D4"
          error={errores.codigo}
        />
        <Campo
          etiqueta="Nueva contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          autoCapitalize="none"
          textContentType="newPassword"
          ayuda="Mínimo 8 caracteres, una mayúscula y un número"
          error={errores.contrasena}
        />
        <Campo
          etiqueta="Confirmar contraseña"
          value={confirmacion}
          onChangeText={setConfirmacion}
          secureTextEntry
          autoCapitalize="none"
          error={errores.confirmacion}
        />

        <Subtitulo estilo={{ marginTop: espacio.s, marginBottom: espacio.s }}>Tratamiento de datos personales</Subtitulo>
        <View style={{ backgroundColor: colores.primarioSuave, borderRadius: radio.m, padding: espacio.m }}>
          <Text style={{ color: colores.texto, fontSize: 13, lineHeight: 19 }}>{TEXTO_POLITICA_DATOS}</Text>
        </View>
        <Casilla marcada={acepta} alCambiar={setAcepta}>
          <Text style={{ color: colores.texto, lineHeight: 20 }}>
            He leído y acepto la política de tratamiento de datos personales (Ley 1581 de 2012).
          </Text>
        </Casilla>
        {errores.acepta && <Text style={{ color: colores.peligro, marginBottom: espacio.m }}>{errores.acepta}</Text>}

        <Boton titulo="Activar cuenta" icono="checkmark-circle-outline" alPresionar={activar} cargando={enviando} deshabilitado={!acepta} />
      </Tarjeta>
    </Pantalla>
  );
}
