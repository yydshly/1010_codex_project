import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { host: '127.0.0.1', port: 5199, strictPort: true },
  preview: { host: '127.0.0.1', port: 5198, strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        research: resolve(import.meta.dirname, 'research.html'),
        evidence: resolve(import.meta.dirname, 'evidence.html'),
        camp: resolve(import.meta.dirname, 'camp.html'),
        archive: resolve(import.meta.dirname, 'archive.html'),
        battle: resolve(import.meta.dirname, 'battle.html'),
        airport: resolve(import.meta.dirname, 'airport.html'),
        harness: resolve(import.meta.dirname, 'harness.html'),
      },
    },
  },
});
