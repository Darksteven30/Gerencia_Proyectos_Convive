/**
 * General (RF-09, solo JUNTA o ADMINISTRADOR): resumen financiero y operativo del conjunto con datos de
 * GET /api/admin/resumen. El modelo de datos no registra gastos, por eso en lugar de "ingresos y egresos"
 * se muestran "Total recaudado" y "Cartera pendiente".
 */
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { admin } from '../../api/servicios';
import type { PeriodoResumen } from '../../api/tipos';
import { GraficoBarras, GraficoDona } from '../../componentes/Graficos';
import { Contenido, Desplegable, Icono, Monto, Pastilla, Pantalla, Tarjeta, TextoSecundario } from '../../componentes/ui';
import { useCarga } from '../../hooks/useCarga';
import { colores, espacio, radio } from '../../tema';
import { formatoCOP, formatoCOPCompleto, formatoCOPCorto, formatoMesCorto, formatoPeriodo } from '../../utils/formato';
import { CONCEPTOS_PAGO } from '../../utils/pasarela';

const PERIODOS: { valor: PeriodoResumen; texto: string }[] = [
  { valor: 'mes', texto: 'Este mes' },
  { valor: 'trimestre', texto: 'Últimos 3 meses' },
  { valor: 'semestre', texto: 'Últimos 6 meses' },
  { valor: 'anio', texto: 'Último año' },
];

/** "ORDINARIA" → "Cuota de administración", etc. */
function nombreConcepto(concepto: string): string {
  if (concepto === 'MULTA') return 'Multas';
  if (concepto === 'INTERES_MORA') return 'Intereses de mora';
  return CONCEPTOS_PAGO.find((g) => g.conceptos.includes(concepto))?.nombre ?? concepto;
}

const cantidad = (v: number) => v.toLocaleString('es-CO');

export function GeneralPantalla() {
  const [periodo, setPeriodo] = useState<PeriodoResumen>('mes');
  const carga = useCarga(() => admin.resumen(periodo));

  // Al cambiar el periodo se vuelve a consultar (useCarga siempre usa la función del último render)
  const primerRender = useRef(true);
  const { recargar } = carga;
  useEffect(() => {
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    void recargar();
  }, [periodo, recargar]);

  return (
    <Pantalla refrescando={carga.refrescando} alRefrescar={carga.refrescar}>
      <Pastilla texto="Resumen financiero" />
      <View style={{ alignSelf: 'flex-start', marginTop: espacio.s, marginBottom: espacio.m }}>
        <Desplegable compacto etiquetaAccesible="Periodo" opciones={PERIODOS} valor={periodo} alCambiar={setPeriodo} />
      </View>

      <Contenido cargando={carga.cargando} error={carga.error} datos={carga.datos} alReintentar={carga.recargar}>
        {(r) => {
          const porcentaje = r.facturado_periodo > 0 ? Math.min(1, r.recaudo_periodo / r.facturado_periodo) : 0;
          return (
            <>
              <Tarjeta>
                <Text style={estilos.etiqueta}>Recaudo del periodo</Text>
                <Monto>{formatoCOPCompleto(r.recaudo_periodo)}</Monto>
                <TextoSecundario estilo={{ fontSize: 13 }}>
                  {r.desde === r.hasta ? formatoPeriodo(r.desde) : `${formatoMesCorto(r.desde)} a ${formatoMesCorto(r.hasta)}`} · facturado{' '}
                  {formatoCOP(r.facturado_periodo)}
                </TextoSecundario>
                {r.facturado_periodo > 0 && (
                  <View style={{ marginTop: espacio.s }}>
                    <View style={estilos.barraProgreso} accessibilityLabel={`${Math.round(porcentaje * 100)} % de lo facturado ya se recaudó`}>
                      <View style={[estilos.relleno, { width: `${porcentaje * 100}%` }]} />
                    </View>
                    <Text style={{ fontSize: 12, color: colores.textoSecundario, marginTop: 4 }}>{Math.round(porcentaje * 100)} % de lo facturado</Text>
                  </View>
                )}
              </Tarjeta>

              <View style={{ flexDirection: 'row', gap: espacio.m }}>
                <TarjetaIndicador icono="arrow-up" color={colores.graficoRecaudado} titulo="Total recaudado" valor={formatoCOPCompleto(r.recaudo_periodo)} />
                <TarjetaIndicador icono="arrow-down" color={colores.peligro} titulo="Cartera pendiente" valor={formatoCOPCompleto(r.cartera_pendiente)} />
              </View>

              <Tarjeta>
                <Text style={estilos.tituloGrafico}>Movimiento de fondos</Text>
                <GraficoBarras
                  etiquetas={r.movimientos.map((m) => formatoMesCorto(m.mes))}
                  series={[
                    { nombre: 'Recaudado', color: colores.graficoRecaudado },
                    { nombre: 'Pendiente', color: colores.graficoPendiente },
                  ]}
                  valores={r.movimientos.map((m) => [m.recaudado, m.pendiente])}
                  formatoEje={formatoCOPCorto}
                  formatoValor={formatoCOP}
                />
              </Tarjeta>

              <Tarjeta>
                <Text style={estilos.tituloGrafico}>Recaudo por concepto</Text>
                <GraficoDona
                  datos={r.recaudo_por_concepto.map((d) => ({ nombre: nombreConcepto(d.nombre), valor: d.valor }))}
                  formatoValor={formatoCOPCorto}
                  textoCentro="recaudado"
                  textoVacio="No hubo recaudo en el periodo."
                />
              </Tarjeta>

              <Tarjeta>
                <Text style={estilos.tituloGrafico}>Categorías de PQRS</Text>
                <GraficoDona
                  datos={r.pqrs_por_categoria.map((d) => ({ nombre: d.nombre, valor: d.cantidad }))}
                  formatoValor={cantidad}
                  textoCentro="solicitudes"
                  textoVacio="No se radicaron PQRS en el periodo."
                />
              </Tarjeta>

              <Tarjeta>
                <Text style={estilos.tituloGrafico}>Reservas por zona común</Text>
                <GraficoDona
                  datos={r.reservas_por_zona.map((d) => ({ nombre: d.nombre, valor: d.cantidad }))}
                  formatoValor={cantidad}
                  textoCentro="reservas"
                  textoVacio="No hubo reservas en el periodo."
                />
              </Tarjeta>
            </>
          );
        }}
      </Contenido>
    </Pantalla>
  );
}

function TarjetaIndicador({ icono, color, titulo, valor }: { icono: 'arrow-up' | 'arrow-down'; color: string; titulo: string; valor: string }) {
  return (
    <Tarjeta estilo={{ flex: 1, padding: espacio.m }}>
      <View style={[estilos.circuloIcono, { backgroundColor: color }]}>
        <Icono nombre={icono} tamano={16} color={colores.blanco} />
      </View>
      <Text style={[estilos.etiqueta, { marginTop: espacio.s }]}>{titulo}</Text>
      <Text style={estilos.valorIndicador} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: 14, fontWeight: '600', color: colores.texto },
  tituloGrafico: { fontSize: 15, fontWeight: '700', color: colores.texto, marginBottom: espacio.m },
  circuloIcono: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  valorIndicador: { fontSize: 16, fontWeight: '800', color: colores.texto, marginTop: 2 },
  barraProgreso: { height: 8, borderRadius: radio.pildora, backgroundColor: colores.grisClaro, overflow: 'hidden' },
  relleno: { height: '100%', backgroundColor: colores.graficoRecaudado, borderRadius: radio.pildora },
});
