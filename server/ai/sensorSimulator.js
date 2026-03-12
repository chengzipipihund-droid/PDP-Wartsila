/**
 * sensorSimulator.js
 *
 * Simulates a real-time temperature sensor stream.
 * In production: replace readSensor() with actual hardware SDK call.
 *
 * Emits 'anomaly' event when temperature exceeds threshold.
 * The rest of the system (alarmSequencer) listens to this event.
 */

import { EventEmitter } from 'events'

// ─── Config ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS  = 1000   // read sensor every 1 second
const NORMAL_TEMP       = 72     // °C, normal operating temperature
const ANOMALY_THRESHOLD = 90     // °C, above this → anomaly
const ANOMALY_DURATION  = 3      // must exceed threshold for N consecutive reads to confirm
// ────────────────────────────────────────────────────────────────────────────

class SensorSimulator extends EventEmitter {
  constructor () {
    super()
    this.running         = false
    this.intervalId      = null
    this.consecutiveHigh = 0       // count of consecutive reads above threshold
    this.anomalyFired    = false   // prevent duplicate anomaly events per episode
    this.currentTemp     = NORMAL_TEMP
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
  }

  /**
   * Manually inject an anomaly — useful for demo / testing.
   * Call this from a REST endpoint: POST /api/ai/simulate-anomaly
   */
  injectAnomaly (temp = 97) {
    console.log('[SensorSimulator] Manual anomaly injected, temp =', temp)
    this.currentTemp = temp
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
   * In production: replace with real hardware read.
   * Here we just return the current simulated temperature.
   */
  _readSensor () {
    // Add small noise to make the stream look realistic
    const noise = (Math.random() - 0.5) * 2   // ±1°C
    const temp  = Math.round((this.currentTemp + noise) * 10) / 10
    return { temp, timestamp: new Date().toISOString() }
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
