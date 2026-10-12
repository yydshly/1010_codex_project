import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  base: './',
  build: { rolldownOptions: { input: {
    ...(mode === 'public' ? {
      research: resolve(import.meta.dirname, 'research.html'),
      replay: resolve(import.meta.dirname, 'replay.html'),
    } : {
      main: resolve(import.meta.dirname, 'index.html'),
      route: resolve(import.meta.dirname, 'route.html'),
      fishing: resolve(import.meta.dirname, 'fishing.html'),
      research: resolve(import.meta.dirname, 'research.html'),
      replay: resolve(import.meta.dirname, 'replay.html'),
    }),
    guide: resolve(import.meta.dirname, 'guide.html'),
    fishEp: resolve(import.meta.dirname, 'fish-ep.html'),
    applications: resolve(import.meta.dirname, 'applications.html'),
  } } },
  server: { proxy: { '/api': 'http://127.0.0.1:8190' } },
  preview: { proxy: { '/api': 'http://127.0.0.1:8190' } },
}));
