/**
 * Cross-checks src/data/customs-act.json against the TOC (Arrangement of
 * Sections) region in extracted_raw.txt and reports discrepancies.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const RAW_PATH = join(APP_ROOT, '..', 'extracted_raw.txt')
const JSON_PATH = join(APP_ROOT, 'src', 'data', 'customs-act.json')

const rawLines = readFileSync(RAW_PATH, 'utf8').split(/\r?\n/)
const act = JSON.parse(readFileSync(JSON_PATH, 'utf8'))

// TOC region = everything before the last "CUSTOMS ACT 1967" title line.
let bodyStart = -1
for (let i = rawLines.length - 1; i >= 0; i--) {
  if (rawLines[i].trim() === 'CUSTOMS ACT 1967') { bodyStart = i; break }
}
const toc = rawLines.slice(0, bodyStart).join('\n')

// Extract section tokens from TOC: "12A." style tokens, skipping the word
// "Sections ... (Deleted)" summary lines and stray dots (e.g. "No. 42").
const tocTokens = []
const tokenRe = /(?:^|\s|\r)(\d{1,3})([A-Za-z]{0,3})\.(?!\d)/g
let m
while ((m = tokenRe.exec(toc))) {
  const num = m[1] + m[2].toUpperCase()
  const n = parseInt(m[1], 10)
  if (n >= 1 && n <= 170) tocTokens.push(num)
}
// Deduplicate consecutive TOC tokens that repeat (numbers can appear once each).
const seen = new Set()
const tocList = tocTokens.filter((t) => (seen.has(t) ? false : (seen.add(t), true)))

const jsonList = act.parts.flatMap((p) => p.sections.map((s) => s.number))

const onlyToc = tocList.filter((t) => !jsonList.includes(t))
const onlyJson = jsonList.filter((t) => !tocList.includes(t))

console.log(`TOC sections: ${tocList.length}, JSON sections: ${jsonList.length}`)
console.log(`In TOC but not JSON: ${onlyToc.join(', ') || '(none)'}`)
console.log(`In JSON but not TOC: ${onlyJson.join(', ') || '(none)'}`)

// Order check on the numeric part
let orderIssues = 0
let prev = 0
for (const num of jsonList) {
  const n = parseInt(num, 10)
  if (n < prev) { console.log(`Order: ${num} after ${prev}`); orderIssues++ }
  prev = n
}
if (!orderIssues) console.log('Order: OK')

// Headings sanity: none should contain "(1)" or "subsection"
const badHeadings = act.parts.flatMap((p) =>
  p.sections.filter((s) => /\(\d+\)|subsection|".*"/.test(s.heading)).map((s) => `${s.number}: ${s.heading.slice(0, 90)}`))
console.log(`Suspicious headings: ${badHeadings.length}`)
for (const b of badHeadings) console.log('  ! ' + b)
