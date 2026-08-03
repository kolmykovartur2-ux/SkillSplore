import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// This dashboard talks only to this service's own API (port 4100 by
// default) — never to apps/api. In development Vite proxies /api; in
// production the marketing-agent API server serves this built client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    proxy: {
      '/api': { target: 'http://localhost:4100', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
