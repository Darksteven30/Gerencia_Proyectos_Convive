/**
 * CU-11 Consultar estado de cuenta (cuotas pendientes por unidad) y acceso al pago (CU-12, "Abonar"),
 * con el resumen del historial de pagos y la descarga del último comprobante (CU-14, CU-15).
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { mensajeError } from '../../api/cliente';
import { pagos } from '../../api/servicios';
import type { Cuota, Pago } from '../../api/tipos';
import { TarjetaEstadoCuenta } from '../../componentes/EstadoCuenta';
import { InsigniaEstado } from '../../componentes/InsigniaEstado';
import { Aviso, Boton, Contenido, EstadoVacio, Pastilla, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { useNavegacion } from '../../navegacion/tipos';
import { colores, espacio, radio } from '../../tema';
import { avisar } from '../../utils/dialogos';
import { descargarPdf } from '../../utils/descargas';
import { conceptoCorto, formatoCOP, formatoFecha, formatoMesCorto, formatoPeriodo } from '../../utils/formato';

const fechaPago = (p: Pago) => p.fecha_confirmacion ?? p.fecha_creacion;

export function PagosPantalla() {
  const navegacion = useNavegacion();
  const [descargando, setDescargando] = useState(false);
  const carga = useCarga(async () => {
    const [cuenta, historial] = await Promise.all([pagos.estadoCuenta(), pagos.historial()]);
    return { cuenta, historial: [...historial].sort((a, b) => fechaPago(b).localeCompare(fechaPago(a))) };
  });

  const descargar = async (p: Pago) => {
    setDescargando(true);
    try {
      await descargarPdf(pagos.rutaComprobante(p.id_pago), `comprobante-${p.comprobante ?? p.id_pago}.pdf`);
    } catch (e) {
      avisar('No se pudo descargar el comprobante', mensajeError(e));
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {({ cuenta, historial }) => {
          if (cuenta.length === 0) {
            return <EstadoVacio texto="No tiene unidades vinculadas. Comuníquese con la administración." icono="home-outline" />;
          }
          const aprobados = historial.filter((p) => p.estado === 'APROBADO');
          const ultimoConComprobante = aprobados.find((p) => p.comprobante);
          // Renglones "Ago 2026 — Cuota admón." de los pagos aprobados más recientes
          const renglones = aprobados.flatMap((p) => p.cuotas.map((c, i) => ({ clave: `${p.id_pago}-${i}`, ...c }))).slice(0, 5);
          return (
            <>
              <TarjetaEstadoCuenta cuenta={cuenta} alAbonar={() => navegacion.navigate('EfectuarPago')} />

              <Pastilla texto="Cuotas pendientes" estilo={{ marginTop: espacio.s, marginBottom: espacio.s }} />
              {cuenta.map((u) => (
                <View key={u.id_unidad} style={{ marginBottom: espacio.m }}>
                  {cuenta.length > 1 && <Text style={estilos.unidad}>{u.unidad}</Text>}
                  {u.cuotas.length === 0 ? (
                    <Aviso tono="exito" texto={`${u.unidad} está al día. No hay cuotas pendientes.`} />
                  ) : (
                    u.cuotas.map((c) => <FilaCuota key={c.id_cuota} cuota={c} />)
                  )}
                </View>
              ))}

              <Tarjeta>
                <Text style={estilos.tituloTarjeta}>Historial de pagos</Text>
                {renglones.length === 0 ? (
                  <TextoSecundario estilo={{ marginBottom: espacio.s }}>Aún no hay pagos aprobados.</TextoSecundario>
                ) : (
                  renglones.map((r) => (
                    <Text key={r.clave} style={estilos.renglonHistorial}>
                      {formatoMesCorto(r.periodo)} — {conceptoCorto(r.concepto)}
                      <Text style={{ color: colores.textoSecundario }}>  {formatoCOP(r.valor_aplicado)}</Text>
                    </Text>
                  ))
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s, marginTop: espacio.s }}>
                  {ultimoConComprobante && (
                    <Boton
                      titulo="Descargar comprobante"
                      compacto
                      icono="download-outline"
                      cargando={descargando}
                      alPresionar={() => descargar(ultimoConComprobante)}
                      etiquetaAccesible={`Descargar comprobante ${ultimoConComprobante.comprobante}`}
                    />
                  )}
                  <Boton titulo="Ver todo el historial" variante="texto" compacto alPresionar={() => navegacion.navigate('HistorialPagos')} />
                </View>
              </Tarjeta>
            </>
          );
        }}
      </Contenido>
    </Pantalla>
  );
}

function FilaCuota({ cuota }: { cuota: Cuota }) {
  const vencida = cuota.estado === 'VENCIDA';
  return (
    <View style={[estilos.cuota, vencida && estilos.cuotaVencida]}>
      <View style={{ flex: 1 }}>
        <Text style={estilos.periodo}>
          {formatoPeriodo(cuota.periodo)} · {conceptoCorto(cuota.concepto)}
        </Text>
        <Text style={[estilos.vence, vencida && { color: colores.peligro, fontWeight: '700' }]}>
          {vencida ? 'Venció' : 'Vence'} el {formatoFecha(cuota.fecha_vencimiento)}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={estilos.valor}>{formatoCOP(cuota.saldo)}</Text>
        <InsigniaEstado estado={cuota.estado} />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  unidad: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: espacio.s },
  tituloTarjeta: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: espacio.s },
  renglonHistorial: { fontSize: 15, color: colores.texto, paddingVertical: 5 },
  cuota: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.m,
    padding: espacio.m,
    marginBottom: espacio.s,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  cuotaVencida: { borderColor: colores.peligro, backgroundColor: '#FFF7F7', borderLeftWidth: 5 },
  periodo: { fontSize: 15, fontWeight: '600', color: colores.texto, textTransform: 'capitalize' },
  vence: { fontSize: 13, color: colores.textoSecundario, marginTop: 2 },
  valor: { fontSize: 15, fontWeight: '700', color: colores.texto },
});
