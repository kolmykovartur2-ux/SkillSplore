import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web client talks to the API at /api. In development Vite proxies /api and
// /uploads to the API server; in production the API serves the built client.
// The end-to-end suite runs its own API on a different port so it can run
// alongside a normal dev server without either clobbering the other.
const apiPort = process.env.E2E_API_PORT ?? '4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${apiPort}`, changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
