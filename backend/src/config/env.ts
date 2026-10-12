import 'dotenv/config';
import path from 'node:path';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno obligatoria ${name} (ver .env.example)`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  publicApiUrl: (process.env.PUBLIC_API_URL ?? `http://localhost:${process.env.PORT ?? 3000}`).replace(/\/$/, ''),
  corsOrigin: (process.env.CORS_ORIGIN ?? '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30m',
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 7),
  qrSecret: process.env.QR_SECRET ?? required('JWT_SECRET'),
  paymentProvider: (process.env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'wompi',
  wompi: {
    publicKey: process.env.WOMPI_PUBLIC_KEY ?? '',
    privateKey: process.env.WOMPI_PRIVATE_KEY ?? '',
    integritySecret: process.env.WOMPI_INTEGRITY_SECRET ?? '',
    eventsSecret: process.env.WOMPI_EVENTS_SECRET ?? '',
    redirectUrl: process.env.WOMPI_REDIRECT_URL ?? '',
  },
  pushProvider: (process.env.PUSH_PROVIDER ?? 'log') as 'log' | 'expo',
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? 'uploads'),
  isTest: process.env.NODE_ENV === 'test',
};
