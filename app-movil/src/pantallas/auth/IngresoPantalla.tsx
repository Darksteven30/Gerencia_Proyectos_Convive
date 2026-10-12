/**
 * CU-01 Iniciar sesión, con el diseño del mockup "Sign In" (logo, "Convive", campos y botón negro).
 * El registro es solo por invitación de la administración (con aceptación de la Ley 1581 de 2012),
 * por eso no hay "Crear cuenta" ni ingreso con Google o Apple.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError, API_URL, mensajeError } from '../../api/cliente';
import { Logo } from '../../componentes/Marca';
import { Aviso, Boton, Campo, Pantalla } from '../../componentes/ui';
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
    <Pantalla estilo={estilos.contenedor}>
      <View style={estilos.marca}>
        <Logo tamano={84} />
        <Text style={estilos.nombre} accessibilityRole="header">
          Convive
        </Text>
        <Text style={estilos.subtitulo}>Ingrese a su cuenta</Text>
        <Text style={estilos.lema}>Use el correo y la contraseña de su cuenta en el conjunto residencial</Text>
      </View>

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
        placeholder="correo@dominio.com"
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
      <Boton titulo="Ingresar" variante="oscuro" alPresionar={ingresar} cargando={enviando} />
      <Boton titulo="¿Olvidó su contraseña?" variante="texto" alPresionar={() => navigation.navigate('Recuperar')} estilo={{ marginTop: espacio.xs }} />

      <View style={estilos.separador} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={estilos.linea} />
        <Text style={{ marginHorizontal: espacio.m, color: colores.textoSecundario }}>o</Text>
        <View style={estilos.linea} />
      </View>

      <Boton
        titulo="¿Recibió una invitación? Activar cuenta"
        variante="secundario"
        icono="mail-open-outline"
        alPresionar={() => navigation.navigate('Activar')}
      />

      <Text style={estilos.legal}>
        Al ingresar, acepta los <Text style={estilos.legalFuerte}>Términos de servicio</Text> y la{' '}
        <Text style={estilos.legalFuerte}>Política de tratamiento de datos personales</Text> (Ley 1581 de 2012).
      </Text>
      <Text style={estilos.servidor}>Servidor: {API_URL}</Text>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  contenedor: { justifyContent: 'center', maxWidth: 440, width: '100%', alignSelf: 'center', paddingHorizontal: espacio.xl },
  marca: { alignItems: 'center', marginBottom: espacio.xl, marginTop: espacio.xl },
  nombre: { fontSize: 26, fontWeight: '800', color: colores.texto, marginTop: espacio.m },
  subtitulo: { fontSize: 16, fontWeight: '700', color: colores.texto, marginTop: espacio.l },
  lema: { color: colores.textoSecundario, marginTop: 4, textAlign: 'center', lineHeight: 20 },
  separador: { flexDirection: 'row', alignItems: 'center', marginVertical: espacio.l },
  linea: { flex: 1, height: 1, backgroundColor: colores.borde },
  legal: { textAlign: 'center', color: colores.textoSecundario, fontSize: 12, lineHeight: 18, marginTop: espacio.xl },
  legalFuerte: { color: colores.texto, fontWeight: '600' },
  servidor: { textAlign: 'center', color: colores.textoSecundario, fontSize: 11, marginTop: espacio.s },
});
