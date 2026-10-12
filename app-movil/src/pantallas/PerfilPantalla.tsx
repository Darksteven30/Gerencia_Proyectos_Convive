/**
 * CU-04 Gestionar perfil: datos, unidades, teléfono, contraseña y CU-02 cerrar sesión.
 */
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { API_URL, mensajeError } from '../api/cliente';
import { auth } from '../api/servicios';
import { nombreUnidad } from '../componentes/SelectorUnidad';
import { Aviso, Boton, Campo, EstadoCarga, FilaDato, Insignia, Pantalla, Seccion, Tarjeta, TextoSecundario } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { colores, espacio } from '../tema';
import { avisar, confirmar } from '../utils/dialogos';
import { contrasenaSegura, formatoFechaHora } from '../utils/formato';

export function PerfilPantalla() {
  const { perfil, recargarPerfil, cerrarSesion } = useAuth();
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [guardandoTel, setGuardandoTel] = useState(false);
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [errorClave, setErrorClave] = useState<string | null>(null);
  const [guardandoClave, setGuardandoClave] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [saliendo, setSaliendo] = useState(false);

  if (!perfil) return <EstadoCarga />;

  const guardarTelefono = async () => {
    const t = telefono.trim();
    if (t && !/^[+\d ]{7,20}$/.test(t)) return avisar('Teléfono inválido', 'Use solo números (7 a 20 dígitos).');
    setGuardandoTel(true);
    try {
      await auth.actualizarPerfil({ telefono: t });
      await recargarPerfil();
      avisar('Datos actualizados', 'Su teléfono se guardó correctamente.');
    } catch (e) {
      avisar('No se pudo guardar', mensajeError(e));
    } finally {
      setGuardandoTel(false);
    }
  };

  const cambiarClave = async () => {
    if (!actual) return setErrorClave('Ingrese su contraseña actual.');
    if (!contrasenaSegura(nueva)) return setErrorClave('La nueva contraseña debe tener mínimo 8 caracteres, una mayúscula y un número.');
    if (nueva !== confirmacion) return setErrorClave('Las contraseñas no coinciden.');
    setErrorClave(null);
    setGuardandoClave(true);
    try {
      await auth.actualizarPerfil({ contrasenaActual: actual, contrasenaNueva: nueva });
      setActual('');
      setNueva('');
      setConfirmacion('');
      avisar('Contraseña actualizada', 'Use la nueva contraseña en su próximo ingreso.');
    } catch (e) {
      setErrorClave(mensajeError(e));
    } finally {
      setGuardandoClave(false);
    }
  };

  const salir = async () => {
    if (!(await confirmar('Cerrar sesión', '¿Desea cerrar la sesión en este dispositivo?', 'Cerrar sesión'))) return;
    setSaliendo(true);
    await cerrarSesion();
  };

  const refrescar = async () => {
    setRefrescando(true);
    try {
      await recargarPerfil();
    } catch {
      // Se conserva el perfil mostrado
    } finally {
      setRefrescando(false);
    }
  };

  return (
    <Pantalla refrescando={refrescando} alRefrescar={refrescar}>
      <Tarjeta estilo={{ alignItems: 'center' }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colores.primario,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: espacio.m,
          }}
        >
          <Text style={{ color: colores.blanco, fontSize: 28, fontWeight: '800' }}>
            {(perfil.nombres[0] ?? '') + (perfil.apellidos[0] ?? '')}
          </Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colores.texto }}>
          {perfil.nombres} {perfil.apellidos}
        </Text>
        <TextoSecundario>{perfil.correo}</TextoSecundario>
        <View style={{ flexDirection: 'row', gap: espacio.s, marginTop: espacio.s }}>
          {perfil.roles.map((r) => (
            <Insignia key={r} texto={r.toLowerCase()} />
          ))}
        </View>
      </Tarjeta>

      <Seccion titulo="Mis datos">
        <Tarjeta>
          <FilaDato etiqueta="Documento" valor={`${perfil.tipoDocumento} ${perfil.numeroDocumento}`} />
          <FilaDato etiqueta="Conjunto" valor={perfil.conjunto?.nombre ?? '—'} />
          <FilaDato etiqueta="Último acceso" valor={formatoFechaHora(perfil.ultimoAcceso)} />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Mis unidades">
        {perfil.unidades.length === 0 ? (
          <Aviso tono="neutro" texto="No tiene unidades vinculadas." />
        ) : (
          perfil.unidades.map((u) => (
            <Tarjeta key={u.idUnidad}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colores.texto }}>{nombreUnidad(u)}</Text>
                <Insignia texto={u.tipoRelacion.toLowerCase()} tono="neutro" />
              </View>
              <TextoSecundario estilo={{ marginTop: 4 }}>
                {u.esResponsablePago ? 'Responsable de pago de la unidad' : 'Sin responsabilidad de pago'}
              </TextoSecundario>
            </Tarjeta>
          ))
        )}
      </Seccion>

      <Seccion titulo="Teléfono de contacto">
        <Tarjeta>
          <Campo
            etiqueta="Teléfono"
            value={telefono}
            onChangeText={(t) => setTelefono(t.replace(/[^\d+ ]/g, ''))}
            keyboardType="phone-pad"
            maxLength={20}
            placeholder="3001234567"
          />
          <Boton
            titulo="Guardar teléfono"
            variante="secundario"
            icono="save-outline"
            alPresionar={guardarTelefono}
            cargando={guardandoTel}
            deshabilitado={telefono.trim() === (perfil.telefono ?? '')}
          />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Cambiar contraseña">
        <Tarjeta>
          {errorClave && <Aviso tono="peligro" texto={errorClave} />}
          <Campo etiqueta="Contraseña actual" value={actual} onChangeText={setActual} secureTextEntry autoCapitalize="none" />
          <Campo
            etiqueta="Nueva contraseña"
            value={nueva}
            onChangeText={setNueva}
            secureTextEntry
            autoCapitalize="none"
            textContentType="newPassword"
            ayuda="Mínimo 8 caracteres, una mayúscula y un número"
          />
          <Campo etiqueta="Confirmar nueva contraseña" value={confirmacion} onChangeText={setConfirmacion} secureTextEntry autoCapitalize="none" />
          <Boton titulo="Actualizar contraseña" variante="secundario" icono="key-outline" alPresionar={cambiarClave} cargando={guardandoClave} />
        </Tarjeta>
      </Seccion>

      <Boton titulo="Cerrar sesión" variante="peligro" icono="log-out-outline" alPresionar={salir} cargando={saliendo} />
      <TextoSecundario estilo={{ textAlign: 'center', marginTop: espacio.l, fontSize: 12 }}>Convive 1.0.0 · Servidor: {API_URL}</TextoSecundario>
    </Pantalla>
  );
}
