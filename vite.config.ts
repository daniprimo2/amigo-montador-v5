import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: './client',  // pasta onde está seu código React
  build: {
    outDir: '../dist', // pasta de saída do build
  },
  server: {
    port: 3000,
  },
});
