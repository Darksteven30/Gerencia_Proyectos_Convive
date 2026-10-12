/**
 * Prueba de integración del cliente HTTP de la app contra la API real.
 *
 * Uso (con la API corriendo):
 *   npx tsx scripts/probar-api.ts
 *   EXPO_PUBLIC_API_URL=http://192.168.1.50:3000 npx tsx scripts/probar-api.ts
 *
 * Usa exactamente los módulos src/api/cliente.ts y src/api/servicios.ts de la app.
 * Crea datos de prueba mínimos (un usuario invitado, una PQRS, una visita y una reserva
 * que se cancelan al final).
 */
import {
  alCerrarseSesion,
  API_URL,
  ApiError,
  borrarSesion,
  guardarSesion,
  obtenerTokenAcceso,
  obtenerTokenRefresco,
  solicitudCruda,
} from '../src/api/cliente';
import { auth, noticias, notificaciones, pagos, pqrs, reservas, visitas } from '../src/api/servicios';

let fallos = 0;
function comprobar(condicion: unknown, descripcion: string) {
  if (condicion) console.log(`  ✔ ${descripcion}`);
  else {
    fallos++;
    console.log(`  ✘ ${descripcion}`);
  }
}

async function esperarError(promesa: Promise<unknown>): Promise<ApiError | null> {
  try {
    await promesa;
    return null;
  } catch (e) {
    return e instanceof ApiError ? e : new ApiError(-1, String(e));
  }
}

function manana(): string {
  const f = new Date(Date.now() - 5 * 3600_000 + 86_400_000);
  return f.toISOString().slice(0, 10);
}

async function main() {
  console.log(`API: ${API_URL}\n`);
  let sesionExpirada = 0;
  alCerrarseSesion(() => sesionExpirada++);

  console.log('1. Inicio de sesión (propietario)');
  const s = await auth.iniciarSesion('propietario1@convive-demo.co', 'Propietario#2026', 'WEB', 'prueba-script');
  comprobar(s.accessToken && s.refreshToken, 'recibe accessToken y refreshToken');
  comprobar(obtenerTokenAcceso() === s.accessToken, 'el cliente guardó el token de acceso');

  console.log('2. Renovación automática del token (401 → /api/auth/refresh → reintento)');
  const refrescoAnterior = obtenerTokenRefresco()!;
  await guardarSesion({ accessToken: 'token.invalido.simulado', refreshToken: refrescoAnterior });
  const cuenta = await pagos.estadoCuenta();
  comprobar(Array.isArray(cuenta) && cuenta.length > 0, `GET /api/estado-cuenta responde tras renovar (${cuenta.length} unidad(es))`);
  comprobar(obtenerTokenAcceso() !== 'token.invalido.simulado', 'el token de acceso fue reemplazado');
  comprobar(obtenerTokenRefresco() !== refrescoAnterior, 'el refreshToken rotó');
  comprobar(sesionExpirada === 0, 'no se cerró la sesión');
  console.log(`     ${cuenta[0].unidad}: saldo ${cuenta[0].saldo_total}, responsable de pago: ${cuenta[0].es_responsable_pago}`);

  console.log('3. Peticiones concurrentes con token vencido (una sola renovación)');
  await guardarSesion({ accessToken: 'otro.token.invalido', refreshToken: obtenerTokenRefresco()! });
  const [perfil, zonas, lista, bandeja] = await Promise.all([auth.perfil(), reservas.zonas(), noticias.listar(), notificaciones.bandeja()]);
  comprobar(perfil.correo === 'propietario1@convive-demo.co', `GET /api/auth/me (${perfil.nombres} ${perfil.apellidos})`);
  comprobar(zonas.length > 0, `GET /api/zonas (${zonas.length})`);
  comprobar(Array.isArray(lista), `GET /api/noticias (${lista.length})`);
  comprobar(typeof bandeja.no_leidas === 'number', `GET /api/notificaciones (${bandeja.no_leidas} sin leer)`);

  console.log('4. Otros recursos');
  const disp = await reservas.disponibilidad(zonas[0].id_zona, manana());
  comprobar(Array.isArray(disp.ocupado), `disponibilidad de ${disp.zona.nombre} el ${disp.fecha} (${disp.ocupado.length} franja(s) ocupada(s))`);
  const historial = await pagos.historial();
  comprobar(Array.isArray(historial), `GET /api/pagos (${historial.length})`);
  const aprobado = historial.find((p) => p.estado === 'APROBADO' && p.comprobante);
  if (aprobado) {
    const res = await solicitudCruda(pagos.rutaComprobante(aprobado.id_pago));
    const bytes = new Uint8Array(await res.arrayBuffer());
    const firma = String.fromCharCode(...bytes.slice(0, 4));
    comprobar(firma === '%PDF', `comprobante ${aprobado.comprobante} es un PDF (${bytes.length} bytes)`);
  } else console.log('     (sin pagos aprobados para probar el comprobante)');
  comprobar(Array.isArray(await pqrs.mias()), 'GET /api/pqrs');
  comprobar(Array.isArray(await reservas.mias()), 'GET /api/reservas/mias');

  console.log('5. Visita: crear y cancelar');
  const visita = await visitas.crear({
    tipo_documento: 'CC',
    numero_documento: '99887766',
    nombres: 'Visitante',
    apellidos: 'De Prueba',
    fecha_programada: manana(),
    hora_desde: '10:00',
    hora_hasta: '12:00',
    motivo: 'Prueba automática de la app',
  });
  comprobar(!!visita.codigo_qr, `visita ${visita.id_visita} con código QR`);
  await visitas.cancelar(visita.id_visita);
  comprobar(true, 'visita cancelada');

  console.log('6. Reserva: crear, conflicto de franja y cancelar');
  const gimnasio = zonas.find((z) => z.estado === 'ACTIVA')!;
  const datosReserva = { id_zona: gimnasio.id_zona, fecha: manana(), hora_inicio: '05:00', hora_fin: '06:00', numero_asistentes: 1 };
  const r = await esperarError(reservas.crear(datosReserva));
  if (r) console.log(`     no se pudo crear (${r.code}): ${r.message}`);
  else {
    const mias = await reservas.mias();
    const creada = mias.find((x) => x.fecha === datosReserva.fecha && x.hora_inicio === '05:00' && x.estado === 'CONFIRMADA')!;
    comprobar(!!creada, `reserva ${creada?.id_reserva} confirmada en ${gimnasio.nombre}`);
    const choque = await esperarError(reservas.crear(datosReserva));
    comprobar(choque?.status === 409 && choque.code === 'FRANJA_OCUPADA', `409 FRANJA_OCUPADA: "${choque?.message}"`);
    const fuera = await esperarError(reservas.crear({ ...datosReserva, hora_inicio: '02:00', hora_fin: '03:00' }));
    comprobar(fuera?.code === 'FUERA_DE_HORARIO', `400 FUERA_DE_HORARIO: "${fuera?.message}"`);
    await reservas.cancelar(creada.id_reserva);
    comprobar(true, 'reserva cancelada');
  }

  console.log('7. Credenciales incorrectas (401 sin intentar renovar)');
  const antes = sesionExpirada;
  const err = await esperarError(auth.iniciarSesion('propietario1@convive-demo.co', 'Incorrecta#1', 'WEB'));
  comprobar(err?.status === 401, `401: "${err?.message}"`);
  comprobar(sesionExpirada === antes, 'no dispara el cierre de sesión');
  // El intento fallido incrementa el contador; un ingreso correcto lo reinicia
  await auth.iniciarSesion('propietario1@convive-demo.co', 'Propietario#2026', 'WEB');

  console.log('8. Residente sin responsabilidad de pago');
  await auth.iniciarSesion('residente1@convive-demo.co', 'Residente#2026', 'WEB');
  const cuentaRes = await pagos.estadoCuenta();
  comprobar(cuentaRes.every((u) => !u.es_responsable_pago), 'es_responsable_pago = false');
  if (cuentaRes[0]?.cuotas.length) {
    const prohibido = await esperarError(pagos.crear(cuentaRes[0].id_unidad, [cuentaRes[0].cuotas[0].id_cuota]));
    comprobar(prohibido?.status === 403, `POST /api/pagos → 403: "${prohibido?.message}"`);
  }

  console.log('9. Invitación, activación, recuperación y PQRS con adjunto');
  const admin = await auth.iniciarSesion('admin@convive-demo.co', 'Admin#2026', 'WEB');
  const marca = Date.now();
  const correo = `prueba.app.${marca}@convive-demo.co`;
  // La API exige vincular a los residentes a una unidad: se elige la que tenga menos ocupantes
  const unidades = (await (
    await fetch(`${API_URL}/api/admin/unidades`, { headers: { Authorization: `Bearer ${admin.accessToken}` } })
  ).json()) as { id_unidad: number; ocupantes: unknown[] }[];
  const unidad = [...unidades].sort((a, b) => a.ocupantes.length - b.ocupantes.length)[0];
  const invitacion = (await (
    await fetch(`${API_URL}/api/admin/usuarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${admin.accessToken}` },
      body: JSON.stringify({
        tipo_documento: 'CC',
        numero_documento: String(marca).slice(-10),
        nombres: 'Prueba',
        apellidos: 'App Móvil',
        correo,
        roles: ['RESIDENTE'],
        id_unidad: unidad.id_unidad,
        tipo_relacion: 'RESIDENTE',
        es_responsable_pago: false,
      }),
    })
  ).json()) as { codigo_invitacion?: string; error?: string };
  comprobar(!!invitacion.codigo_invitacion, `usuario invitado ${correo} (código ${invitacion.codigo_invitacion ?? invitacion.error})`);
  if (!invitacion.codigo_invitacion) throw new Error('No se pudo invitar al usuario de prueba');
  const debil = await esperarError(auth.activar(correo, invitacion.codigo_invitacion, 'debil'));
  comprobar(debil?.status === 400, `contraseña débil rechazada: "${debil?.message}"`);
  const activado = await auth.activar(correo, invitacion.codigo_invitacion, 'Prueba#2026');
  comprobar(activado.ok, `activación: "${activado.mensaje}"`);
  await auth.iniciarSesion(correo, 'Prueba#2026', 'WEB');
  comprobar(true, 'inicio de sesión con la cuenta activada');

  const rec = await auth.recuperar(correo);
  comprobar(rec.ok, `recuperar: "${rec.mensaje}"${rec.codigoDemo ? ` (codigoDemo ${rec.codigoDemo})` : ' (sin codigoDemo: DEMO_MODE desactivado)'}`);
  if (rec.codigoDemo) {
    const rest = await auth.restablecer(correo, rec.codigoDemo, 'Nueva#2026');
    comprobar(rest.ok, `restablecer: "${rest.mensaje}"`);
    await auth.iniciarSesion(correo, 'Nueva#2026', 'WEB');
  }

  // PNG de 1x1 píxel, enviado igual que en la versión web de la app (Blob en FormData)
  const png = Uint8Array.from(
    atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
    (c) => c.charCodeAt(0),
  );
  const fd = new FormData();
  fd.append('tipo', 'SUGERENCIA');
  fd.append('categoria', 'Otro');
  fd.append('asunto', 'Prueba automática de la app');
  fd.append('descripcion', 'Solicitud creada por scripts/probar-api.ts para verificar el envío multipart.');
  fd.append('adjuntos', new Blob([png], { type: 'image/png' }), 'evidencia.png');
  const creada = await pqrs.crear(fd);
  const detalle = await pqrs.detalle(creada.id_pqrs);
  comprobar(detalle.lista_adjuntos.length === 1, `PQRS ${creada.numero_radicado} radicada con ${detalle.lista_adjuntos.length} adjunto`);
  const calif = await esperarError(pqrs.calificar(creada.id_pqrs, 5));
  comprobar(calif?.status === 400, `calificar una PQRS sin responder → 400: "${calif?.message}"`);

  console.log('10. Cierre de sesión');
  const refresco = obtenerTokenRefresco()!;
  await auth.cerrarSesion(refresco);
  await guardarSesion({ accessToken: 'vencido', refreshToken: refresco });
  const fin = await esperarError(auth.perfil());
  comprobar(fin?.code === 'SESION_EXPIRADA', 'tras el logout, el refreshToken ya no sirve y la app vuelve al ingreso');
  comprobar(sesionExpirada === 1, 'se notificó el cierre de sesión a la app');
  await borrarSesion();

  console.log(fallos ? `\n${fallos} comprobación(es) fallida(s)` : '\nTodas las comprobaciones pasaron');
  process.exit(fallos ? 1 : 0);
}

main().catch((e) => {
  console.error('Error inesperado:', e);
  process.exit(1);
});
