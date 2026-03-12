/**
 * promptBuilder.js
 *
 * Builds the two types of prompts used in this system:
 *
 *   buildGroupingPrompt(manualText, alarms)
 *     → used ONCE when all 4 alarms have fired
 *     → returns: group, rootCauseId, suggestions (titles + steps)
 *
 *   buildReasoningPrompt(alarms, suggestion)
 *     → used PER SUGGESTION when user opens the detail panel
 *     → returns: confidence, reasoning, sensorData
 */

import { getFakeSensorIds } from './fakeSensors.js'

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 1 — PDF Grouping + Suggestions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string}   manualText - plain text extracted from maintenance PDF
 * @param {object[]} alarms     - array of triggered alarms, in firing order
 * @returns {{ systemPrompt, userPrompt }}
 */
export function buildGroupingPrompt (manualText, alarms) {
  const alarmList = alarms
    .map((a, i) =>
      `${i + 1}. [T+${i * 5}s]  ID: ${a.id} | "${a.description}" | Severity: ${a.severity}`
    )
    .join('\n')

  const systemPrompt = `You are a marine engine maintenance assistant.
Analyze alarms using ONLY the provided maintenance manual.
You must return ONLY a single valid JSON object — no explanation, no markdown, no text outside JSON.`

  const userPrompt = `MAINTENANCE MANUAL EXCERPT:
${manualText}

---

TRIGGERED ALARMS (in order of occurrence, 5 seconds apart):
${alarmList}

Based solely on the manual above:
1. Which alarm IDs belong to the same root cause group?
2. Which alarm is the root cause? (The earliest alarm is a strong signal.)
3. What are the recommended actions for the root cause alarm? (you determine the number of suggestions based on the manual content, no more than 3)
4. What are the specific numbered steps for each action (you determine the number of suggestions based on the manual content, within 3 - 5 steps)?

Return EXACTLY this JSON structure (no other text):
{
  "group": ["id1", "id2", "id3", "id4"],
  "rootCauseId": "id1",
  "suggestions": [
    {
      "id": "s1",
      "title": "<action title extracted from manual>",
      "steps": [
        { "order": 1, "text": "<step text extracted from manual>" },
        { "order": 2, "text": "<step text extracted from manual>" }
      ]
    },
    {
      "id": "s2",
      "title": "<action title extracted from manual>",
      "steps": [
        { "order": 1, "text": "<step text extracted from manual>" }
      ]
    },
    {
      "id": "s3",
      "title": "<action title extracted from manual>",
      "steps": [
        { "order": 1, "text": "<step text extracted from manual>" }
      ]
    }
  ]
}

IMPORTANT:
- Replace ALL <...> placeholders with actual content from the manual, try to be concise but informative.
- Do NOT copy the placeholder text literally
- If the manual does not specify steps for an action, return an empty steps array []`

  return { systemPrompt, userPrompt }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT 2 — Reasoning + Confidence + Sensor Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {object}   rootCause    - the root cause alarm object
 * @param {object}   suggestion  - one suggestion object from grouping result
 * @param {string}   sensorListText - formatted sensor list from fakeSensors.js
 * @returns {{ systemPrompt, userPrompt }}
 */
export function buildReasoningPrompt (rootCause, suggestion, sensorListText) {
  const stepList = suggestion.steps
    .map(s => `   ${s.order}. ${s.text}`)
    .join('\n')

  const systemPrompt = `You are a marine engine diagnostic AI assistant.
Generate a confidence score and engineering reasoning for a suggested repair action.
Return ONLY valid JSON — no explanation, no markdown, no text outside JSON.`

  const userPrompt = `ROOT CAUSE ALARM: "${rootCause.description}"
  Anomaly reason: ${rootCause.anomalyReason}

CURRENT SENSOR READINGS (situation awareness):
${sensorListText}

SUGGESTED ACTION BEING EVALUATED:
  Title: "${suggestion.title}"
  Steps:
${stepList}

TASK:
1. Rate confidence (0-100) that this action addresses the root cause.
2. Write 2 sentences of engineering reasoning referencing the alarms and sensors, maximum 40 words.
3. From the sensor list above, pick the 2 sensor IDs most relevant to THIS specific suggestion.
   Choose the sensors whose readings best justify or contextualise this action.

Return EXACTLY this JSON (no other text):
{
  "confidence": 91,
  "reasoning": "2           sentences explaining why this action is the right response, referencing specific sensor values and the alarm sequence.",
  "relevantSensorIds": ["sensor_id_1", "sensor_id_2"]
}

Rules for relevantSensorIds:
- Only use ids from the sensor list above: ${getFakeSensorIds()}
- Pick most physically related to the steps in this suggestion`

  return { systemPrompt, userPrompt }
}
