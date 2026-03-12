// Entry point
import express from 'express'
import http from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

import { attachWebSocket } from './websocket.js'
import alarmRouter from './routes/alarms.js'
import voiceNoteRouter from './routes/voiceNotes.js'
import sessionLogRouter from './routes/sessionLog.js'
import { setupAI } from './ai/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app    = express()
const server = http.createServer(app)
const wss    = new WebSocketServer({ server })

app.use(cors())
app.use(express.json({ limit: '20mb' }))
app.use(express.static(path.join(__dirname, '..', 'dist')))
app.use(express.static('public'))
app.use('/imgs', express.static(path.join(__dirname, '..', 'imgs')))

attachWebSocket(wss)
setupAI(app, wss)          // AI subsystem — sensor + alarm sequencer + routes

app.use('/api/alarms',     alarmRouter)
app.use('/api/alarms/:id', sessionLogRouter)
app.use('/api',            voiceNoteRouter)

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

const PORT = process.env.PORT || 3000
const HOST = '0.0.0.0'

server.listen(PORT, HOST, () => {
  console.log('Server running on http://localhost:' + PORT)
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const net of ifaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('Network: http://' + net.address + ':' + PORT)
      }
    }
  }
})
