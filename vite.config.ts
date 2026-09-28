import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 8081, host: true },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      // Chunking applies to the browser bundle only; an SSR build externalises these instead.
      output: isSsrBuild
        ? {}
        : {
            // The backend and reporting SDKs change far less often than the app, so they cache separately.
            manualChunks: {
              vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
              services: ['@supabase/supabase-js', '@sentry/react'],
            },
          },
    },
  },
}));
