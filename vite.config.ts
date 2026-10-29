import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relativa: funciona em netlify.app, github.io/usuario/repo e localhost
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    allowedHosts: true,
  },
  preview: { host: '0.0.0.0', port: 4173, allowedHosts: true },
  build: { target: 'es2022', sourcemap: false },
});
