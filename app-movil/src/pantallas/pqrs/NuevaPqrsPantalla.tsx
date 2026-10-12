/**
 * CU-28 Radicar PQRS y CU-29 Adjuntar evidencias (pantalla completa, desde los accesos rápidos de Inicio).
 */
import React from 'react';
import { FormularioPqrs } from '../../componentes/FormularioPqrs';
import { Pantalla, Tarjeta } from '../../componentes/ui';
import type { PropsApp } from '../../navegacion/tipos';

export function NuevaPqrsPantalla({ navigation }: PropsApp<'NuevaPqrs'>) {
  return (
    <Pantalla>
      <Tarjeta>
        <FormularioPqrs alRadicar={(r) => navigation.replace('DetallePqrs', { idPqrs: r.id_pqrs })} />
      </Tarjeta>
    </Pantalla>
  );
}
