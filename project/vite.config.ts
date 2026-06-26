import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // 🌟 TAMBAHKAN BARIS INI: Mengunci rute pencarian asset agar tidak tersesat di sub-URL
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
