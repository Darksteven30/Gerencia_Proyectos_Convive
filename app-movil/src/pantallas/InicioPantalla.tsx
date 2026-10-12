/**
 * Inicio: estado de la cuenta con "Abonar", acceso rápido, últimas noticias e "Informar novedad".
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { noticias, pagos } from '../api/servicios';
import type { EstadoCuentaUnidad, Noticia } from '../api/tipos';
import { TarjetaEstadoCuenta } from '../componentes/EstadoCuenta';
import { Boton, Chip, Contenido, Icono, Insignia, NombreIcono, Pantalla, Tarjeta, TextoSecundario } from '../componentes/ui';
import { useAuth } from '../contexto/AuthContext';
import { useCarga } from '../hooks/useCarga';
import { irAPestana, useNavegacion } from '../navegacion/tipos';
import { colores, espacio, TACTIL_MIN } from '../tema';

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
    ultimas = (await noticias.listar()).slice(0, 3); // @RF-05
    return { cuenta, noticias: ultimas };
  });

  const accesos: { texto: string; icono: NombreIcono; ir: () => void }[] = [
    { texto: 'Reservar zona', icono: 'calendar-outline', ir: () => irAPestana(navegacion, 'Reservas') }, // @RF-03
    { texto: 'Realizar PQR', icono: 'chatbubble-ellipses-outline', ir: () => navegacion.navigate('NuevaPqrs') }, // @RF-04
    { texto: 'Registrar visitante', icono: 'person-add-outline', ir: () => navegacion.navigate('NuevaVisita') }, // @RF-06
  ];

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <View style={{ marginBottom: espacio.m }}>
        <Text style={estilos.saludo}>
          {saludo()}, {perfil?.nombres}
        </Text>
        <TextoSecundario>{perfil?.conjunto?.nombre ?? 'Convive'}</TextoSecundario>
      </View>

      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {({ cuenta, noticias: ultimas }) => (
          <>
            {/* #region @RF-02 */}
            <TarjetaEstadoCuenta cuenta={cuenta} alAbonar={() => navegacion.navigate('EfectuarPago')} />
            {/* #endregion @RF-02 */}

            <Tarjeta>
              <Text style={estilos.tituloTarjeta}>Acceso rápido</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s }}>
                {accesos.map((a) => (
                  <Chip key={a.texto} texto={a.texto} icono={a.icono} alPresionar={a.ir} />
                ))}
              </View>
            </Tarjeta>

            {/* #region @RF-05 */}
            <Tarjeta>
              <View style={[estilos.filaEntre, { marginBottom: espacio.xs }]}>
                <Text style={estilos.tituloTarjeta}>Últimas noticias</Text>
                <Boton titulo="Ver todas" variante="texto" compacto alPresionar={() => navegacion.navigate('Noticias')} />
              </View>
              {ultimas.length === 0 ? (
                <TextoSecundario estilo={{ marginBottom: espacio.m }}>No hay noticias publicadas por ahora.</TextoSecundario>
              ) : (
                ultimas.map((n) => (
                  <Pressable
                    key={n.id_noticia}
                    onPress={() => navegacion.navigate('DetalleNoticia', { idNoticia: n.id_noticia })}
                    accessibilityRole="button"
                    accessibilityLabel={`Noticia: ${n.titulo}`}
                    style={({ pressed }) => [estilos.noticia, pressed && { backgroundColor: colores.grisClaro }]}
                  >
                    <Text style={estilos.tituloNoticia} numberOfLines={2}>
                      {n.titulo}
                    </Text>
                    {n.tipo === 'URGENTE' && <Insignia texto="Urgente" tono="peligro" />}
                    <Icono nombre="chevron-forward" tamano={18} color={colores.textoSecundario} />
                  </Pressable>
                ))
              )}
              <Boton
                titulo="Informar novedad"
                variante="secundario"
                compacto
                icono="megaphone-outline"
                alPresionar={() => navegacion.navigate('NuevaPqrs')} // @RF-04
                estilo={{ marginTop: espacio.s }}
              />
            </Tarjeta>
            {/* #endregion @RF-05 */}
          </>
        )}
      </Contenido>
    </Pantalla>
  );
}

const estilos = StyleSheet.create({
  saludo: { fontSize: 20, fontWeight: '800', color: colores.texto },
  tituloTarjeta: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: espacio.s },
  filaEntre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noticia: { flexDirection: 'row', alignItems: 'center', gap: espacio.s, minHeight: TACTIL_MIN, paddingVertical: 6, borderRadius: 6 },
  tituloNoticia: { flex: 1, fontSize: 15, color: colores.texto },
});
