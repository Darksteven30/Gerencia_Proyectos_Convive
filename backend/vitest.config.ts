import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'secreto-de-pruebas-unitarias',
      QR_SECRET: 'secreto-qr-de-pruebas',
      WOMPI_INTEGRITY_SECRET: 'test_integrity_secreto',
      WOMPI_EVENTS_SECRET: 'test_events_secreto',
      WOMPI_PUBLIC_KEY: 'pub_test_llave',
    },
  },
});
