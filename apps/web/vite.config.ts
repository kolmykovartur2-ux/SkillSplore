import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The web client talks to the API at /api. In development Vite proxies /api and
// /uploads to the API server; in production the API serves the built client.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
