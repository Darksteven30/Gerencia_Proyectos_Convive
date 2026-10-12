/**
 * Insignia de color según el estado de una cuota, pago, reserva, PQRS o visita.
 */
import React from 'react';
import { etiquetaEstado } from '../utils/formato';
import { Insignia, Tono } from './ui';

const TONO_POR_ESTADO: Record<string, Tono> = {
  // Cuotas y pagos
  PENDIENTE: 'advertencia',
  PARCIAL: 'advertencia',
  VENCIDA: 'peligro',
  PAGADA: 'exito',
  APROBADO: 'exito',
  RECHAZADO: 'peligro',
  ANULADO: 'neutro',
  // Reservas
  CONFIRMADA: 'exito',
  CANCELADA: 'neutro',
  FINALIZADA: 'neutro',
  // PQRS
  RADICADA: 'info',
  EN_TRAMITE: 'advertencia',
  RESPONDIDA: 'exito',
  CERRADA: 'neutro',
  // Visitas
  PREREGISTRADA: 'info',
  INGRESADA: 'exito',
};

export function InsigniaEstado({ estado }: { estado: string }) {
  return <Insignia texto={etiquetaEstado(estado)} tono={TONO_POR_ESTADO[estado] ?? 'neutro'} />;
}
