import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = {
    VITE_API_URL: process.env.VITE_API_URL || 'https://huggingface.co/spaces/keval-fst/health-vital-backend',
    VITE_WS_URL: process.env.VITE_WS_URL || 'wss://huggingface.co/spaces/keval-fst/health-vital-backend'
  };
  console.log('Environment variables in Vite config:', JSON.stringify(env, null, 2));

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    define: {
      'process.env': {
        VITE_API_URL: JSON.stringify(env.VITE_API_URL),
        VITE_WS_URL: JSON.stringify(env.VITE_WS_URL)
      },
      'import.meta.env': {
        VITE_API_URL: JSON.stringify(env.VITE_API_URL),
        VITE_WS_URL: JSON.stringify(env.VITE_WS_URL)
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      host: true,
      strictPort: true,
    },
    preview: {
      port: 3000,
      host: true,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: mode !== 'production',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    publicDir: 'src/assets',
  };
});
