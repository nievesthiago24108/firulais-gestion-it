import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La SPA se compila dentro de backend/public, junto a la API (api/index.php):
// una sola carpeta para copiar a htdocs (XAMPP) o a /var/www (NGINX).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'backend/public',
    emptyOutDir: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
})
