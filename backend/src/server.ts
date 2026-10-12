import { crearApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { enviarRecordatoriosPago } from './modules/finanzas'; // @RF-02

const app = crearApp();

const servidor = app.listen(env.port, () => {
  console.log(`Convive API escuchando en el puerto ${env.port}`);
  console.log(`Pasarela de pagos: ${env.paymentProvider} · Notificaciones push: ${env.pushProvider}`);
});

// #region @RF-02 Planificador de tareas (actor del CU-18): recordatorios de pago dos veces al día.
const DOCE_HORAS = 12 * 60 * 60 * 1000;
const planificador = setInterval(() => {
  enviarRecordatoriosPago()
    .then((r) => console.log(`[Planificador] Recordatorios de pago enviados: ${r.notificaciones}`))
    .catch((err) => console.error('[Planificador] Error al enviar recordatorios', err));
}, DOCE_HORAS);
planificador.unref();
// #endregion @RF-02

async function apagar() {
  clearInterval(planificador); // @RF-02
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
