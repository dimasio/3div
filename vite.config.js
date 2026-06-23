import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  root: 'public',
  resolve: {
    conditions: ['import', 'module', 'browser', 'default'],
    mainFields: ['browser', 'module', 'main', 'jsnext', 'es2015'],
    alias: {
      three: path.resolve(__dirname, './node_modules/three'),
      '@thatopen/components': path.resolve(__dirname, './node_modules/@thatopen/components'),
      '@thatopen/components-front': path.resolve(__dirname, './node_modules/@thatopen/components-front')
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },
  optimizeDeps: {
    exclude: []
  },
  server: {
    port: 5175,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
