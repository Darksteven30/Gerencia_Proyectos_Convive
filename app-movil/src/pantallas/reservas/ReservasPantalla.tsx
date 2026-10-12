/**
 * Reservas (RF-03): CU-21 consultar zonas comunes y su disponibilidad, CU-22 reservar
 * (las reglas de negocio las valida la API, CU-23). Diseño del mockup: chips de zona,
 * calendario mensual, franjas ocupadas del día elegido y botón "Agendar reserva".
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { reservas } from '../../api/servicios';
import type { FranjaOcupada, Zona } from '../../api/tipos';
import { Calendario } from '../../componentes/Calendario';
import { SelectorUnidad } from '../../componentes/SelectorUnidad';
import { Aviso, Boton, Campo, Contenido, EstadoVacio, Icono, Opciones, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useAuth } from '../../contexto/AuthContext';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio, radio, TACTIL_MIN } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { formatoCOP, formatoFecha, horaValida, hoyColombia, mascaraHora, minutos, sumarDias } from '../../utils/formato';

export function ReservasPantalla() {
  const navegacion = useNavegacion();
  const carga = useCarga(reservas.zonas, { alEnfocar: false });
  const [idZona, setIdZona] = useState<number | null>(null);

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(zonas) => {
          const activas = zonas.filter((z) => z.estado === 'ACTIVA');
          if (activas.length === 0) return <EstadoVacio texto="No hay zonas comunes disponibles para reservar." icono="business-outline" />;
          const zona = activas.find((z) => z.id_zona === idZona) ?? activas[0];
          return (
            <>
              <Tarjeta>
                <Text style={estilos.tituloTarjeta}>Zona</Text>
                <Opciones desplazable opciones={activas.map((z) => ({ valor: z.id_zona, texto: z.nombre }))} valor={zona.id_zona} alCambiar={setIdZona} />
                <InfoZona zona={zona} />
              </Tarjeta>
              <FormularioReserva key={zona.id_zona} zona={zona} alReservar={() => navegacion.navigate('MisReservas')} />
              <Boton titulo="Ver mis reservas" variante="secundario" icono="bookmark-outline" alPresionar={() => navegacion.navigate('MisReservas')} />
            </>
          );
        }}
      </Contenido>
    </Pantalla>
  );
}

function InfoZona({ zona }: { zona: Zona }) {
  const [verReglamento, setVerReglamento] = useState(false);
  return (
    <View>
      {zona.descripcion ? <TextoSecundario>{zona.descripcion}</TextoSecundario> : null}
      <View style={estilos.datosZona}>
        <Dato icono="time-outline" texto={`${zona.hora_apertura} a ${zona.hora_cierre}`} />
        <Dato icono="people-outline" texto={`Aforo ${zona.aforo_maximo}`} />
        <Dato icono="cash-outline" texto={zona.costo_reserva > 0 ? formatoCOP(zona.costo_reserva) : 'Sin costo'} />
        <Dato icono="hourglass-outline" texto={`Máx. ${zona.duracion_max_horas} h`} />
      </View>
      {zona.reglamento ? (
        <View style={estilos.reglamento}>
          <Pressable
            onPress={() => setVerReglamento((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: verReglamento }}
            style={estilos.cabeceraReglamento}
          >
            <Icono nombre="document-text-outline" tamano={18} />
            <Text style={{ flex: 1, marginLeft: espacio.s, fontWeight: '700', color: colores.texto }}>Reglamento de la zona</Text>
            <Icono nombre={verReglamento ? 'chevron-up' : 'chevron-down'} tamano={18} />
          </Pressable>
          {verReglamento && <Text style={{ color: colores.texto, lineHeight: 20, paddingBottom: espacio.s }}>{zona.reglamento}</Text>}
        </View>
      ) : null}
    </View>
  );
}

function Dato({ icono, texto }: { icono: React.ComponentProps<typeof Icono>['nombre']; texto: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Icono nombre={icono} tamano={15} color={colores.textoSecundario} />
      <Text style={{ color: colores.textoSecundario, fontSize: 13 }}>{texto}</Text>
    </View>
  );
}

function FormularioReserva({ zona, alReservar }: { zona: Zona; alReservar: () => void }) {
  const { perfil } = useAuth();
  const hoy = hoyColombia();
  const maximo = sumarDias(hoy, zona.anticipacion_max_dias);
  const [fecha, setFecha] = useState<string | null>(null);
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

  const cargarDisponibilidad = useCallback(
    async (f: string) => {
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
    },
    [zona.id_zona],
  );

  useEffect(() => {
    if (fecha) void cargarDisponibilidad(fecha);
  }, [fecha, cargarDisponibilidad]);

  const reservar = async () => {
    const e: Record<string, string> = {};
    if (!fecha) e.fecha = 'Elija el día en el calendario';
    if (!horaValida(horaInicio)) e.inicio = 'Use el formato HH:MM';
    if (!horaValida(horaFin)) e.fin = 'Use el formato HH:MM';
    else if (horaValida(horaInicio) && minutos(horaInicio) >= minutos(horaFin)) e.fin = 'Debe ser posterior a la hora de inicio';
    const n = Number(asistentes);
    if (!Number.isInteger(n) || n < 1) e.asistentes = 'Ingrese un número de asistentes válido';
    setErrores(e);
    if (Object.keys(e).length || !fecha) return;

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
      avisar('Reserva confirmada', `${zona.nombre} el ${formatoFecha(fecha)} de ${horaInicio} a ${horaFin}.${r.valor > 0 ? ` Valor: ${formatoCOP(r.valor)}.` : ''}`);
      setHoraInicio('');
      setHoraFin('');
      setObservaciones('');
      void cargarDisponibilidad(fecha);
      alReservar();
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
    <>
      <Tarjeta>
        <Calendario valor={fecha} alCambiar={setFecha} minimo={hoy} maximo={maximo} hoy={hoy} />
        <TextoSecundario estilo={{ fontSize: 12, marginTop: espacio.s }}>
          Puede reservar desde hoy hasta {formatoFecha(maximo)} ({zona.anticipacion_max_dias} días de anticipación).
        </TextoSecundario>
        {errores.fecha && <Text style={{ color: colores.peligro, marginTop: espacio.s }}>{errores.fecha}</Text>}
      </Tarjeta>

      {fecha && (
        <Tarjeta>
          <Text style={estilos.tituloTarjeta}>Disponibilidad del {formatoFecha(fecha)}</Text>
          {cargandoDisp && <ActivityIndicator color={colores.turquesa} />}
          {errorDisp && <Aviso tono="peligro" texto={errorDisp} />}
          {ocupado && !cargandoDisp && (
            <>
              {/* Línea de tiempo del día: en rojo lo reservado y en naranja los bloqueos */}
              <View style={estilos.linea} accessibilityLabel={`Horario de ${zona.hora_apertura} a ${zona.hora_cierre}`}>
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
                <Aviso tono="exito" texto="Todo el horario está libre este día." />
              ) : (
                <>
                  <Text style={{ fontWeight: '700', color: colores.texto, marginBottom: espacio.xs }}>Franjas ocupadas</Text>
                  {ocupado.map((o, i) => (
                    <View key={i} style={estilos.franja}>
                      <View style={[estilos.punto, { backgroundColor: o.tipo === 'BLOQUEO' ? colores.advertencia : colores.peligro }]} />
                      <Text style={{ fontWeight: '700', color: colores.texto, width: 110 }}>
                        {o.inicio} – {o.fin}
                      </Text>
                      <Text style={{ color: colores.textoSecundario, flex: 1 }}>{o.tipo === 'BLOQUEO' ? `Bloqueo: ${o.detalle ?? ''}` : o.detalle ?? 'Reservado'}</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          <View style={{ height: 1, backgroundColor: colores.borde, marginVertical: espacio.m }} />
          {errorApi && <Aviso tono="peligro" texto={errorApi} />}
          {perfil && <SelectorUnidad unidades={perfil.unidades} valor={idUnidad} alCambiar={setIdUnidad} />}
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
            maxLength={300}
            placeholder="Ej.: cumpleaños familiar"
          />
          <Boton titulo="Agendar reserva" compacto icono="calendar-outline" alPresionar={reservar} cargando={enviando} />
        </Tarjeta>
      )}
    </>
  );
}

const estilos = StyleSheet.create({
  tituloTarjeta: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: espacio.s },
  datosZona: { flexDirection: 'row', flexWrap: 'wrap', columnGap: espacio.m, rowGap: 4, marginTop: espacio.xs },
  reglamento: { backgroundColor: colores.grisClaro, borderRadius: radio.m, paddingHorizontal: espacio.m, marginTop: espacio.m },
  cabeceraReglamento: { flexDirection: 'row', alignItems: 'center', minHeight: TACTIL_MIN },
  linea: {
    height: 18,
    borderRadius: 9,
    backgroundColor: colores.exitoClaro,
    overflow: 'hidden',
    marginTop: espacio.xs,
    marginBottom: 4,
    position: 'relative',
  },
  bloque: { position: 'absolute', top: 0, bottom: 0, opacity: 0.85 },
  franja: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderTopWidth: 1, borderTopColor: colores.borde },
  punto: { width: 10, height: 10, borderRadius: 5, marginRight: espacio.s },
});
