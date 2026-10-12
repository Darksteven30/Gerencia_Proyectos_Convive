/**
 * CU-41 Pre-registrar visitante (la API genera el código QR de acceso, CU-42).
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { visitas } from '../../api/servicios';
import type { NuevaVisita } from '../../api/tipos';
import { SelectorFecha } from '../../componentes/SelectorFecha';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';
import { Aviso, Boton, Campo, Opciones, Pantalla, Seccion, Tarjeta } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import type { PropsApp } from '../../navegacion/tipos';
import { espacio } from '../../tema';
import { fechaValida, horaValida, hoyColombia, mascaraHora, minutos } from '../../utils/formato';

type TipoDoc = NuevaVisita['tipo_documento'];

export function NuevaVisitaPantalla({ navigation }: PropsApp<'NuevaVisita'>) {
  const { perfil } = useAuth();
  const [tipoDocumento, setTipoDocumento] = useState<TipoDoc>('CC');
  const [documento, setDocumento] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [placa, setPlaca] = useState('');
  const [fecha, setFecha] = useState(hoyColombia());
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [motivo, setMotivo] = useState('');
  const [idUnidad, setIdUnidad] = useState<number | null>(perfil?.unidades[0]?.idUnidad ?? null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const guardar = async () => {
    const e: Record<string, string> = {};
    if (documento.trim().length < 4) e.documento = 'Ingrese el número de documento (mínimo 4 caracteres)';
    if (nombres.trim().length < 2) e.nombres = 'Ingrese los nombres';
    if (apellidos.trim().length < 2) e.apellidos = 'Ingrese los apellidos';
    if (placa && !/^[A-Z0-9-]{5,10}$/.test(placa)) e.placa = 'Placa inválida (ej.: ABC123)';
    if (!fechaValida(fecha)) e.fecha = 'Fecha inválida (AAAA-MM-DD)';
    if (!horaValida(desde)) e.desde = 'Use el formato HH:MM';
    if (!horaValida(hasta)) e.hasta = 'Use el formato HH:MM';
    else if (horaValida(desde) && minutos(desde) >= minutos(hasta)) e.hasta = 'Debe ser posterior a la hora inicial';
    setErrores(e);
    if (Object.keys(e).length) return;

    setEnviando(true);
    setErrorApi(null);
    try {
      const visita = await visitas.crear({
        id_unidad: idUnidad ?? undefined,
        tipo_documento: tipoDocumento,
        numero_documento: documento.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        telefono: telefono.trim() || undefined,
        placa_vehiculo: placa.trim() || undefined,
        fecha_programada: fecha,
        hora_desde: desde,
        hora_hasta: hasta,
        motivo: motivo.trim() || undefined,
      });
      navigation.replace('DetalleVisita', { visita });
    } catch (err) {
      setErrorApi(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      {errorApi && <Aviso tono="peligro" texto={errorApi} />}
      <Seccion titulo="Datos del visitante">
        <Tarjeta>
          {perfil && <SelectorUnidad unidades={perfil.unidades} valor={idUnidad} alCambiar={setIdUnidad} />}
          <Opciones<TipoDoc>
            etiqueta="Tipo de documento"
            opciones={[
              { valor: 'CC', texto: 'C.C.' },
              { valor: 'CE', texto: 'C.E.' },
              { valor: 'PA', texto: 'Pasaporte' },
              { valor: 'TI', texto: 'T.I.' },
            ]}
            valor={tipoDocumento}
            alCambiar={setTipoDocumento}
          />
          <Campo
            etiqueta="Número de documento"
            value={documento}
            onChangeText={(t) => setDocumento(tipoDocumento === 'PA' ? t.toUpperCase() : t.replace(/\D/g, ''))}
            keyboardType={tipoDocumento === 'PA' ? 'default' : 'number-pad'}
            autoCapitalize="characters"
            maxLength={20}
            error={errores.documento}
          />
          <Campo etiqueta="Nombres" value={nombres} onChangeText={setNombres} autoCapitalize="words" maxLength={80} error={errores.nombres} />
          <Campo etiqueta="Apellidos" value={apellidos} onChangeText={setApellidos} autoCapitalize="words" maxLength={80} error={errores.apellidos} />
          <Campo
            etiqueta="Teléfono (opcional)"
            value={telefono}
            onChangeText={(t) => setTelefono(t.replace(/[^\d+ ]/g, ''))}
            keyboardType="phone-pad"
            maxLength={20}
            placeholder="3001234567"
          />
          <Campo
            etiqueta="Placa del vehículo (opcional)"
            value={placa}
            onChangeText={(t) => setPlaca(t.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            placeholder="ABC123"
            ayuda="Si llega en vehículo, la portería le asignará un parqueadero de visitantes"
            error={errores.placa}
          />
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Fecha y franja autorizada">
        <Tarjeta>
          <SelectorFecha etiqueta="Fecha de la visita" valor={fecha} alCambiar={setFecha} />
          {errores.fecha && <Aviso tono="peligro" texto={errores.fecha} />}
          <View style={{ flexDirection: 'row', gap: espacio.m }}>
            <Campo
              etiqueta="Desde"
              value={desde}
              onChangeText={(t) => setDesde(mascaraHora(t))}
              keyboardType="number-pad"
              placeholder="HH:MM"
              maxLength={5}
              error={errores.desde}
              estilo={{ flex: 1 }}
            />
            <Campo
              etiqueta="Hasta"
              value={hasta}
              onChangeText={(t) => setHasta(mascaraHora(t))}
              keyboardType="number-pad"
              placeholder="HH:MM"
              maxLength={5}
              error={errores.hasta}
              estilo={{ flex: 1 }}
            />
          </View>
          <Campo etiqueta="Motivo (opcional)" value={motivo} onChangeText={setMotivo} maxLength={150} placeholder="Ej.: visita familiar" />
          <Boton titulo="Generar código QR" icono="qr-code-outline" estilo={{ marginTop: espacio.s }} alPresionar={guardar} cargando={enviando} />
        </Tarjeta>
      </Seccion>
    </Pantalla>
  );
}
