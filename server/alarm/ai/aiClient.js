/**
 * aiClient.js
 *
 * Calls local Ollama and parses structured JSON responses.
 *
 * Two public functions:
 *   analyseWithPDF(alarms)               → PDFAnalysisResult
 *   generateReasoning(alarms, suggestion) → ReasoningResult
 *
 * ─── Configuration (.env) ─────────────────────────────────────────────────────
 *
 *   AI_MODEL=llama3.2           # model name served by Ollama  (ollama list)
 *   OLLAMA_BASE_URL=http://localhost:11434/v1   # default Ollama endpoint
 *
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Return schemas:
 *
 * PDFAnalysisResult = {
 *   group: string[],
 *   rootCauseId: string,
 *   suggestions: {
 *     id: string,
 *     title: string,
 *     steps: { order: number, text: string }[]
 *   }[]   // always 3 entries
 * }
 *
 * ReasoningResult = {
 *   confidence: number,          // 0-100
 *   reasoning: string,           // 3-5 sentences
 *   sensorData: {                // exactly 2 — AI-selected from FAKE_SENSORS
 *     id: string,
 *     name: string,
 *     value: string, normalRange: string,
 *     status: 'critical' | 'warning' | 'normal'
 *   }[]
 * }
 */

import OpenAI from 'openai'
import { getManualText }        from './pdfParser.js'
import { buildGroupingPrompt, buildReasoningPrompt } from './promptBuilder.js'
import { getSensorListText, getSensorsByIds } from './fakeSensors.js'

// Lazily initialised
let _client = null

function getClient () {
  if (_client) return _client
  // Uses the OpenAI-compatible API that Ollama exposes at /v1
  const baseURL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1'
  _client = new OpenAI({ baseURL, apiKey: 'ollama' })
  console.log('[aiClient] Ollama baseURL:', baseURL, '| model:', _modelName())
  return _client
}

function _modelName () {
  // Change AI_MODEL in .env to match what you have installed — run `ollama list`
  return process.env.AI_MODEL || 'minimax-m2.5:cloud'
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Call 1: PDF Analysis
 * Given triggered alarms, returns grouping + suggestions from manual.
 *
 * @param   {object[]} alarms
 * @returns {Promise<PDFAnalysisResult>}
 *
 * PDFAnalysisResult = {
 *   group: string[],
 *   rootCauseId: string,
 *   suggestions: {
 *     id: string,
 *     title: string,
 *     steps: { order: number, text: string }[]
 *   }[]
 * }
 */
export async function analyseWithPDF (alarms, onThinkingToken, signal) {
  const manualText               = await getManualText()
  const { systemPrompt, userPrompt } = buildGroupingPrompt(manualText, alarms)

  const raw    = await _callAI(systemPrompt, userPrompt, onThinkingToken, signal)
  const result = _parseJSON(raw, 'analyseWithPDF')

  // Basic validation
  if (!result.group || !result.rootCauseId || !Array.isArray(result.suggestions)) {
    throw new Error('analyseWithPDF: AI returned unexpected structure: ' + JSON.stringify(result))
  }
  if (result.suggestions.length !== 3) {
    console.warn('[aiClient] Expected 3 suggestions, got', result.suggestions.length)
  }

  return result
}

/**
 * Call 2: Reasoning + Confidence
 * Given the root cause alarm and one suggestion, returns confidence, reasoning, sensor data.
 *
 * @param   {object} rootCauseAlarm — alarm with isRootCause === true
 * @param   {object} suggestion     — one entry from analyseWithPDF().suggestions
 * @returns {Promise<ReasoningResult>}
 *
 * ReasoningResult = {
 *   confidence: number,
 *   reasoning: string,
 *   sensorData: {
 *     name: string,
 *     value: string, normalRange: string,
 *     status: 'critical' | 'warning' | 'normal'
 *   }[]
 * }
 */
export async function generateReasoning (rootCauseAlarm, suggestion, onThinkingToken, signal) {
  const sensorListText = getSensorListText()
  const { systemPrompt, userPrompt } = buildReasoningPrompt(rootCauseAlarm, suggestion, sensorListText)

  const raw    = await _callAI(systemPrompt, userPrompt, onThinkingToken, signal)
  const result = _parseJSON(raw, 'generateReasoning')

  // Basic validation
  if (typeof result.confidence !== 'number') {
    throw new Error('generateReasoning: missing confidence in AI response')
  }

  // Resolve the 2 sensor IDs the AI chose → full sensor objects
  // If AI returned garbage ids, falls back to first 2 sensors
  const chosenIds = Array.isArray(result.relevantSensorIds)
    ? result.relevantSensorIds.slice(0, 2)
    : []
  const resolved = getSensorsByIds(chosenIds)
  result.sensorData = resolved.length > 0
    ? resolved
    : getSensorsByIds(['crankcase_vibration', 'lube_oil_pressure'])

  // Remove the raw ids field from the response — UI only needs sensorData
  delete result.relevantSensorIds

  return result
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function _callAI (systemPrompt, userPrompt, onThinkingToken, signal) {
  const client = getClient()
  const model  = _modelName()

  const requestParams = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt   },
    ],
    temperature : 0.1,    // Very low temperature to enforce strict JSON output
    max_tokens  : 1200,   // Allow enough for structured JSON
    stream      : true,   // always stream so we can capture thinking tokens
  }

  const stream = await client.chat.completions.create(requestParams, { signal })

  let fullContent  = ''
  let thinkBuf     = ''

  for await (const chunk of stream) {
    if (signal?.aborted) break
    const delta = chunk.choices[0]?.delta
    if (!delta) continue

    // ── Thinking tokens (minimax via Ollama exposes as delta.reasoning) ────────
    if (delta.reasoning) {
      thinkBuf += delta.reasoning
      if (onThinkingToken) onThinkingToken(delta.reasoning)
    }
    // Also handle delta.reasoning_content (deepseek-r1 style)
    if (delta.reasoning_content) {
      thinkBuf += delta.reasoning_content
      if (onThinkingToken) onThinkingToken(delta.reasoning_content)
    }

    // ── Some models wrap thinking in <think>...</think> inside content ───────
    if (delta.content) {
      const thinkMatch = delta.content.match(/<think>([\s\S]*?)<\/think>/g)
      if (thinkMatch) {
        thinkMatch.forEach(block => {
          const inner = block.replace(/<\/?think>/g, '')
          if (onThinkingToken) onThinkingToken(inner)
        })
        // Strip think blocks from content
        fullContent += delta.content.replace(/<think>[\s\S]*?<\/think>/g, '')
      } else {
        fullContent += delta.content
      }
    }
  }

  return fullContent || thinkBuf  // fallback: if model put everything in thinking
}

function _parseJSON (raw, caller) {
  if (!raw) throw new Error(`${caller}: AI returned empty response`)

  // First try direct parse (works for well-behaved Ollama responses)
  try {
    return JSON.parse(raw)
  } catch (_) {}

  // Ollama sometimes wraps JSON in markdown code fences: ```json ... ```
  // Extract the first JSON block
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      return JSON.parse(fenceMatch[1].trim())
    } catch (_) {}
  }

  // Last resort: find the outermost { ... } block
  const braceStart = raw.indexOf('{')
  const braceEnd   = raw.lastIndexOf('}')
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      console.log(`[aiClient] Extracted JSON from position ${braceStart} to ${braceEnd}`)
      return JSON.parse(raw.slice(braceStart, braceEnd + 1))
    } catch (err) {
      console.log(`[aiClient] Failed to parse extracted JSON: ${err.message}`)
    }
  }

  console.error(`[aiClient] ${caller}: failed to parse JSON. Raw response (first 300 chars):`)
  console.error(raw?.slice(0, 300))
  throw new Error(`${caller}: AI returned invalid JSON`)
}
