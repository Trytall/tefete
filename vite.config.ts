import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { buildHolders } from './api/holders.js'
import { buildUnitProfiles } from './api/units.js'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'holders-api',
      configureServer(server) {
        server.middlewares.use('/api/holders', async (req, res, next) => {
          if (req.method !== 'GET') return next()
          try {
            const url = new URL(req.url || '', 'http://localhost')
            const ids = String(url.searchParams.get('items') || '')
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean)
            if (!ids.length) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Falta items' }))
              return
            }
            const items = await buildHolders(ids)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ items, updatedAt: new Date().toISOString(), source: 'https://www.metatft.com/items' }))
          } catch {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'No se pudo leer los portadores de MetaTFT' }))
          }
        })
        server.middlewares.use('/api/units', async (req, res, next) => {
          if (req.method !== 'GET') return next()
          try {
            const url = new URL(req.url || '', 'http://localhost')
            const ids = String(url.searchParams.get('ids') || '')
              .split(',')
              .map((id) => id.trim())
              .filter(Boolean)
            if (!ids.length) {
              res.statusCode = 400
              res.setHeader('Content-Type', 'application/json; charset=utf-8')
              res.end(JSON.stringify({ error: 'Falta ids' }))
              return
            }
            const units = await buildUnitProfiles(ids)
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ units, updatedAt: new Date().toISOString(), source: 'https://www.metatft.com' }))
          } catch {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json; charset=utf-8')
            res.end(JSON.stringify({ error: 'No se pudo leer unidades de MetaTFT' }))
          }
        })
      },
    },
  ],
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
