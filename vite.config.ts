import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function manualChunks(id: string) {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'vendor-react';
  if (id.includes('/lucide-react/')) return 'vendor-icons';
  if (id.includes('/canvas-confetti/')) return 'vendor-effects';
  return 'vendor-misc';
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks,
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        entryFileNames: 'assets/entry/[name]-[hash].js',
        assetFileNames: ({ names }) => {
          const name = names?.[0] || '';
          if (/\.(png|jpe?g|webp|avif|svg)$/i.test(name)) return 'assets/images/[name]-[hash][extname]';
          if (/\.css$/i.test(name)) return 'assets/styles/[name]-[hash][extname]';
          return 'assets/static/[name]-[hash][extname]';
        },
      },
    },
  },
});
