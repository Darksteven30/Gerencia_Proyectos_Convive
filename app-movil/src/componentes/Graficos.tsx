/**
 * Gráficos de la pantalla General dibujados con react-native-svg (sin librerías de gráficos),
 * para que se vean igual en Android, iOS y web.
 *
 * - GraficoBarras: barras agrupadas por mes (p. ej. recaudado frente a pendiente), con leyenda,
 *   eje Y con montos abreviados y detalle del mes al tocarlo.
 * - GraficoDona: dona con leyenda, valores y porcentajes; al tocar un segmento o su fila de la
 *   leyenda, el centro muestra ese dato. Más de 7 categorías se agrupan en "Otros".
 * Ambos incluyen estado vacío y una vista en tabla (accesibilidad: la identidad nunca depende solo del color).
 */
import React, { useState } from 'react';
import { LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as TextoSvg } from 'react-native-svg';
import { colores, espacio, TACTIL_MIN } from '../tema';
import { Icono } from './ui';

// --- Utilidades ---

/** Fuente del sistema para los textos SVG (en web, el SVG usaría una fuente con serifas por defecto). */
const FUENTE_SVG = Platform.OS === 'web' ? 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' : undefined;

/** Máximo "redondo" del eje y sus divisiones. */
function escala(maximo: number, divisiones = 4): number[] {
  if (maximo <= 0) return [0, 1];
  const paso = maximo / divisiones;
  const magnitud = 10 ** Math.floor(Math.log10(paso));
  const normal = paso / magnitud;
  const redondo = (normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 2.5 ? 2.5 : normal <= 5 ? 5 : 10) * magnitud;
  return Array.from({ length: Math.ceil(maximo / redondo) + 1 }, (_, i) => i * redondo);
}

/** Rectángulo con las esquinas superiores redondeadas (extremo de dato de 4 px, anclado a la base). */
function barraRedondeada(x: number, y: number, ancho: number, alto: number, r = 4): string {
  const rr = Math.min(r, ancho / 2, alto);
  if (alto <= 0) return '';
  return `M${x},${y + alto} L${x},${y + rr} Q${x},${y} ${x + rr},${y} L${x + ancho - rr},${y} Q${x + ancho},${y} ${x + ancho},${y + rr} L${x + ancho},${y + alto} Z`;
}

function SinDatos({ texto }: { texto: string }) {
  return (
    <View style={estilos.vacio}>
      <Icono nombre="bar-chart-outline" tamano={32} color={colores.textoTenue} />
      <Text style={estilos.textoVacio}>{texto}</Text>
    </View>
  );
}

function BotonTabla({ abierta, alPresionar }: { abierta: boolean; alPresionar: () => void }) {
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityState={{ expanded: abierta }}
      style={({ pressed }) => [estilos.botonTabla, pressed && { backgroundColor: colores.grisClaro }]}
    >
      <Icono nombre={abierta ? 'chevron-up' : 'list-outline'} tamano={16} color={colores.enlace} />
      <Text style={{ color: colores.enlace, fontWeight: '600', marginLeft: 4 }}>{abierta ? 'Ocultar tabla' : 'Ver datos en tabla'}</Text>
    </Pressable>
  );
}

// --- Barras agrupadas ---

export interface SerieBarras {
  nombre: string;
  color: string;
}

export function GraficoBarras({
  etiquetas,
  series,
  valores,
  formatoEje,
  formatoValor,
  textoVacio = 'Sin movimientos en el periodo.',
}: {
  /** Etiqueta de cada grupo (por ejemplo, el mes). */
  etiquetas: string[];
  series: SerieBarras[];
  /** valores[grupo][serie] */
  valores: number[][];
  formatoEje: (v: number) => string;
  formatoValor: (v: number) => string;
  textoVacio?: string;
}) {
  const [ancho, setAncho] = useState(0);
  const [elegido, setElegido] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const alto = 200;
  const margen = { izq: 58, der: 8, sup: 10, inf: 26 };
  const maximo = Math.max(0, ...valores.flat());

  if (etiquetas.length === 0 || maximo === 0) return <SinDatos texto={textoVacio} />;

  const marcas = escala(maximo);
  const tope = marcas[marcas.length - 1];
  const anchoPlot = Math.max(0, ancho - margen.izq - margen.der);
  const altoPlot = alto - margen.sup - margen.inf;
  const anchoGrupo = etiquetas.length ? anchoPlot / etiquetas.length : 0;
  const separacion = 2; // espacio de 2 px entre barras contiguas
  const anchoBarra = Math.max(4, Math.min(22, (anchoGrupo * 0.7 - separacion * (series.length - 1)) / series.length));
  const y = (v: number) => margen.sup + altoPlot - (v / tope) * altoPlot;
  // Con grupos angostos se muestra solo el mes (sin el año) y, si aún no cabe, una etiqueta de cada dos
  const pasoEtiqueta = anchoGrupo > 0 ? Math.max(1, Math.ceil(30 / anchoGrupo)) : 1;

  return (
    <View>
      <Leyenda elementos={series.map((s) => ({ nombre: s.nombre, color: s.color }))} />
      <View onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)} style={{ height: alto }}>
        {ancho > 0 && (
          <Svg width={ancho} height={alto} accessibilityLabel="Gráfico de barras">
            {marcas.map((m) => (
              <G key={m}>
                <Line x1={margen.izq} x2={ancho - margen.der} y1={y(m)} y2={y(m)} stroke={m === 0 ? colores.grisMedio : colores.rejilla} strokeWidth={1} />
                <TextoSvg x={margen.izq - 6} y={y(m) + 4} fontSize={10} fontFamily={FUENTE_SVG} fill={colores.textoSecundario} textAnchor="end">
                  {formatoEje(m)}
                </TextoSvg>
              </G>
            ))}
            {etiquetas.map((et, g) => {
              const anchoTotal = anchoBarra * series.length + separacion * (series.length - 1);
              const x0 = margen.izq + g * anchoGrupo + (anchoGrupo - anchoTotal) / 2;
              return (
                <G key={et} opacity={elegido === null || elegido === g ? 1 : 0.45}>
                  {series.map((s, i) => {
                    const v = valores[g]?.[i] ?? 0;
                    const xb = x0 + i * (anchoBarra + separacion);
                    return <Path key={s.nombre} d={barraRedondeada(xb, y(v), anchoBarra, y(0) - y(v))} fill={s.color} />;
                  })}
                  {g % pasoEtiqueta === 0 && (
                    <TextoSvg
                      x={margen.izq + g * anchoGrupo + anchoGrupo / 2}
                      y={alto - 8}
                      fontSize={10}
                      fontFamily={FUENTE_SVG}
                      fill={colores.textoSecundario}
                      textAnchor="middle"
                    >
                      {anchoGrupo < 64 ? et.split(' ')[0] : et}
                    </TextoSvg>
                  )}
                  {/* Área táctil del grupo, más grande que las barras */}
                  <Rect
                    x={margen.izq + g * anchoGrupo}
                    y={margen.sup}
                    width={anchoGrupo}
                    height={altoPlot + margen.inf}
                    fill="transparent"
                    onPress={() => setElegido(elegido === g ? null : g)}
                  />
                </G>
              );
            })}
          </Svg>
        )}
      </View>
      <View style={estilos.detalle} accessibilityLiveRegion="polite">
        {elegido !== null ? (
          <Text style={{ color: colores.texto, fontSize: 13 }}>
            <Text style={{ fontWeight: '700' }}>{etiquetas[elegido]}: </Text>
            {series.map((s, i) => `${s.nombre} ${formatoValor(valores[elegido]?.[i] ?? 0)}`).join(' · ')}
          </Text>
        ) : (
          <Text style={{ color: colores.textoSecundario, fontSize: 12 }}>Toque un mes para ver sus valores.</Text>
        )}
      </View>
      <BotonTabla abierta={tabla} alPresionar={() => setTabla((t) => !t)} />
      {tabla && (
        <View style={estilos.tabla}>
          <View style={estilos.filaTabla}>
            <Text style={[estilos.celda, estilos.celdaEncabezado, { flex: 0.8 }]}>Mes</Text>
            {series.map((s) => (
              <Text key={s.nombre} style={[estilos.celda, estilos.celdaEncabezado, { textAlign: 'right' }]}>
                {s.nombre}
              </Text>
            ))}
          </View>
          {etiquetas.map((et, g) => (
            <View key={et} style={estilos.filaTabla}>
              <Text style={[estilos.celda, { flex: 0.8 }]}>{et}</Text>
              {series.map((s, i) => (
                <Text key={s.nombre} style={[estilos.celda, { textAlign: 'right' }]}>
                  {formatoValor(valores[g]?.[i] ?? 0)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// --- Dona ---

const MAX_CATEGORIAS = 7;

export function GraficoDona({
  datos,
  formatoValor,
  textoCentro,
  textoVacio = 'Sin datos en el periodo.',
}: {
  datos: { nombre: string; valor: number }[];
  formatoValor: (v: number) => string;
  /** Rótulo bajo el total del centro (por ejemplo, "solicitudes"). */
  textoCentro: string;
  textoVacio?: string;
}) {
  const [elegido, setElegido] = useState<number | null>(null);
  const [tabla, setTabla] = useState(false);
  const ordenados = [...datos].filter((d) => d.valor > 0).sort((a, b) => b.valor - a.valor);
  const agrupados =
    ordenados.length > MAX_CATEGORIAS
      ? [...ordenados.slice(0, MAX_CATEGORIAS - 1), { nombre: 'Otros', valor: ordenados.slice(MAX_CATEGORIAS - 1).reduce((s, d) => s + d.valor, 0) }]
      : ordenados;
  const total = agrupados.reduce((s, d) => s + d.valor, 0);
  if (total === 0) return <SinDatos texto={textoVacio} />;

  const tamano = 168;
  const c = tamano / 2;
  const rExt = c - 2;
  const rInt = rExt - 26;
  const segmentos = agrupados.map((d, i) => ({ ...d, color: colores.serie[i % colores.serie.length], pct: d.valor / total }));

  let angulo = -Math.PI / 2;
  const punto = (r: number, a: number) => `${c + r * Math.cos(a)},${c + r * Math.sin(a)}`;
  const caminos = segmentos.map((s) => {
    const inicio = angulo;
    const fin = angulo + s.pct * Math.PI * 2;
    angulo = fin;
    const grande = fin - inicio > Math.PI ? 1 : 0;
    return `M${punto(rExt, inicio)} A${rExt},${rExt} 0 ${grande} 1 ${punto(rExt, fin)} L${punto(rInt, fin)} A${rInt},${rInt} 0 ${grande} 0 ${punto(rInt, inicio)} Z`;
  });
  const sel = elegido !== null ? segmentos[elegido] : null;
  const pct = (p: number) => `${(p * 100).toLocaleString('es-CO', { maximumFractionDigits: 1 })} %`;

  return (
    <View>
      <View style={estilos.filaDona}>
        <View style={{ width: tamano, height: tamano }}>
          <Svg width={tamano} height={tamano} accessibilityLabel={`Gráfico de dona: ${segmentos.map((s) => `${s.nombre} ${pct(s.pct)}`).join(', ')}`}>
            {segmentos.length === 1 ? (
              <Circle cx={c} cy={c} r={(rExt + rInt) / 2} stroke={segmentos[0].color} strokeWidth={rExt - rInt} fill="none" onPress={() => setElegido(elegido === 0 ? null : 0)} />
            ) : (
              caminos.map((d, i) => (
                <Path
                  key={segmentos[i].nombre}
                  d={d}
                  fill={segmentos[i].color}
                  stroke={colores.tarjeta}
                  strokeWidth={2}
                  opacity={elegido === null || elegido === i ? 1 : 0.35}
                  onPress={() => setElegido(elegido === i ? null : i)}
                />
              ))
            )}
          </Svg>
          <View style={[StyleSheet.absoluteFill, estilos.centroDona]} pointerEvents="none">
            <Text style={estilos.totalDona} numberOfLines={1} adjustsFontSizeToFit>
              {sel ? pct(sel.pct) : formatoValor(total)}
            </Text>
            <Text style={estilos.rotuloDona} numberOfLines={2}>
              {sel ? sel.nombre : textoCentro}
            </Text>
          </View>
        </View>
      </View>
      {/* Leyenda con valores y porcentajes */}
      {segmentos.map((s, i) => (
        <Pressable
          key={s.nombre}
          onPress={() => setElegido(elegido === i ? null : i)}
          accessibilityRole="button"
          accessibilityState={{ selected: elegido === i }}
          accessibilityLabel={`${s.nombre}: ${formatoValor(s.valor)}, ${pct(s.pct)}`}
          style={[estilos.filaLeyenda, elegido === i && { backgroundColor: colores.grisClaro }]}
        >
          <View style={[estilos.muestra, { backgroundColor: s.color }]} />
          <Text style={estilos.nombreLeyenda} numberOfLines={1}>
            {s.nombre}
          </Text>
          <Text style={estilos.valorLeyenda}>{formatoValor(s.valor)}</Text>
          <Text style={estilos.pctLeyenda}>{pct(s.pct)}</Text>
        </Pressable>
      ))}
      <BotonTabla abierta={tabla} alPresionar={() => setTabla((t) => !t)} />
      {tabla && (
        <View style={estilos.tabla}>
          {ordenados.map((d) => (
            <View key={d.nombre} style={estilos.filaTabla}>
              <Text style={estilos.celda}>{d.nombre}</Text>
              <Text style={[estilos.celda, { textAlign: 'right' }]}>{formatoValor(d.valor)}</Text>
              <Text style={[estilos.celda, { textAlign: 'right', flex: 0.6 }]}>{pct(d.valor / total)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function Leyenda({ elementos }: { elementos: { nombre: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: espacio.m, marginBottom: espacio.s }}>
      {elementos.map((e) => (
        <View key={e.nombre} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[estilos.muestra, { backgroundColor: e.color }]} />
          <Text style={{ fontSize: 13, color: colores.texto }}>{e.nombre}</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  vacio: { alignItems: 'center', justifyContent: 'center', paddingVertical: espacio.xl },
  textoVacio: { color: colores.textoSecundario, marginTop: espacio.s, textAlign: 'center' },
  detalle: { minHeight: 24, justifyContent: 'center', marginTop: 2 },
  botonTabla: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', minHeight: TACTIL_MIN, paddingHorizontal: 4, borderRadius: 8 },
  tabla: { borderTopWidth: 1, borderTopColor: colores.borde },
  filaTabla: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colores.borde, paddingVertical: 6 },
  celda: { flex: 1, fontSize: 13, color: colores.texto },
  celdaEncabezado: { fontWeight: '700' },
  filaDona: { alignItems: 'center', marginBottom: espacio.m },
  centroDona: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  totalDona: { fontSize: 18, fontWeight: '800', color: colores.texto },
  rotuloDona: { fontSize: 11, color: colores.textoSecundario, textAlign: 'center' },
  filaLeyenda: { flexDirection: 'row', alignItems: 'center', minHeight: TACTIL_MIN, paddingHorizontal: 6, borderRadius: 8 },
  muestra: { width: 12, height: 12, borderRadius: 3, marginRight: 8 },
  nombreLeyenda: { flex: 1, fontSize: 14, color: colores.texto },
  valorLeyenda: { fontSize: 14, color: colores.texto, fontWeight: '600', marginLeft: espacio.s },
  pctLeyenda: { width: 64, textAlign: 'right', fontSize: 13, color: colores.textoSecundario },
});
