/**
 * pdfParser.js
 *
 * Extracts plain text from manual_v2.pdf and returns it as a string
 * to be passed directly into the AI prompt.
 * Result is cached after first load.
 */

import fs   from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PDF_PATH = path.join(__dirname, 'manual_v2.pdf')

// Limit characters sent to the model to avoid token overflow (~12 000 chars ≈ 3 000 tokens)
const MAX_CHARS = 12000

let _cachedText = null

/**
 * Returns the plain-text content of manual_v2.pdf.
 * Cached after first load.
 */
export async function getManualText () {
  if (_cachedText) return _cachedText

  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`[pdfParser] manual_v2.pdf not found at ${PDF_PATH}`)
  }

  const { PDFParse } = await import('pdf-parse')
  const buffer = fs.readFileSync(PDF_PATH)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()

  _cachedText = result.text.slice(0, MAX_CHARS)
  console.log('[pdfParser] Loaded manual_v2.pdf —', _cachedText.length, 'chars')
  return _cachedText
}

/** Clear cache (call if the PDF is replaced at runtime) */
export function clearManualCache () {
  _cachedText = null
}
