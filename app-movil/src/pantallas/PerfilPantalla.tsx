/**
 * CU-04 Gestionar perfil: datos personales, teléfono editable, unidades, acceso a "Cambiar contraseña"
 * y CU-02 cerrar sesión.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { API_URL, mensajeError } from '../api/cliente';
import { auth } from '../api/servicios';
import { Avatar } from '../componentes/Marca';
import { nombreUnidad } from '../componentes/SelectorUnidad';
import { Boton, Campo, EstadoCarga, FilaDato, Insignia, Pastilla, Pantalla, Renglon, Tarjeta, TextoSecundario } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { useNavegacion } from '../navegacion/tipos';
import { colores, espacio } from '../tema';
import { avisar, confirmar } from '../utils/dialogos';
import { etiquetaEstado, formatoFechaHora } from '../utils/formato';

export function PerfilPantalla() {
  const navegacion = useNavegacion();
  const { perfil, recargarPerfil, cerrarSesion } = useAuth();
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [guardandoTel, setGuardandoTel] = useState(false);
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

  const unidadPrincipal = perfil.unidades[0];
  // La API no expone la ciudad del conjunto a los habitantes: se muestra el nombre del conjunto
  const ubicacion = [unidadPrincipal ? nombreUnidad(unidadPrincipal) : null, perfil.conjunto?.nombre].filter(Boolean).join(' · ');

  return (
    <Pantalla refrescando={refrescando} alRefrescar={refrescar}>
      <View style={{ alignItems: 'center', marginBottom: espacio.l }}>
        <Avatar perfil={perfil} tamano={84} />
        <Text style={estilos.nombre}>
          {perfil.nombres} {perfil.apellidos}
        </Text>
        <TextoSecundario estilo={{ textAlign: 'center' }}>{ubicacion || 'Sin unidad asignada'}</TextoSecundario>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: espacio.s, marginTop: espacio.s }}>
          {perfil.roles.map((r) => (
            <Insignia key={r} texto={etiquetaEstado(r)} tono="neutro" />
          ))}
        </View>
      </View>

      <Pastilla texto="Datos personales" estilo={{ marginBottom: espacio.s }} />
      <Tarjeta estilo={{ backgroundColor: colores.grisClaro, borderColor: colores.grisClaro }}>
        <FilaDato etiqueta="Correo" valor={perfil.correo} />
        <FilaDato etiqueta="Documento" valor={`${perfil.tipoDocumento} ${perfil.numeroDocumento}`} />
        <FilaDato etiqueta="Unidad" valor={perfil.unidades.length ? perfil.unidades.map(nombreUnidad).join(', ') : '—'} />
        <FilaDato etiqueta="Conjunto" valor={perfil.conjunto?.nombre ?? '—'} />
        <FilaDato etiqueta="Último acceso" valor={formatoFechaHora(perfil.ultimoAcceso)} />
      </Tarjeta>
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
          compacto
          icono="save-outline"
          alPresionar={guardarTelefono}
          cargando={guardandoTel}
          deshabilitado={telefono.trim() === (perfil.telefono ?? '')}
        />
      </Tarjeta>

      {perfil.unidades.length > 0 && (
        <>
          <Pastilla texto="Mis unidades" estilo={{ marginBottom: espacio.s, marginTop: espacio.s }} />
          {perfil.unidades.map((u) => (
            <Tarjeta key={u.idUnidad}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colores.texto }}>{nombreUnidad(u)}</Text>
                <Insignia texto={etiquetaEstado(u.tipoRelacion)} tono="neutro" />
              </View>
              <TextoSecundario estilo={{ marginTop: 4 }}>{u.esResponsablePago ? 'Responsable de pago de la unidad' : 'Sin responsabilidad de pago'}</TextoSecundario>
            </Tarjeta>
          ))}
        </>
      )}

      <Pastilla texto="Seguridad" estilo={{ marginBottom: espacio.s, marginTop: espacio.s }} />
      <Renglon titulo="Cambiar contraseña" icono="key-outline" alPresionar={() => navegacion.navigate('CambiarContrasena')} />

      <Boton titulo="Cerrar sesión" variante="peligro" icono="log-out-outline" alPresionar={salir} cargando={saliendo} estilo={{ marginTop: espacio.l }} />
      <TextoSecundario estilo={{ textAlign: 'center', marginTop: espacio.l, fontSize: 12 }}>Convive 1.0.0 · Servidor: {API_URL}</TextoSecundario>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  nombre: { fontSize: 22, fontWeight: '800', color: colores.texto, marginTop: espacio.m, textAlign: 'center' },
});
