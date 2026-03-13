import react from '@vitejs/plugin-react';
import { defineConfig, transformWithEsbuild } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        if (!/src\/.*\.js$/.test(id)) return null;
        return transformWithEsbuild(code, id, {
          loader: 'jsx',
          jsx: 'automatic',
        });
      },
    },
    {
      name: 'spa-fallback',
      configureServer(server) {
        // Runs BEFORE Vite's built-in history-api-fallback (no return wrapper)
        server.middlewares.use((req, res, next) => {
          const accept = req.headers.accept || '';
          const url = req.url || '';
          if (
            accept.includes('text/html') &&
            !url.includes('.') &&
            !url.startsWith('/@') &&
            !url.startsWith('/api') &&
            !url.startsWith('/mj') &&
            !url.startsWith('/pg') &&
            !url.startsWith('/src') &&
            !url.startsWith('/node_modules')
          ) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
    react(),
  ],
  optimizeDeps: {
    force: true,
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.json': 'json',
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
      },
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
          ],
          tools: ['axios', 'marked'],
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/mj': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pg': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
