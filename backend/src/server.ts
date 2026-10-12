import { crearApp } from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

const app = crearApp();

const servidor = app.listen(env.port, () => {
  console.log(`Convive API escuchando en el puerto ${env.port}`);
  console.log(`Pasarela de pagos: ${env.paymentProvider} · Notificaciones push: ${env.pushProvider}`);
});


async function apagar() {
  servidor.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
