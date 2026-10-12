import { prisma } from '../config/prisma';
import { forbidden } from '../utils/errors';

/** Ocupaciones vigentes del usuario (unidades en las que vive o de las que es titular). */
export function ocupacionesVigentes(idUsuario: number) {
  return prisma.ocupacionUnidad.findMany({
    where: { id_usuario: idUsuario, fecha_fin: null },
    include: { unidad: { include: { torre: true } } },
  });
}

export async function idsUnidadesDelUsuario(idUsuario: number): Promise<number[]> {
  return (await ocupacionesVigentes(idUsuario)).map((o) => o.id_unidad);
}

/** Verifica que el usuario esté vinculado a la unidad y devuelve su ocupación. */
export async function exigirOcupacion(idUsuario: number, idUnidad: number) {
  const o = await prisma.ocupacionUnidad.findFirst({ where: { id_usuario: idUsuario, id_unidad: idUnidad, fecha_fin: null } });
  if (!o) throw forbidden('No está vinculado a esta unidad residencial');
  return o;
}

export const nombreUnidad = (u: { numero: string; torre?: { nombre: string } | null }) =>
  `${u.torre ? `${u.torre.nombre} - ` : ''}${u.numero}`;
