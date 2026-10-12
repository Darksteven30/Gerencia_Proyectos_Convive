/**
 * Protocolo de verificación del despliegue (Entrega 3, sección 4.7): ejecuta las siete pruebas
 * de humo contra una URL de la API y reporta el resultado de cada una.
 *
 * Uso:
 *   npm run smoke                                  (API local en http://localhost:3000)
 *   npm run smoke -- https://convive-api.onrender.com
 *
 * Requiere los datos de prueba (npx prisma db seed) y PAYMENT_PROVIDER=mock en el servidor.
 */
const API = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

type Json = Record<string, any>;
const resultados: { prueba: string; ok: boolean; detalle: string }[] = [];

async function llamar(metodo: string, ruta: string, token?: string, body?: unknown, form?: FormData): Promise<{ status: number; json: Json; texto: string }> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(`${API}${ruta}`, { method: metodo, headers, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined), redirect: 'manual' });
  const texto = await r.text();
  let json: Json = {};
  try {
    json = JSON.parse(texto);
  } catch {
    /* respuesta no JSON */
  }
  return { status: r.status, json, texto };
}

async function prueba(nombre: string, fn: () => Promise<string>) {
  try {
    const detalle = await fn();
    resultados.push({ prueba: nombre, ok: true, detalle });
    console.log(`✔ ${nombre} — ${detalle}`);
  } catch (e) {
    const detalle = e instanceof Error ? e.message : String(e);
    resultados.push({ prueba: nombre, ok: false, detalle });
    console.log(`✘ ${nombre} — ${detalle}`);
  }
}

function esperar(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const fechaColombia = (diasAdelante = 0) => {
  const d = new Date(Date.now() + diasAdelante * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
};
const horaColombia = (minAdelante = 0) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(Date.now() + minAdelante * 60_000));

async function main() {
  console.log(`Verificando la API en ${API}\n`);
  const tokens: Record<string, string> = {};

  await prueba('1. Extremo /health responde 200', async () => {
    const r = await llamar('GET', '/health');
    esperar(r.status === 200, `Código ${r.status}: ${r.texto.slice(0, 100)}`);
    return `estado=${r.json.estado}, baseDatos=${r.json.baseDatos}`;
  });

  await prueba('2. Inicio de sesión con los cuatro usuarios de prueba', async () => {
    const usuarios = [
      ['admin', 'admin@convive-demo.co', 'Admin#2026'],
      ['propietario', 'propietario1@convive-demo.co', 'Propietario#2026'],
      ['residente', 'residente1@convive-demo.co', 'Residente#2026'],
      ['porteria', 'porteria1@convive-demo.co', 'Porteria#2026'],
    ];
    for (const [rol, correo, contrasena] of usuarios) {
      const r = await llamar('POST', '/api/auth/login', undefined, { correo, contrasena, plataforma: 'WEB' });
      esperar(r.status === 200 && !!r.json.accessToken, `${correo}: ${r.status} ${r.json.error ?? ''}`);
      tokens[rol] = r.json.accessToken;
    }
    return 'tokens generados para Administrador, Propietario, Residente y Portería';
  });

  await prueba('3. Pago en la pasarela de pruebas y comprobante en el historial', async () => {
    let ec = await llamar('GET', '/api/estado-cuenta', tokens.propietario);
    if (!(ec.json as unknown as Json[])[0]?.cuotas.length) {
      // Sin cuotas pendientes (la prueba ya se ejecutó antes): el administrador genera una cuota
      // extraordinaria en el primer periodo futuro disponible para que la prueba sea repetible.
      const [anio, mes] = fechaColombia().split('-').map(Number);
      for (let i = 1; i <= 120; i++) {
        const d = new Date(Date.UTC(anio, mes - 1 + i, 1));
        const periodo = d.toISOString().slice(0, 7);
        const g = await llamar('POST', '/api/cuotas/generar', tokens.admin, {
          periodo,
          presupuesto_mensual: 500000,
          fecha_vencimiento: `${periodo}-28`,
          concepto: 'EXTRAORDINARIA',
        });
        if (g.json.generadas > 0) break;
      }
      ec = await llamar('GET', '/api/estado-cuenta', tokens.propietario);
    }
    const unidad = (ec.json as unknown as Json[])[0];
    esperar(!!unidad && unidad.cuotas.length > 0, 'El propietario no tiene cuotas pendientes');
    const cuota = unidad.cuotas[0];
    const pago = await llamar('POST', '/api/pagos', tokens.propietario, { id_unidad: unidad.id_unidad, cuotas: [cuota.id_cuota] });
    esperar(pago.status === 201, `Crear pago: ${pago.status} ${pago.json.error ?? ''}`);
    esperar(pago.json.pasarela === 'SIMULADOR', `La prueba automática requiere PAYMENT_PROVIDER=mock (actual: ${pago.json.pasarela})`);
    const form = new URLSearchParams({ resultado: 'APROBADO' });
    await fetch(`${API}/api/pagos/simulador/${encodeURIComponent(pago.json.referencia)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      redirect: 'manual',
    });
    const historial = await llamar('GET', '/api/pagos', tokens.propietario);
    const registrado = (historial.json as unknown as Json[]).find((p) => p.id_pago === pago.json.id_pago);
    esperar(registrado?.estado === 'APROBADO', `Estado del pago: ${registrado?.estado}`);
    const pdf = await fetch(`${API}/api/pagos/${pago.json.id_pago}/comprobante`, { headers: { Authorization: `Bearer ${tokens.propietario}` } });
    esperar(pdf.status === 200 && (pdf.headers.get('content-type') ?? '').includes('pdf'), `Comprobante: ${pdf.status}`);
    return `pago ${pago.json.referencia} aprobado por ${pago.json.valor_total} COP; comprobante ${registrado.comprobante} descargable`;
  });

  await prueba('4. Reserva de zona común y bloqueo del cupo para otros usuarios', async () => {
    const zonas = (await llamar('GET', '/api/zonas', tokens.propietario)).json as unknown as Json[];
    const zona = zonas.find((z) => z.nombre === 'Salón social') ?? zonas[0];
    // Se busca una franja libre en los próximos días para que la prueba pueda repetirse
    for (let dia = 3; dia < 40; dia++) {
      const fecha = fechaColombia(dia);
      const r = await llamar('POST', '/api/reservas', tokens.propietario, { id_zona: zona.id_zona, fecha, hora_inicio: '10:00', hora_fin: '12:00', numero_asistentes: 10 });
      if (r.status === 409) continue;
      esperar(r.status === 201, `Reserva: ${r.status} ${r.json.error ?? ''}`);
      const choque = await llamar('POST', '/api/reservas', tokens.residente, { id_zona: zona.id_zona, fecha, hora_inicio: '11:00', hora_fin: '13:00', numero_asistentes: 5 });
      esperar(choque.status === 409, `La franja no quedó bloqueada (código ${choque.status})`);
      return `${zona.nombre} reservado el ${fecha} 10:00-12:00; segundo intento rechazado (${choque.json.code})`;
    }
    throw new Error('No se encontró una franja libre');
  });

  await prueba('5. PQRS con archivo adjunto visible en el panel administrativo', async () => {
    const form = new FormData();
    form.set('tipo', 'QUEJA');
    form.set('categoria', 'Convivencia');
    form.set('asunto', 'Prueba de humo: ruido en horario nocturno');
    form.set('descripcion', 'Radicación automática del protocolo de verificación del despliegue.');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    form.append('adjuntos', new Blob([png], { type: 'image/png' }), 'evidencia.png');
    const r = await llamar('POST', '/api/pqrs', tokens.residente, undefined, form);
    esperar(r.status === 201, `Radicar: ${r.status} ${r.json.error ?? ''}`);
    const detalle = await llamar('GET', `/api/pqrs/${r.json.id_pqrs}`, tokens.admin);
    esperar(detalle.status === 200 && detalle.json.lista_adjuntos?.length === 1, 'El administrador no ve el adjunto');
    return `radicado ${r.json.numero_radicado} con 1 adjunto, visible para el administrador`;
  });

  await prueba('6. Noticia publicada y notificación recibida por el residente', async () => {
    const titulo = `Prueba de humo ${new Date().toISOString()}`;
    const r = await llamar('POST', '/api/noticias', tokens.admin, { titulo, contenido: 'Comunicado generado por el protocolo de verificación.', tipo: 'NOTICIA', publico_objetivo: 'TODOS' });
    esperar(r.status === 201, `Publicar: ${r.status} ${r.json.error ?? ''}`);
    const bandeja = await llamar('GET', '/api/notificaciones', tokens.residente);
    const llego = (bandeja.json.notificaciones as Json[]).some((n) => n.id_noticia === r.json.id_noticia);
    esperar(llego, 'El residente no recibió la notificación');
    return `noticia ${r.json.id_noticia} notificada a ${r.json.notificados} usuarios`;
  });

  await prueba('7. Código QR de visitante validado en portería', async () => {
    const r = await llamar('POST', '/api/visitas', tokens.propietario, {
      tipo_documento: 'CC',
      numero_documento: '99887766',
      nombres: 'Visitante',
      apellidos: 'De Prueba',
      fecha_programada: fechaColombia(0),
      // Franja que contiene la hora actual sin cruzar la medianoche
      hora_desde: horaColombia(-5) > horaColombia(0) ? '00:00' : horaColombia(-5),
      hora_hasta: horaColombia(60) < horaColombia(0) ? '23:59' : horaColombia(60),
    });
    esperar(r.status === 201, `Pre-registro: ${r.status} ${r.json.error ?? ''}`);
    const v = await llamar('POST', '/api/visitas/validar', tokens.porteria, { codigo: r.json.codigo_qr });
    esperar(v.status === 200 && v.json.autorizado, `Validación: ${v.status} ${v.json.error ?? ''}`);
    const reuso = await llamar('POST', '/api/visitas/validar', tokens.porteria, { codigo: r.json.codigo_qr });
    esperar(reuso.status === 422, 'El código pudo reutilizarse');
    return `ingreso autorizado para la visita ${r.json.id_visita}; reutilización rechazada (RN-05)`;
  });

  const ok = resultados.filter((r) => r.ok).length;
  console.log(`\nResultado: ${ok}/${resultados.length} pruebas aprobadas — ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
  process.exit(ok === resultados.length ? 0 : 1);
}

main();
