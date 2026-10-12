/**
 * Inicio: saludo, unidades, saldo pendiente, últimas noticias y accesos rápidos.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { noticias, pagos } from '../api/servicios';
import type { EstadoCuentaUnidad, Noticia } from '../api/tipos';
import { Boton, Contenido, Icono, Insignia, Pantalla, Seccion, Tarjeta, TextoSecundario } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { RutasApp, RutasPestanas, useNavegacion } from '../navegacion/tipos';
import { colores, espacio, radio } from '../tema';
import { formatoCOP, formatoFechaHora } from '../utils/formato';

type Acceso = {
  texto: string;
  icono: React.ComponentProps<typeof Icono>['nombre'];
  destino: keyof RutasPestanas | keyof RutasApp;
};

const ACCESOS: Acceso[] = [
  { texto: 'Pagar cuotas', icono: 'card-outline', destino: 'Pagos' }, // @RF-02
  { texto: 'Reservar zona', icono: 'calendar-outline', destino: 'Reservas' }, // @RF-03
  { texto: 'Mi perfil', icono: 'person-circle-outline', destino: 'Perfil' },
];

function saludo(): string {
  // Hora de Colombia (UTC-5)
  const h = (new Date().getUTCHours() + 24 - 5) % 24;
  if (h < 5) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function InicioPantalla() {
  const { perfil } = useAuth();
  const navegacion = useNavegacion();
  const carga = useCarga(async () => {
    let cuenta: EstadoCuentaUnidad[] = [];
    let ultimas: Noticia[] = [];
    cuenta = await pagos.estadoCuenta(); // @RF-02
    return { cuenta, noticias: ultimas };
  });

  const ir = (destino: Acceso['destino']) => (navegacion.navigate as (r: string) => void)(destino);

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <View style={estilos.encabezado}>
        <Text style={estilos.saludo}>
          {saludo()}, {perfil?.nombres}
        </Text>
        <TextoSecundario>{perfil?.conjunto?.nombre ?? 'Convive'}</TextoSecundario>
        <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, marginTop: espacio.s }]}>
          {perfil?.unidades.map((u) => (
            <Insignia key={u.idUnidad} texto={`${u.torre ? `${u.torre} - ` : ''}${u.numero} · ${u.tipoRelacion.toLowerCase()}`} />
          ))}
          {perfil && perfil.unidades.length === 0 && <Insignia texto="Sin unidad asignada" tono="neutro" />}
        </View>
      </View>

      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {({ cuenta, noticias: ultimas }) => {
          const saldo = cuenta.reduce((s, u) => s + u.saldo_total, 0);
          const vencidas = cuenta.reduce((s, u) => s + u.cuotas_vencidas, 0);
          return (
            <>
              {/* #region @RF-02 */}
              <Tarjeta estilo={estilos.saldo} alPresionar={() => ir('Pagos')}>
                <Text style={estilos.saldoEtiqueta}>Saldo pendiente</Text>
                <Text style={estilos.saldoValor}>{formatoCOP(saldo)}</Text>
                <Text style={estilos.saldoDetalle}>
                  {saldo === 0
                    ? '¡Está al día con la administración!'
                    : vencidas > 0
                      ? `${vencidas} cuota(s) vencida(s). Póngase al día para evitar intereses.`
                      : 'Toque para ver el detalle y pagar en línea.'}
                </Text>
              </Tarjeta>
              {/* #endregion @RF-02 */}

              <Seccion titulo="Accesos rápidos">
                <View style={estilos.rejilla}>
                  {ACCESOS.map((a) => (
                    <Pressable
                      key={a.texto}
                      onPress={() => ir(a.destino)}
                      style={({ pressed }) => [estilos.acceso, pressed && { opacity: 0.8 }]}
                      accessibilityRole="button"
                    >
                      <View style={estilos.iconoAcceso}>
                        <Icono nombre={a.icono} tamano={24} />
                      </View>
                      <Text style={estilos.textoAcceso}>{a.texto}</Text>
                    </Pressable>
                  ))}
                </View>
              </Seccion>

            </>
          );
        }}
      </Contenido>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  encabezado: { marginBottom: espacio.l },
  saludo: { fontSize: 24, fontWeight: '800', color: colores.texto },
  saldo: { backgroundColor: colores.primario, marginBottom: espacio.xl },
  saldoEtiqueta: { color: colores.primarioClaro, fontSize: 14, fontWeight: '600' },
  saldoValor: { color: colores.blanco, fontSize: 32, fontWeight: '800', marginVertical: 4 },
  saldoDetalle: { color: colores.primarioClaro, fontSize: 14 },
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m },
  acceso: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.l,
    paddingVertical: espacio.l,
    paddingHorizontal: espacio.s,
    alignItems: 'center',
    minWidth: 96,
  },
  iconoAcceso: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colores.primarioSuave,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.s,
  },
  textoAcceso: { fontSize: 13, fontWeight: '600', color: colores.texto, textAlign: 'center' },
  tituloNoticia: { fontSize: 16, fontWeight: '700', color: colores.texto, flex: 1, marginBottom: 4 },
});
