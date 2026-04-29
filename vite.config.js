import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import http from 'http'

// Fresh agent per-request — prevents stale keep-alive connections when server restarts
const noKeepaliveAgent = new http.Agent({ keepAlive: false })

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@imgs':    path.resolve(__dirname, 'src/Pages/alarm/assets'),
      '@filters': path.resolve(__dirname, 'src/Pages/alarm/assets/filters'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        agent: noKeepaliveAgent,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (!res || res.writableEnded) return
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' })
            }
            res.end(JSON.stringify({ error: 'Server unreachable' }))
          })
        },
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', () => {})
        },
      },
    },
  },
})
