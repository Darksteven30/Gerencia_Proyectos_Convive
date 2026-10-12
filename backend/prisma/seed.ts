/**
 * Datos de prueba del prototipo (Entrega 3, sección 4.6 y Tabla 19):
 * un conjunto, dos torres, ocho unidades residenciales, los usuarios de prueba por rol,
 * zonas comunes, parqueaderos, cuotas, noticias y una PQRS de ejemplo.
 *
 * Uso: npx prisma db seed   (no hace nada si el conjunto de prueba ya existe)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const NIT = '900123456-7';

const hoyColombia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
const fecha = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const hora = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);
function periodoRelativo(meses: number) {
  const [a, m] = hoyColombia().split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + meses, 1));
  return d.toISOString().slice(0, 7);
}

async function main() {
  if (await prisma.conjunto.findUnique({ where: { nit: NIT } })) {
    console.log('Los datos de prueba ya existen. Use "npm run db:reset" para recrearlos.');
    return;
  }

  // Catálogo de roles (RF-01)
  const roles = [
    { id_rol: 1, nombre: 'ADMINISTRADOR', descripcion: 'Gestiona el conjunto desde el panel web' },
    { id_rol: 2, nombre: 'JUNTA', descripcion: 'Consulta reportes y publica comunicados oficiales' },
    { id_rol: 3, nombre: 'PROPIETARIO', descripcion: 'Titular de una unidad; responsable del pago de cuotas' },
    { id_rol: 4, nombre: 'RESIDENTE', descripcion: 'Habita una unidad sin responsabilidad de pago' },
    { id_rol: 5, nombre: 'PORTERIA', descripcion: 'Valida ingresos de visitantes y asigna parqueaderos' },
  ];
  for (const r of roles) await prisma.rol.upsert({ where: { id_rol: r.id_rol }, create: r, update: r });
  const idRol = Object.fromEntries(roles.map((r) => [r.nombre, r.id_rol]));

  const conjunto = await prisma.conjunto.create({
    data: {
      nombre: 'Conjunto Residencial Los Almendros (demo)',
      nit: NIT,
      direccion: 'Calle 5 # 80-20',
      ciudad: 'Cali',
      departamento: 'Valle del Cauca',
      telefono: '6025550000',
      correo_contacto: 'administracion@convive-demo.co',
      numero_unidades: 20,
    },
  });
  const C = conjunto.id_conjunto;

  // Dos torres con cuatro apartamentos cada una (ocho unidades); coeficientes que suman 1
  const torreA = await prisma.torre.create({ data: { id_conjunto: C, nombre: 'Torre A', numero_pisos: 5 } });
  const torreB = await prisma.torre.create({ data: { id_conjunto: C, nombre: 'Torre B', numero_pisos: 5 } });
  const unidades = [];
  const defs = [
    [torreA, '101', 1, 62, 0.115],
    [torreA, '102', 1, 58, 0.11],
    [torreA, '201', 2, 75, 0.14],
    [torreA, '202', 2, 70, 0.135],
    [torreB, '101', 1, 62, 0.115],
    [torreB, '102', 1, 58, 0.11],
    [torreB, '201', 2, 75, 0.14],
    [torreB, '202', 2, 70, 0.135],
  ] as const;
  for (const [torre, numero, piso, area, coef] of defs) {
    unidades.push(
      await prisma.unidadResidencial.create({
        data: { id_conjunto: C, id_torre: torre.id_torre, numero, tipo: 'APARTAMENTO', piso, area_m2: area, coeficiente: coef },
      }),
    );
  }

  const hoy = hoyColombia();
  async function crearUsuario(p: {
    correo: string;
    contrasena?: string;
    nombres: string;
    apellidos: string;
    documento: string;
    roles: string[];
    unidad?: number;
    relacion?: 'PROPIETARIO' | 'ARRENDATARIO' | 'RESIDENTE';
    responsable?: boolean;
    invitacion?: string;
  }) {
    const u = await prisma.usuario.create({
      data: {
        tipo_documento: 'CC',
        numero_documento: p.documento,
        nombres: p.nombres,
        apellidos: p.apellidos,
        correo: p.correo,
        telefono: '300' + p.documento.slice(-7),
        hash_contrasena: p.contrasena ? await bcrypt.hash(p.contrasena, 10) : null,
        estado: p.contrasena ? 'ACTIVO' : 'PENDIENTE',
        codigo_invitacion: p.invitacion ?? null,
        acepta_tratamiento_datos: !!p.contrasena,
        fecha_aceptacion_datos: p.contrasena ? new Date() : null,
      },
    });
    await prisma.usuarioRol.createMany({ data: p.roles.map((r) => ({ id_usuario: u.id_usuario, id_rol: idRol[r], id_conjunto: C })) });
    if (p.unidad !== undefined) {
      await prisma.ocupacionUnidad.create({
        data: {
          id_unidad: unidades[p.unidad].id_unidad,
          id_usuario: u.id_usuario,
          tipo_relacion: p.relacion ?? 'PROPIETARIO',
          es_responsable_pago: p.responsable ?? p.relacion === 'PROPIETARIO',
          fecha_inicio: fecha(hoy),
        },
      });
    }
    return u;
  }

  // Usuarios de prueba (Tabla 19 de la Entrega 3, más Junta Directiva)
  const admin = await crearUsuario({ correo: 'admin@convive-demo.co', contrasena: 'Admin#2026', nombres: 'Andrea', apellidos: 'Gómez (Administradora)', documento: '1010000001', roles: ['ADMINISTRADOR'] });
  const propietario = await crearUsuario({ correo: 'propietario1@convive-demo.co', contrasena: 'Propietario#2026', nombres: 'Carlos', apellidos: 'Ramírez', documento: '1010000002', roles: ['PROPIETARIO'], unidad: 0, relacion: 'PROPIETARIO' });
  const residente = await crearUsuario({ correo: 'residente1@convive-demo.co', contrasena: 'Residente#2026', nombres: 'Laura', apellidos: 'Ramírez', documento: '1010000003', roles: ['RESIDENTE'], unidad: 0, relacion: 'RESIDENTE', responsable: false });
  await crearUsuario({ correo: 'porteria1@convive-demo.co', contrasena: 'Porteria#2026', nombres: 'Jorge', apellidos: 'Martínez (Portería)', documento: '1010000004', roles: ['PORTERIA'] });
  await crearUsuario({ correo: 'junta1@convive-demo.co', contrasena: 'Junta#2026', nombres: 'María', apellidos: 'López (Junta)', documento: '1010000005', roles: ['JUNTA', 'PROPIETARIO'], unidad: 2, relacion: 'PROPIETARIO' });
  // Propietarios del resto de unidades
  const otros = [
    ['Pedro', 'Sánchez'], ['Diana', 'Torres'], ['Luis', 'Herrera'], ['Sofía', 'Castro'], ['Andrés', 'Mejía'], ['Valentina', 'Rojas'],
  ];
  for (let i = 0; i < otros.length; i++) {
    const idx = [1, 3, 4, 5, 6, 7][i];
    await crearUsuario({
      correo: `propietario${i + 2}@convive-demo.co`,
      contrasena: 'Propietario#2026',
      nombres: otros[i][0],
      apellidos: otros[i][1],
      documento: `10100001${String(i).padStart(2, '0')}`,
      roles: ['PROPIETARIO'],
      unidad: idx,
      relacion: 'PROPIETARIO',
    });
  }
  // Usuario pendiente para probar la activación por invitación (CU-05)
  await crearUsuario({ correo: 'invitado@convive-demo.co', nombres: 'Nuevo', apellidos: 'Residente', documento: '1010000099', roles: ['RESIDENTE'], unidad: 1, relacion: 'ARRENDATARIO', responsable: false, invitacion: 'CONVIVE1' });

  // Zonas comunes (RF-03)
  await prisma.zonaComun.createMany({
    data: [
      { id_conjunto: C, nombre: 'Salón social', descripcion: 'Salón para eventos con cocina auxiliar', aforo_maximo: 60, costo_reserva: 80000, hora_apertura: hora('08:00'), hora_cierre: hora('23:00'), duracion_max_horas: 6, anticipacion_max_dias: 60, reglamento: 'Entregar el salón limpio. Música hasta las 11:00 p. m.' },
      { id_conjunto: C, nombre: 'Gimnasio', descripcion: 'Máquinas de cardio y pesas', aforo_maximo: 8, costo_reserva: 0, hora_apertura: hora('05:00'), hora_cierre: hora('22:00'), duracion_max_horas: 2, anticipacion_max_dias: 7, reglamento: 'Uso de toalla obligatorio.' },
      { id_conjunto: C, nombre: 'Piscina', descripcion: 'Piscina para adultos y niños', aforo_maximo: 25, costo_reserva: 0, hora_apertura: hora('09:00'), hora_cierre: hora('19:00'), duracion_max_horas: 3, anticipacion_max_dias: 7, reglamento: 'Menores acompañados de un adulto.' },
      { id_conjunto: C, nombre: 'Zona BBQ', descripcion: 'Asador con mesas para 12 personas', aforo_maximo: 12, costo_reserva: 30000, hora_apertura: hora('10:00'), hora_cierre: hora('22:00'), duracion_max_horas: 5, anticipacion_max_dias: 30, reglamento: 'Traer carbón propio. Limpiar el asador.' },
    ],
  });

  // Parqueaderos (RF-07): una celda por unidad y cuatro de visitantes
  await prisma.parqueadero.createMany({
    data: [
      ...unidades.map((u, i) => ({ id_conjunto: C, codigo: `R-${String(i + 1).padStart(2, '0')}`, tipo: 'RESIDENTE', ubicacion: 'Sótano 1', id_unidad_propietaria: u.id_unidad })),
      ...[1, 2, 3, 4].map((i) => ({ id_conjunto: C, codigo: `V-0${i}`, tipo: 'VISITANTE', ubicacion: 'Exterior portería' })),
    ],
  });

  // Cuotas: mes anterior (vencida para algunas unidades) y mes actual (pendiente)
  const presupuesto = 3_200_000;
  const anterior = periodoRelativo(-1);
  const actual = periodoRelativo(0);
  for (const u of unidades) {
    const valor = Math.round(presupuesto * Number(u.coeficiente));
    const pagadaAnterior = u.id_unidad % 3 !== 1; // algunas unidades quedan en mora
    await prisma.cuotaAdministracion.create({
      data: { id_unidad: u.id_unidad, periodo: anterior, concepto: 'ORDINARIA', valor, saldo: pagadaAnterior ? 0 : valor, fecha_vencimiento: fecha(`${anterior}-10`), estado: pagadaAnterior ? 'PAGADA' : 'VENCIDA' },
    });
    await prisma.cuotaAdministracion.create({
      data: { id_unidad: u.id_unidad, periodo: actual, concepto: 'ORDINARIA', valor, saldo: valor, fecha_vencimiento: fecha(`${actual}-28`), estado: 'PENDIENTE' },
    });
  }
  // Un pago aprobado histórico del propietario de prueba (su comprobante se genera al descargarlo)
  const cuotaPagada = await prisma.cuotaAdministracion.findFirst({ where: { id_unidad: unidades[0].id_unidad, periodo: anterior } });
  if (cuotaPagada && Number(cuotaPagada.saldo) === 0) {
    await prisma.pago.create({
      data: {
        id_unidad: unidades[0].id_unidad,
        id_usuario: propietario.id_usuario,
        valor_total: cuotaPagada.valor,
        metodo_pago: 'PASARELA',
        referencia_pasarela: `CNV-SEED-${anterior}`,
        estado: 'APROBADO',
        fecha_confirmacion: new Date(`${anterior}-05T15:00:00-05:00`),
        detalles: { create: [{ id_cuota: cuotaPagada.id_cuota, valor_aplicado: cuotaPagada.valor }] },
      },
    });
  }

  // Noticias publicadas (RF-05)
  await prisma.noticia.createMany({
    data: [
      { id_conjunto: C, id_autor: admin.id_usuario, titulo: 'Bienvenidos a Convive', contenido: 'Desde hoy pueden pagar la administración, reservar zonas comunes, radicar PQRS y pre-registrar visitantes desde la aplicación.', tipo: 'COMUNICADO', publico_objetivo: 'TODOS', estado: 'PUBLICADA', fecha_publicacion: new Date() },
      { id_conjunto: C, id_autor: admin.id_usuario, titulo: 'Mantenimiento de la piscina', contenido: 'El próximo lunes la piscina estará cerrada de 8:00 a. m. a 12:00 m. por mantenimiento preventivo.', tipo: 'NOTICIA', publico_objetivo: 'TODOS', estado: 'PUBLICADA', fecha_publicacion: new Date() },
      { id_conjunto: C, id_autor: admin.id_usuario, titulo: 'Asamblea ordinaria de propietarios', contenido: 'Se convoca a la asamblea ordinaria de copropietarios. El orden del día se publicará en la cartelera y en esta aplicación.', tipo: 'COMUNICADO', publico_objetivo: 'PROPIETARIOS', estado: 'PUBLICADA', fecha_publicacion: new Date() },
    ],
  });

  // PQRS de ejemplo (RF-04)
  const pqrs = await prisma.pqrs.create({
    data: {
      numero_radicado: `PQ-${hoy.slice(0, 4)}-000001`,
      id_usuario: residente.id_usuario,
      id_unidad: unidades[0].id_unidad,
      tipo: 'PETICION',
      categoria: 'Mantenimiento',
      asunto: 'Luz dañada en el pasillo del primer piso',
      descripcion: 'La luminaria del pasillo frente al apartamento 101 de la Torre A no enciende desde hace tres días.',
      prioridad: 'MEDIA',
      fecha_limite: fecha(hoy),
    },
  });
  await prisma.pqrsSeguimiento.create({ data: { id_pqrs: pqrs.id_pqrs, id_usuario: residente.id_usuario, estado_nuevo: 'RADICADA', comentario: 'Solicitud radicada' } });

  console.log('Datos de prueba creados:');
  console.log('  admin@convive-demo.co / Admin#2026');
  console.log('  propietario1@convive-demo.co / Propietario#2026');
  console.log('  residente1@convive-demo.co / Residente#2026');
  console.log('  porteria1@convive-demo.co / Porteria#2026');
  console.log('  junta1@convive-demo.co / Junta#2026');
  console.log('  invitado@convive-demo.co (activar con el código CONVIVE1)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
