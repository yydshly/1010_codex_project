import { defineConfig } from 'vite';
export default defineConfig({ base: './', build: { rolldownOptions: { input: { main: 'index.html', research: 'research.html', minimal: 'minimal.html', verification: 'verification.html' } } } });
