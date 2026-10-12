import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        research: fileURLToPath(new URL('./index.html', import.meta.url)),
        lab: fileURLToPath(new URL('./lab.html', import.meta.url)),
        directions: fileURLToPath(new URL('./directions.html', import.meta.url)),
        builder: fileURLToPath(new URL('./builder.html', import.meta.url)),
        overview: fileURLToPath(new URL('./overview.html', import.meta.url)),
        game: fileURLToPath(new URL('./game.html', import.meta.url)),
        weather: fileURLToPath(new URL('./weather.html', import.meta.url)),
        hub: fileURLToPath(new URL('./research.html', import.meta.url)),
        sceneMap: fileURLToPath(new URL('./scene-map.html', import.meta.url)),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three/build/three.webgpu') || id.includes('node_modules/three/build/three.tsl')) return 'three-webgpu';
          if (id.includes('node_modules/three/')) return 'three';
        },
      },
    },
  },
});
