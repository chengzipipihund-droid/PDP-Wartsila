/**
 * sensorSimulator.js
 *
 * Reads temperature from an Arduino/DS18B20 over serial (COM port).
 * If serial is unavailable, falls back to a simulated stream.
 *
 * Emits 'anomaly' event when temperature exceeds threshold.
 * The rest of the system (alarmSequencer) listens to this event.
 */

import { EventEmitter } from 'events'
import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'

// ─── Config ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS   = 1000   // read sensor every 1 second (fallback)
const NORMAL_TEMP        = 20     // °C, normal operating temperature (fallback)
const ANOMALY_THRESHOLD  = 26     // °C, above this → anomaly
const ANOMALY_DURATION   = 3      // must exceed threshold for N consecutive reads to confirm
const SERIAL_PORT        = process.env.SENSOR_SERIAL_PORT || 'COM3'
const SERIAL_BAUDRATE    = Number(process.env.SENSOR_BAUDRATE) || 9600
// ────────────────────────────────────────────────────────────────────────────

class SensorSimulator extends EventEmitter {
  constructor () {
    super()
    this.running         = false
    this.intervalId      = null
    this.consecutiveHigh = 0       // count of consecutive reads above threshold
    this.anomalyFired    = false   // prevent duplicate anomaly events per episode
    this.currentTemp     = null    // null means 'no sensor available yet'
    this.lastTempAt      = null    // timestamp of last real reading
    this.serialReady     = false
    this._serialRetryId  = null
  }

  /**
   * Start polling the sensor.
   * Emits:
   *   'reading'  { temp, timestamp }         — every poll cycle
   *   'anomaly'  { temp, timestamp, reason } — when anomaly confirmed
   *   'normal'   { temp, timestamp }         — when temp returns to normal
   */
  start () {
    if (this.running) return
    this.running = true
    console.log('[SensorSimulator] Started polling every', POLL_INTERVAL_MS, 'ms')

    // Skip serial if disabled (temperature comes via UDP from Python instead).
    if (SERIAL_PORT && SERIAL_PORT.toUpperCase() !== 'COM_NONE') {
      this._initSerial()
    } else {
      console.log('[SensorSimulator] Serial disabled (COM_NONE) — temperature via UDP only')
    }

    this.intervalId = setInterval(() => {
      const reading = this._readSensor()
      this.emit('reading', reading)
      this._evaluate(reading)
    }, POLL_INTERVAL_MS)
  }

  stop () {
    if (!this.running) return
    clearInterval(this.intervalId)
    this.running = false
    console.log('[SensorSimulator] Stopped')

    if (this.serialPort && this.serialPort.isOpen) {
      this.serialPort.close(err => {
        if (err) console.warn('[SensorSimulator] Failed to close serial port:', err.message)
        else console.log('[SensorSimulator] Serial port closed')
      })
    }

    if (this._serialRetryId) {
      clearTimeout(this._serialRetryId)
      this._serialRetryId = null
    }
  }

  /**
   * Manually inject an anomaly — useful for demo / testing.
   * Call this from a REST endpoint: POST /api/ai/simulate-anomaly
   */
  injectAnomaly (temp = 97) {
    console.log('[SensorSimulator] Manual anomaly injected, temp =', temp)
    this._setTemp(temp)
  }

  /**
   * Update the current temperature from the serial port, then emit the usual events.
   */
  _setTemp (temp) {
    this.currentTemp = temp
    this.lastTempAt  = Date.now()
    const reading = { temp, timestamp: new Date().toISOString() }
    this.emit('reading', reading)
    this._evaluate(reading, true /* force */)
  }

  /** Reset so a new anomaly episode can be triggered */
  reset () {
    this.consecutiveHigh = 0
    this.anomalyFired    = false
    this.currentTemp     = NORMAL_TEMP
    console.log('[SensorSimulator] Reset — ready for next episode')
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /**
   * Attempt to open the serial port and wire up the DS18B20 output.
   */
  _initSerial () {
    if (this.serialReady) return

    try {
      this.serialPort = new SerialPort({
        path: SERIAL_PORT,
        baudRate: SERIAL_BAUDRATE,
        autoOpen: false,
        lock: false,              // allow opening even if another process has the port open
      })

      const parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }))

      parser.on('data', line => {
        const trimmed = line.trim()
        // Parse lines like "Temperature: 22.44 ??C" or just "22.44"
        const match = trimmed.match(/(\d+\.\d+)/)
        if (!match) return
        const parsed = Number(match[1])
        if (!Number.isFinite(parsed)) return
        console.log('[SensorSimulator] Received temp from Arduino:', parsed, '°C')
        this.lastTempAt = Date.now()
        this._setTemp(parsed)
      })

      this.serialPort.open(err => {
        if (err) {
          console.warn('[SensorSimulator] Failed to open serial port', SERIAL_PORT, '-', err.message)
          this.serialReady = false
          this.emit('serial-status', { connected: false, message: err.message })
          this._scheduleSerialRetry()
          return
        }
        console.log('[SensorSimulator] Serial port opened:', SERIAL_PORT)
        this.serialReady = true
        this.emit('serial-status', { connected: true, message: 'Connected' })
      })

      this.serialPort.on('error', err => {
        console.warn('[SensorSimulator] Serial port error:', err.message)
        this.serialReady = false
        this.emit('serial-status', { connected: false, message: err.message })
        this._scheduleSerialRetry()
      })
    } catch (err) {
      console.warn('[SensorSimulator] Serial init failed:', err.message)
      this._scheduleSerialRetry()
    }
  }

  _scheduleSerialRetry () {
    if (this._serialRetryId) return
    this._serialRetryId = setTimeout(() => {
      this._serialRetryId = null
      if (!this.running) return
      console.log('[SensorSimulator] Retrying serial port open...')
      this._initSerial()
    }, 5000)
  }

  /**
   * In production: replace with real hardware read.
   * Here we just return the current simulated temperature.
   */
  _readSensor () {
    // Return null if no real reading has arrived in the last 5 seconds
    // (covers Arduino unplug, serial loss, UDP timeout, etc.)
    const stale = !this.lastTempAt || (Date.now() - this.lastTempAt) > 5000
    return { temp: stale ? null : this.currentTemp, timestamp: new Date().toISOString() }
  }

  _evaluate ({ temp, timestamp }, force = false) {
    if (temp > ANOMALY_THRESHOLD) {
      this.consecutiveHigh++

      if ((this.consecutiveHigh >= ANOMALY_DURATION || force) && !this.anomalyFired) {
        this.anomalyFired = true
        const reason = `Temperature ${temp}°C exceeded threshold ${ANOMALY_THRESHOLD}°C for ${this.consecutiveHigh} consecutive readings`
        console.log('[SensorSimulator] ANOMALY confirmed:', reason)
        this.emit('anomaly', { temp, timestamp, reason })
      }
    } else {
      // Temperature returned to normal
      if (this.anomalyFired) {
        this.emit('normal', { temp, timestamp })
        this.anomalyFired    = false
        this.consecutiveHigh = 0
        console.log('[SensorSimulator] Temperature returned to normal')
      } else {
        this.consecutiveHigh = 0
      }
    }
  }
}

// Singleton — the whole server shares one simulator instance
export const sensorSimulator = new SensorSimulator()
