/**
 * Logo de Convive (círculo turquesa con degradado suave y una casa blanca) y avatar con iniciales.
 */
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Perfil } from '../api/tipos';
import { colores, TACTIL_MIN } from '../tema';

export function Logo({ tamano = 72 }: { tamano?: number }) {
  return (
    <View accessibilityRole="image" accessibilityLabel="Logo de Convive">
      <Svg width={tamano} height={tamano} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="degradadoLogo" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colores.turquesaClaro} />
            <Stop offset="1" stopColor={colores.turquesaOscuro} />
          </LinearGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill="url(#degradadoLogo)" />
        {/* Casa: techo a dos aguas, cuerpo y puerta */}
        <Path d="M50 24 L76 46 L70 46 L70 74 L30 74 L30 46 L24 46 Z" fill={colores.blanco} />
        <Path d="M44 74 L44 58 Q44 55 47 55 L53 55 Q56 55 56 58 L56 74 Z" fill={colores.turquesa} />
      </Svg>
    </View>
  );
}

export function iniciales(perfil: Pick<Perfil, 'nombres' | 'apellidos'> | null | undefined): string {
  if (!perfil) return '';
  return `${perfil.nombres.trim()[0] ?? ''}${perfil.apellidos.trim()[0] ?? ''}`.toUpperCase();
}

/** Avatar circular con las iniciales del usuario. Si recibe alPresionar, es un botón de 44 px. */
export function Avatar({
  perfil,
  tamano = 36,
  alPresionar,
}: {
  perfil: Pick<Perfil, 'nombres' | 'apellidos'> | null | undefined;
  tamano?: number;
  alPresionar?: () => void;
}) {
  const circulo = (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: colores.turquesaOscuro,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: colores.blanco, fontWeight: '800', fontSize: tamano * 0.38 }}>{iniciales(perfil)}</Text>
    </View>
  );
  if (!alPresionar) return circulo;
  return (
    <Pressable
      onPress={alPresionar}
      accessibilityRole="button"
      accessibilityLabel="Mi perfil"
      style={{ minWidth: TACTIL_MIN, minHeight: TACTIL_MIN, alignItems: 'center', justifyContent: 'center' }}
    >
      {circulo}
    </Pressable>
  );
}
