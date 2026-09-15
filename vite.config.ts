import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/academy': {
        target: 'https://tftacademy.com',
        changeOrigin: true,
        rewrite: () => '/api/tierlist/comps?set=18',
      },
    },
  },
})
