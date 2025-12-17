import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    strictPort: true,
    hmr: {
      host: 'pnptv.app',
      clientPort: 443,
      protocol: 'wss',
    },
    allowedHosts: [
      'pnptv.app',
      'www.pnptv.app',
      'localhost',
      '.pnptv.app'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:33010',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
