import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Configuración de Vite para el panel administrativo de Convive
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
