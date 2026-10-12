/**
 * CU-21 Disponibilidad del día y CU-22 Reservar zona común (las reglas las valida la API, CU-23).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { reservas } from '../../api/servicios';
import type { FranjaOcupada } from '../../api/tipos';
import { SelectorFecha } from '../../componentes/SelectorFecha';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';
import { Aviso, Boton, Campo, FilaDato, Pantalla, Seccion, Subtitulo, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import type { PropsApp } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { fechaValida, formatoCOP, formatoFecha, horaValida, hoyColombia, mascaraHora, minutos } from '../../utils/formato';

export function ReservarPantalla({ route, navigation }: PropsApp<'Reservar'>) {
  const { zona } = route.params;
  const { perfil } = useAuth();
  const [fecha, setFecha] = useState(hoyColombia());
  const [ocupado, setOcupado] = useState<FranjaOcupada[] | null>(null);
  const [cargandoDisp, setCargandoDisp] = useState(false);
  const [errorDisp, setErrorDisp] = useState<string | null>(null);
  const [horaInicio, setHoraInicio] = useState('');
  const [horaFin, setHoraFin] = useState('');
  const [asistentes, setAsistentes] = useState('1');
  const [observaciones, setObservaciones] = useState('');
  const [idUnidad, setIdUnidad] = useState<number | null>(perfil?.unidades[0]?.idUnidad ?? null);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cargarDisponibilidad = useCallback(async (f: string) => {
    setCargandoDisp(true);
    setErrorDisp(null);
    try {
      const d = await reservas.disponibilidad(zona.id_zona, f);
      setOcupado(d.ocupado);
    } catch (e) {
      setOcupado(null);
      setErrorDisp(mensajeError(e));
    } finally {
      setCargandoDisp(false);
    }
  }, [zona.id_zona]);

  useEffect(() => {
    if (fechaValida(fecha)) void cargarDisponibilidad(fecha);
    else setOcupado(null);
  }, [fecha, cargarDisponibilidad]);

  const reservar = async () => {
    const e: Record<string, string> = {};
    if (!fechaValida(fecha)) e.fecha = 'Fecha inválida (AAAA-MM-DD)';
    if (!horaValida(horaInicio)) e.inicio = 'Use el formato HH:MM';
    if (!horaValida(horaFin)) e.fin = 'Use el formato HH:MM';
    else if (horaValida(horaInicio) && minutos(horaInicio) >= minutos(horaFin)) e.fin = 'Debe ser posterior a la hora de inicio';
    const n = Number(asistentes);
    if (!Number.isInteger(n) || n < 1) e.asistentes = 'Ingrese un número de asistentes válido';
    setErrores(e);
    if (Object.keys(e).length) return;

    setEnviando(true);
    setErrorApi(null);
    try {
      const r = await reservas.crear({
        id_zona: zona.id_zona,
        id_unidad: idUnidad ?? undefined,
        fecha,
        hora_inicio: horaInicio,
        hora_fin: horaFin,
        numero_asistentes: n,
        observaciones: observaciones.trim() || undefined,
      });
      avisar(
        'Reserva confirmada',
        `${zona.nombre} el ${formatoFecha(fecha)} de ${horaInicio} a ${horaFin}.${r.valor > 0 ? ` Valor: ${formatoCOP(r.valor)}.` : ''}`,
      );
      navigation.replace('MisReservas');
    } catch (err) {
      // Errores de la API: franja ocupada, fuera de horario, aforo, anticipación, etc.
      setErrorApi(mensajeError(err));
      void cargarDisponibilidad(fecha);
    } finally {
      setEnviando(false);
    }
  };

  const apertura = minutos(zona.hora_apertura);
  const cierre = minutos(zona.hora_cierre);
  const rango = Math.max(1, cierre - apertura);

  return (
    <Pantalla>
      <Tarjeta>
        <Subtitulo>{zona.nombre}</Subtitulo>
        {zona.descripcion ? <TextoSecundario>{zona.descripcion}</TextoSecundario> : null}
        <View style={{ marginTop: espacio.s }}>
          <FilaDato etiqueta="Horario" valor={`${zona.hora_apertura} a ${zona.hora_cierre}`} />
          <FilaDato etiqueta="Aforo máximo" valor={`${zona.aforo_maximo} personas`} />
          <FilaDato etiqueta="Costo" valor={zona.costo_reserva > 0 ? formatoCOP(zona.costo_reserva) : 'Sin costo'} />
          <FilaDato etiqueta="Duración máxima" valor={`${zona.duracion_max_horas} hora(s)`} />
          <FilaDato etiqueta="Anticipación máxima" valor={`${zona.anticipacion_max_dias} día(s)`} />
        </View>
        {zona.reglamento ? (
          <View style={estilos.reglamento}>
            <Text style={{ fontWeight: '700', color: colores.texto, marginBottom: 4 }}>Reglamento</Text>
            <Text style={{ color: colores.texto, lineHeight: 20 }}>{zona.reglamento}</Text>
          </View>
        ) : null}
      </Tarjeta>

      <Seccion titulo="Disponibilidad">
        <Tarjeta>
          <SelectorFecha etiqueta="Fecha" valor={fecha} alCambiar={setFecha} dias={Math.min(zona.anticipacion_max_dias + 1, 14)} />
          {cargandoDisp && <ActivityIndicator color={colores.primario} />}
          {errorDisp && <Aviso tono="peligro" texto={errorDisp} />}
          {ocupado && !cargandoDisp && (
            <>
              {/* Línea de tiempo del día: en gris lo ocupado */}
              <View style={estilos.linea}>
                {ocupado.map((o, i) => {
                  const ini = Math.max(minutos(o.inicio), apertura);
                  const fin = Math.min(minutos(o.fin), cierre);
                  if (fin <= ini) return null;
                  return (
                    <View
                      key={i}
                      style={[
                        estilos.bloque,
                        {
                          left: `${((ini - apertura) / rango) * 100}%`,
                          width: `${((fin - ini) / rango) * 100}%`,
                          backgroundColor: o.tipo === 'BLOQUEO' ? colores.advertencia : colores.peligro,
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: espacio.m }}>
                <TextoSecundario estilo={{ fontSize: 12 }}>{zona.hora_apertura}</TextoSecundario>
                <TextoSecundario estilo={{ fontSize: 12 }}>{zona.hora_cierre}</TextoSecundario>
              </View>
              {ocupado.length === 0 ? (
                <Aviso tono="exito" texto={`Todo el horario está libre el ${formatoFecha(fecha)}.`} />
              ) : (
                <>
                  <Text style={{ fontWeight: '700', color: colores.texto, marginBottom: espacio.s }}>Franjas ocupadas</Text>
                  {ocupado.map((o, i) => (
                    <View key={i} style={estilos.franja}>
                      <View style={[estilos.punto, { backgroundColor: o.tipo === 'BLOQUEO' ? colores.advertencia : colores.peligro }]} />
                      <Text style={{ fontWeight: '700', color: colores.texto, width: 110 }}>
                        {o.inicio} – {o.fin}
                      </Text>
                      <Text style={{ color: colores.textoSecundario, flex: 1 }}>
                        {o.tipo === 'BLOQUEO' ? `Bloqueo: ${o.detalle ?? ''}` : o.detalle ?? 'Reservado'}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </Tarjeta>
      </Seccion>

      <Seccion titulo="Nueva reserva">
        <Tarjeta>
          {errorApi && <Aviso tono="peligro" texto={errorApi} />}
          {perfil && <SelectorUnidad unidades={perfil.unidades} valor={idUnidad} alCambiar={setIdUnidad} />}
          {errores.fecha && <Aviso tono="peligro" texto={errores.fecha} />}
          <View style={{ flexDirection: 'row', gap: espacio.m }}>
            <Campo
              etiqueta="Hora de inicio"
              value={horaInicio}
              onChangeText={(t) => setHoraInicio(mascaraHora(t))}
              keyboardType="number-pad"
              placeholder="HH:MM"
              maxLength={5}
              error={errores.inicio}
              estilo={{ flex: 1 }}
            />
            <Campo
              etiqueta="Hora de fin"
              value={horaFin}
              onChangeText={(t) => setHoraFin(mascaraHora(t))}
              keyboardType="number-pad"
              placeholder="HH:MM"
              maxLength={5}
              error={errores.fin}
              estilo={{ flex: 1 }}
            />
          </View>
          <Campo
            etiqueta="Número de asistentes"
            value={asistentes}
            onChangeText={(t) => setAsistentes(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={3}
            ayuda={`Máximo ${zona.aforo_maximo} personas`}
            error={errores.asistentes}
          />
          <Campo
            etiqueta="Observaciones (opcional)"
            value={observaciones}
            onChangeText={setObservaciones}
            multiline
            maxLength={300}
            placeholder="Ej.: cumpleaños familiar"
          />
          <Boton titulo="Confirmar reserva" icono="calendar-outline" alPresionar={reservar} cargando={enviando} />
        </Tarjeta>
      </Seccion>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  reglamento: { backgroundColor: colores.primarioSuave, borderRadius: radio.m, padding: espacio.m, marginTop: espacio.m },
  linea: {
    height: 18,
    borderRadius: 9,
    backgroundColor: colores.exitoClaro,
    overflow: 'hidden',
    marginTop: espacio.s,
    marginBottom: 4,
    position: 'relative',
  },
  bloque: { position: 'absolute', top: 0, bottom: 0, opacity: 0.85 },
  franja: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colores.borde },
  punto: { width: 10, height: 10, borderRadius: 5, marginRight: espacio.s },
});
