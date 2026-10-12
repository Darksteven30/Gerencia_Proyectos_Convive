/**
 * Ensamblaje de la API. Cada módulo funcional se registra con una etiqueta @RF-XX que indica
 * el requerimiento funcional (Entrega 1, Tabla 3) que lo introdujo.
 */
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { Prisma } from '@prisma/client';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { infoApi } from './modules/info';
import { authRouter } from './modules/auth'; // @RF-01
import { usuariosRouter } from './modules/usuarios'; // @RF-01
import { finanzasRouter } from './modules/finanzas'; // @RF-02
import { reservasRouter } from './modules/reservas'; // @RF-03
import { pqrsRouter } from './modules/pqrs'; // @RF-04
import { noticiasRouter, notificacionesRouter } from './modules/noticias'; // @RF-05
import { visitasRouter } from './modules/visitas'; // @RF-06
import { adminRouter } from './modules/admin'; // @RF-09
import { errorHandler, notFound } from './utils/errors';

// Los valores monetarios (DECIMAL) se envían como número en las respuestas JSON.
(Prisma.Decimal.prototype as unknown as { toJSON: () => number }).toJSON = function (this: Prisma.Decimal) {
  return this.toNumber();
};

export function crearApp() {
  const app = express();
  app.set('trust proxy', 1); // Render y Vercel operan detrás de un proxy HTTPS

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: env.corsOrigin.includes('*') ? true : env.corsOrigin,
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));
  if (!env.isTest) app.use(morgan('dev'));

  // Protocolo de verificación del despliegue, prueba 1 (Entrega 3, sección 4.7)
  app.get('/health', async (_req, res) => {
    let baseDatos = 'ok';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      baseDatos = 'error';
    }
    res.status(baseDatos === 'ok' ? 200 : 503).json({ estado: baseDatos === 'ok' ? 'ok' : 'degradado', baseDatos, hora: new Date().toISOString() });
  });

  app.get('/', (_req, res) => res.json(infoApi));

  app.use('/api/auth', authRouter); // @RF-01
  app.use('/api/admin', usuariosRouter); // @RF-01
  app.use('/api', finanzasRouter); // @RF-02 /api/cuotas, /api/estado-cuenta, /api/pagos
  app.use('/api', reservasRouter); // @RF-03 /api/zonas, /api/reservas
  app.use('/api/pqrs', pqrsRouter); // @RF-04
  app.use('/api/noticias', noticiasRouter); // @RF-05
  app.use('/api/notificaciones', notificacionesRouter); // @RF-05
  app.use('/api/visitas', visitasRouter); // @RF-06
  app.use('/api/admin', adminRouter); // @RF-09

  app.use((_req, _res, next) => next(notFound('Ruta no encontrada')));
  app.use(errorHandler);
  return app;
}
