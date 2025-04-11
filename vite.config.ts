import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: "::",
    port: 8080,
    allowedHosts: [
      '16f3-193-46-217-15.ngrok-free.app',  // Добавляем твой ngrok домен
    ],
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        sw: 'public/service-worker.ts'
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'sw' ? 'service-worker.js' : '[name].js'
      }
    }
  }
}));
