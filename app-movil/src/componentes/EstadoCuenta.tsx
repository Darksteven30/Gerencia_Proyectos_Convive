/**
 * Tarjeta "Estado de la cuenta" (Inicio y Pagos): saldo total y botón "Abonar" que abre el flujo de pago.
 * Si el usuario no es responsable de pago de ninguna unidad, el botón se oculta y se muestra una nota (RN-07).
 */
import React from 'react';
import { Text, View } from 'react-native';
import type { EstadoCuentaUnidad } from '../api/tipos';
import { useAuth } from '../contexto/AuthContext';
import { colores, espacio } from '../tema';
import { formatoCOPCompleto } from '../utils/formato';
import { Boton, Monto, Tarjeta, TextoSecundario } from './ui';

/** Unidades cuyas cuotas puede pagar el usuario (responsable de pago o propietario). */
export function usePuedeAbonar(cuenta: EstadoCuentaUnidad[]) {
  const { puedePagar } = useAuth();
  const pagables = cuenta.filter((u) => u.es_responsable_pago || puedePagar(u.id_unidad));
  return { pagables, esResponsable: pagables.length > 0, conSaldo: pagables.some((u) => u.cuotas.length > 0) };
}

export function TarjetaEstadoCuenta({
  cuenta,
  alAbonar,
  mostrarBoton = true,
}: {
  cuenta: EstadoCuentaUnidad[];
  alAbonar?: () => void;
  mostrarBoton?: boolean;
}) {
  const saldo = cuenta.reduce((s, u) => s + u.saldo_total, 0);
  const vencidas = cuenta.reduce((s, u) => s + u.cuotas_vencidas, 0);
  const { esResponsable, conSaldo } = usePuedeAbonar(cuenta);

  return (
    <Tarjeta>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colores.texto }}>Estado de la cuenta</Text>
      <Monto>{formatoCOPCompleto(saldo)}</Monto>
      {saldo === 0 ? (
        <TextoSecundario estilo={{ marginBottom: espacio.s }}>¡Está al día con la administración!</TextoSecundario>
      ) : vencidas > 0 ? (
        <Text style={{ color: colores.peligro, fontWeight: '600', marginBottom: espacio.s }}>
          {vencidas} cuota(s) vencida(s). Póngase al día para evitar intereses.
        </Text>
      ) : null}
      {mostrarBoton && alAbonar && (
        <View>
          {esResponsable ? (
            <Boton titulo="Abonar" variante="secundario" compacto alPresionar={alAbonar} deshabilitado={!conSaldo} />
          ) : (
            <TextoSecundario estilo={{ fontSize: 13 }}>
              Puede consultar el saldo, pero solo el propietario o el responsable de pago de la unidad puede abonar (RN-07).
            </TextoSecundario>
          )}
        </View>
      )}
    </Tarjeta>
  );
}
