/**
 * CU-01 Iniciar sesión.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, API_URL, mensajeError } from '../../api/cliente';
import { Aviso, Boton, Campo, Icono, Pantalla, Tarjeta } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import type { PropsAuth } from '../../navegacion/tipos';
import { colores, espacio } from '../../tema';
import { correoValido } from '../../utils/formato';

export function IngresoPantalla({ navigation }: PropsAuth<'Ingreso'>) {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ texto: string; bloqueada: boolean } | null>(null);

  const ingresar = async () => {
    if (!correoValido(correo)) return setError({ texto: 'Ingrese un correo electrónico válido.', bloqueada: false });
    if (!contrasena) return setError({ texto: 'Ingrese su contraseña.', bloqueada: false });
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(correo, contrasena);
    } catch (e) {
      const bloqueada = e instanceof ApiError && e.status === 423;
      setError({ texto: mensajeError(e), bloqueada });
      setEnviando(false);
    }
  };

  return (
    <Pantalla estilo={{ justifyContent: 'center', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      <View style={estilos.marca}>
        <View style={estilos.logo}>
          <Icono nombre="business" tamano={36} color={colores.blanco} />
        </View>
        <Text style={estilos.nombre}>Convive</Text>
        <Text style={estilos.lema}>Su conjunto residencial, en un solo lugar</Text>
      </View>

      <Tarjeta>
        {error && (
          <Aviso
            tono={error.bloqueada ? 'advertencia' : 'peligro'}
            icono={error.bloqueada ? 'lock-closed' : undefined}
            texto={error.bloqueada ? `${error.texto} Si olvidó su contraseña, puede restablecerla.` : error.texto}
          />
        )}
        <Campo
          etiqueta="Correo electrónico"
          value={correo}
          onChangeText={setCorreo}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          placeholder="nombre@correo.com"
          returnKeyType="next"
        />
        <Campo
          etiqueta="Contraseña"
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          placeholder="Su contraseña"
          returnKeyType="go"
          onSubmitEditing={ingresar}
        />
        <Boton titulo="Ingresar" icono="log-in-outline" alPresionar={ingresar} cargando={enviando} />
        <Boton titulo="¿Olvidó su contraseña?" variante="texto" alPresionar={() => navigation.navigate('Recuperar')} estilo={{ marginTop: espacio.s }} />
      </Tarjeta>

      <Tarjeta>
        <Text style={{ color: colores.texto, fontWeight: '600', marginBottom: 4 }}>¿Recibió una invitación?</Text>
        <Text style={{ color: colores.textoSecundario, marginBottom: espacio.m }}>
          Active su cuenta con el código que le entregó la administración.
        </Text>
        <Boton titulo="Activar mi cuenta" variante="secundario" icono="key-outline" alPresionar={() => navigation.navigate('Activar')} />
      </Tarjeta>
      <Text style={estilos.servidor}>Servidor: {API_URL}</Text>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  marca: { alignItems: 'center', marginBottom: espacio.xl, marginTop: espacio.xl },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colores.primario,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.m,
  },
  nombre: { fontSize: 30, fontWeight: '800', color: colores.primarioOscuro },
  lema: { color: colores.textoSecundario, marginTop: 4, textAlign: 'center' },
  servidor: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: espacio.s },
});
