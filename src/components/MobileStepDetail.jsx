import { useState, useRef, useEffect } from 'react'
import MobileLogModal from './MobileLogModal'
import RedActive      from '@imgs/red-active.svg'
import MagentaActive  from '@imgs/magenta-active.svg'
import YellowActive   from '@imgs/yellow-active.svg'
import GreenActive    from '@imgs/green-active.svg'
import BlueActive     from '@imgs/blue-active.svg'
import RedInactive    from '@imgs/red-inactive.svg'
import MagentaInactive from '@imgs/magenta-inactive.svg'
import YellowInactive from '@imgs/yellow-inactive.svg'
import GreenInactive  from '@imgs/green-inactive.svg'
import BlueInactive   from '@imgs/blue-inactive.svg'
import RobotLogo      from '@imgs/robot-logo.svg'
import SensorIcon     from '@imgs/sensor-icon.svg'
import StepIcon       from '@imgs/step-icon.svg'
import NotIcon        from '@imgs/not-icon.svg'
import VoiceIcon      from '@imgs/voice-icon.svg'

const SEV_ICON = {
  red:     { active: RedActive,     inactive: RedInactive },
  magenta: { active: MagentaActive, inactive: MagentaInactive },
  yellow:  { active: YellowActive,  inactive: YellowInactive },
  green:   { active: GreenActive,   inactive: GreenInactive },
  blue:    { active: BlueActive,    inactive: BlueInactive },
}

// Primary alarm sensor per severity — shown in red as the first table row
const SENSOR_DATA = {
  red:     { name: 'ME Lube Oil Pressure Sensor',          current: '1.2 bar ↓',  normal: '2.5–4.0 bar' },
  magenta: { name: 'Auxiliary Engine Coolant Temperature', current: '102 °C ↑',   normal: '70–90 °C'    },
  yellow:  { name: 'Fuel Oil Viscosity Sensor',            current: '38 cSt ↑',   normal: '10–20 cSt'   },
  green:   { name: 'Air Compressor Discharge Temperature', current: '78 °C ↑',    normal: '40–70 °C'    },
  blue:    { name: 'Bilge Level Sensor – Frame 60',        current: '340 mm ↑',   normal: '< 100 mm'    },
}

// Use relative URL so both HTTP (local) and HTTPS (mobile LAN) work via the Vite proxy
const SERVER = ''

export default function MobileStepDetail({ alarm, suggestion, adjConf, onBack, onNotFeasible, onMarkDone, onVoiceNoteSaved, sessionLog = [], onSelectSuggestion }) {
  const [showLog, setShowLog]   = useState(false)

  // ── Voice recording state ─────────────────────────────────────────
  // recState: 'idle' | 'recording' | 'saving' | 'done' | 'error'
  const [recState,   setRecState]   = useState('idle')
  const [recSeconds, setRecSeconds] = useState(0)
  const mediaRecRef  = useRef(null)
  const chunksRef    = useRef([])
  const timerRef     = useRef(null)
  const savedDurationRef = useRef(0)
  const mimeTypeRef  = useRef('audio/webm')

  // Clean up on unmount
  useEffect(() => () => {
    clearInterval(timerRef.current)
    if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop()
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Pick the best supported MIME type (iOS Safari needs audio/mp4)
      const preferredMime = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg',
      ].find(t => MediaRecorder.isTypeSupported(t)) ?? ''
      const mr = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream)
      mimeTypeRef.current = mr.mimeType || preferredMime || 'audio/webm'
      chunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = handleRecordingStop
      mr.start()
      mediaRecRef.current = mr
      setRecSeconds(0)
      setRecState('recording')
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch {
      setRecState('error')
      setTimeout(() => setRecState('idle'), 3000)
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    savedDurationRef.current = recSeconds   // capture before async onstop fires
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop()
      mediaRecRef.current.stream.getTracks().forEach(t => t.stop())
    }
    setRecState('saving')
  }

  async function handleRecordingStop() {
    const actualMime = mimeTypeRef.current
    const blob    = new Blob(chunksRef.current, { type: actualMime })
    const blobUrl = URL.createObjectURL(blob)   // for local playback in Log
    const reader  = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1]
      try {
        const resp = await fetch(`${SERVER}/api/alarms/${alarm.id}/voice-notes`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestionTitle: suggestion.title,
            duration:  savedDurationRef.current,
            audio:     base64,
            mimeType:  actualMime,
            timestamp: new Date().toISOString(),
          }),
        })
        const saved = await resp.json()   // { id, alarmId, timestamp, duration }
        onVoiceNoteSaved?.({
          blobUrl,
          duration:          savedDurationRef.current,
          savedAt:           new Date(),
          voiceNoteServerId: saved.id,
          mimeType:          actualMime,
        })
        setRecState('done')
        setTimeout(() => setRecState('idle'), 2500)
      } catch {
        setRecState('error')
        setTimeout(() => setRecState('idle'), 3000)
      }
    }
    reader.readAsDataURL(blob)
  }

  function handleVoiceButton() {
    if (recState === 'idle')      startRecording()
    else if (recState === 'recording') stopRecording()
  }
  // ─────────────────────────────────────────────────────────────────

  const icon       = SEV_ICON[alarm.severity]?.[alarm.state]
  const primarySensor = SENSOR_DATA[alarm.severity]
  const displayConf = adjConf ?? suggestion.confidence
  const isHigh     = displayConf >= 75
  const confColor  = isHigh ? '#22c55e' : '#f97316'
  const confLabel  = isHigh ? 'High' : 'Medium'

  return (
    <div className="flex flex-col bg-[#F2F2F2]" style={{ position:'fixed', inset:0, maxWidth:480, margin:'0 auto', overflow:'hidden' }}>

      {showLog && <MobileLogModal alarm={alarm} sessionLog={sessionLog} onClose={() => setShowLog(false)} onSelectSuggestion={(s) => { setShowLog(false); onSelectSuggestion?.(s) }} />}

      {/* ── Dark header ──────────────────────────────────── */}
      <header style={{ background: '#3B3D3F' }} className="flex-shrink-0">
        {/* Back row */}
        <div className="flex items-center gap-2 px-4 pt-4 pb-1">
          <button
            onClick={onBack}
            className="text-[#9B9B9B] hover:text-white transition-colors text-lg leading-none flex-shrink-0 pr-1"
            aria-label="Back"
          >
            ←
          </button>
          <span className="text-xs text-[#9B9B9B] uppercase tracking-wide flex-1">Suggestions List</span>
          <button
            onClick={() => setShowLog(true)}
            className="flex-shrink-0 text-xs text-[#555555] bg-[#5A5C5E] rounded px-3 py-1 hover:bg-[#6A6C6E] transition-colors" style={{ color: '#D0D0D0' }}
          >
            Log
          </button>
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-3 px-4 pt-2 pb-5">
          {icon && (
            <img src={icon} alt={alarm.severity} className="w-6 h-6 flex-shrink-0 mt-0.5" />
          )}
          <h1 className="text-base font-bold text-white leading-snug flex-1">
            {alarm.description}
          </h1>
        </div>
      </header>

      {/* ── Scrollable body ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4" style={{ WebkitOverflowScrolling:'touch', overscrollBehavior:'contain' }}>

        {/* Primary sensor card (red) — same as suggestion list page */}
        {primarySensor && (
          <div className="rounded-lg bg-[#E9E9E9] flex items-center justify-between px-4 py-3 gap-3 mb-4">
            <span className="text-xs text-[#333333] leading-snug flex-1">{primarySensor.name}</span>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-bold text-red-600">{primarySensor.current}</div>
              <div className="text-[10px] text-[#9B9B9B]">normal: {primarySensor.normal}</div>
            </div>
          </div>
        )}

        {/* Suggestion title */}
        <p className="text-base font-bold text-[#111111] mb-1 leading-snug">
          {suggestion.title}
        </p>

        {/* Confidence */}
        <p className="text-xs font-semibold mb-4" style={{ color: confColor }}>
          Confidence: {displayConf}% ({confLabel})
        </p>

        {/* ── Sensor Correlation ────────────────────────── */}
        <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
          {/* Section heading */}
          <div className="flex items-center gap-2 mb-3">
            <img src={SensorIcon} alt="Sensor" className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
              Sensor Correlation
            </span>
          </div>

          {/* Table */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#CCCCCC]">
                <th className="text-left text-[#9B9B9B] font-medium pb-1.5 pr-2">Sensor</th>
                <th className="text-right text-[#9B9B9B] font-medium pb-1.5 pr-2">Current</th>
                <th className="text-right text-[#9B9B9B] font-medium pb-1.5">Normal</th>
              </tr>
            </thead>
            <tbody>
              {/* Correlated sensors from suggestion data only */}
              {(suggestion.sensors ?? []).map((sensor, i) => (
                <tr key={i} className={i < (suggestion.sensors.length - 1) ? 'border-b border-[#CCCCCC]/50' : ''}>
                  <td className="py-1.5 pr-2 text-[#333333] leading-snug">{sensor.name}</td>
                  <td className="py-1.5 pr-2 text-right text-[#333333] whitespace-nowrap">{sensor.current}</td>
                  <td className="py-1.5 text-right text-[#555555] whitespace-nowrap">{sensor.normal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── AI Reasoning ──────────────────────────────── */}
        <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <img src={RobotLogo} alt="AI" className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
              AI Reasoning
            </span>
          </div>
          <p className="text-xs text-[#555555] leading-relaxed">
            {suggestion.reasoning}
          </p>
        </div>

        {/* ── Step Details ──────────────────────────────── */}
        <div className="bg-[#E9E9E9] rounded-lg px-4 pt-3 pb-4 mb-4">
          {/* Section heading */}
          <div className="flex items-center gap-2 mb-3">
            <img src={StepIcon} alt="Steps" className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-semibold text-[#333333] uppercase tracking-wide">
              Step Details
            </span>
          </div>

          {/* Steps list */}
          <ol className="space-y-2.5">
            {(suggestion.steps ?? []).map((step, i) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-xs font-bold text-[#9B9B9B] flex-shrink-0 mt-0.5 w-14">
                  Step {i + 1} –
                </span>
                <span className="text-xs text-[#333333] leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* ── Action buttons ────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-5 pt-2 bg-[#F2F2F2] border-t border-[#E0E0E0]">
        {/* Not feasible / Mark as done */}
        <div className="flex gap-3 mb-3">
          <button
            onClick={onNotFeasible}
            className="flex-1 text-xs font-semibold text-[#555555] bg-[#E9E9E9] rounded-lg py-3 hover:bg-[#DADADA] active:bg-[#CACACA] transition-colors flex items-center justify-center gap-2"
          >
            <img src={NotIcon} alt="" className="w-4 h-4" />
            Not feasible
          </button>
          <button
            onClick={onMarkDone}
            className="flex-1 text-xs font-semibold text-white rounded-lg py-3 hover:opacity-90 active:opacity-80 transition-opacity flex items-center justify-center gap-2"
            style={{ background: '#3B3D3F' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            Mark as Done
          </button>
        </div>

        {/* Voice note */}
        <button
          onClick={handleVoiceButton}
          disabled={recState === 'saving'}
          className={`w-full text-xs font-semibold rounded-lg py-3 transition-colors flex items-center justify-center gap-2 ${
            recState === 'recording' ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' :
            recState === 'saving'    ? 'bg-[#E9E9E9] text-[#9B9B9B] cursor-not-allowed' :
            recState === 'done'      ? 'bg-green-500 text-white' :
            recState === 'error'     ? 'bg-orange-400 text-white' :
            'bg-[#E9E9E9] text-[#555555] hover:bg-[#DADADA]'
          }`}
        >
          {recState === 'idle'      && <><img src={VoiceIcon} alt="" className="w-4 h-4" /> Press to record a voice note</>}
          {recState === 'recording' && `⏹ Recording… ${recSeconds}s — tap to stop`}
          {recState === 'saving'    && '⏳ Saving voice note…'}
          {recState === 'done'      && '✓ Voice note saved!'}
          {recState === 'error'     && '⚠ Mic error — tap to try again'}
        </button>
      </div>
    </div>
  )
}
