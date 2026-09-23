/**
 * Parser for Malaysia's Customs Regulations 2019 (P.U. (A) 397).
 * Reads ../../reg_raw.txt (project root — extracted from reg.pdf, which is
 * bilingual: Bahasa Melayu first, then the English text) and emits
 * ../src/data/customs-reg.json with parts -> regulations -> blocks in both
 * languages, plus the six schedules (the Sixth is listed in the Arrangement
 * but has no body in the gazette, so it gets a clearly-marked placeholder).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const RAW_PATH = join(APP_ROOT, '..', 'reg_raw.txt')
const OUT_PATH = join(APP_ROOT, 'src', 'data', 'customs-reg.json')

const warnings = []

/* ---------------------------------------------------------------- helpers */

const PART_RE = /^(PART|BAHAGIAN)\s+([IVXLCD]+[A-Z]*)\.?\s*(.*)$/
const REG_RE = /^(\d{1,2})\s*\.\s*(.*)$/
const ITEM_RE = /^\((?:[a-z]{1,3}|\d{1,2}|[ivxlIVXL]{1,5})\)\s/
const ANNOTATION_LINE_RE = /^\[.*\]$/
const ALL_CAPS_RE = /^[A-Z0-9 ,'&\-\.'\u2019\/()]+$/
const REGREF_RE = /^\(\s*(?:Peraturan|Regulation)\s+\d+\s*\)$/i
const BM_SCHED_RE = /^JADUAL\s+(PERTAMA|KEDUA|KETIGA|KEEMPAT|KELIMA|KEENAM)\s*$/
const EN_SCHED_RE = /^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH)\s+SCHEDULE\s*$/
const SCHED_WORD_BM = { FIRST: 'PERTAMA', SECOND: 'KEDUA', THIRD: 'KETIGA', FOURTH: 'KEEMPAT', FIFTH: 'KELIMA', SIXTH: 'KEENAM' }

function isAllCaps(text) {
  const letters = text.replace(/[^A-Za-z]/g, '')
  if (!letters) return false
  return ALL_CAPS_RE.test(text) && text.replace(/[^A-Z]/g, '').length / letters.length > 0.9
}

function validRegNumber(n, rest) {
  const num = parseInt(n, 10)
  if (!(num >= 1 && num <= 60)) return false
  if (/^\d/.test(rest)) return false // e.g. "8.00 a.m." — a time, not regulation 8
  return true
}

function isPageFurniture(t) {
  return t === 'P.U. (A) 397' || /^\d{1,3}$/.test(t) || t === 'Regulation' || t === 'Peraturan'
}

/** Barriers that always end a heading block when walking backwards. */
function isHeadingBarrier(text) {
  if (PART_RE.test(text) || isAllCaps(text)) return true // part headers / titles
  if (/\.$/.test(text) && !/\b(dsb|etc|No|Bhd|Sdn|Co|Ltd)\.$/.test(text)) return true
  if (/;\s*$/.test(text) || /--\s*$/.test(text)) return true
  if (text.length > 200 || /^["[]/.test(text) || ITEM_RE.test(text)) return true
  return false
}

/* ------------------------------------------------------------------ load */

const rawLines = readFileSync(RAW_PATH, 'utf8').split(/\r?\n/)

function findIdx(pred, from = 0) {
  for (let i = from; i < rawLines.length; i++) if (pred(rawLines[i], i)) return i
  return -1
}

const bmBodyStart = findIdx((l) => /^PADA menjalankan kuasa/.test(l))
const enBodyStart = findIdx((l) => /^IN exercise of the powers/.test(l))
// EN half starts at "CUSTOMS REGULATIONS 2019" followed by "ARRANGEMENT OF REGULATIONS".
const enArrStart = findIdx((l, i) => l.trim() === 'CUSTOMS REGULATIONS 2019' &&
  rawLines.slice(i + 1, i + 4).some((x) => x.trim() === 'ARRANGEMENT OF REGULATIONS'))
const bmSchedStart = findIdx((l) => BM_SCHED_RE.test(l.trim()), bmBodyStart)
const enSchedStart = findIdx((l) => EN_SCHED_RE.test(l.trim()), enBodyStart)
if (bmBodyStart < 0 || enBodyStart < 0 || enArrStart < 0 || bmSchedStart < 0 || enSchedStart < 0) {
  throw new Error('Could not locate language/schedule boundaries')
}

/* Strip \f page-breaks, page furniture, and running heads into logical lines. */
function preprocess(slice) {
  const out = []
  let pendingBreak = false
  let headerBudget = 0 // lines right after a page break that may hold page furniture
  for (const raw of slice) {
    let line = raw
    if (line.startsWith('\f')) { pendingBreak = true; headerBudget = 3; line = line.slice(1) }
    const t = line.trim()
    if (t === '') continue
    if (headerBudget > 0) {
      headerBudget--
      if (isPageFurniture(t)) continue
    }
    out.push({ text: t, pageBreak: pendingBreak })
    pendingBreak = false
  }
  return out
}

/* Extract the "the Minister makes the following regulations:" preamble. */
function extractPreamble(startLineRe, stopRe, from) {
  const idx = findIdx((l) => startLineRe.test(l), from)
  const buf = []
  for (let i = idx; i < rawLines.length; i++) {
    const t = rawLines[i].trim()
    if (!t) continue
    if (i !== idx && stopRe.test(t)) break
    buf.push(t)
  }
  return buf.join(' ')
}

/* ------------------------------------------------------- TOC headings (EN + BM) */

/** Parse the Arrangement of Regulations into a Map of regulation number -> heading. */
function parseToc(slice) {
  const map = new Map()
  let current = null
  for (const { text } of slice) {
    if (BM_SCHED_RE.test(text) || EN_SCHED_RE.test(text)) { current = null; continue }
    if (PART_RE.test(text)) { current = null; continue }
    if (isPageFurniture(text)) continue
    const m = REG_RE.exec(text)
    if (m && validRegNumber(m[1], m[2])) {
      current = m[1]
      map.set(current, m[2].trim())
    } else if (current && map.has(current)) {
      map.set(current, `${map.get(current)} ${text}`.replace(/\s+/g, ' ').trim())
    }
  }
  return map
}

/* ------------------------------------------------------------- body parser */

/**
 * Parse one language half of the regulations body into parts + regulations.
 * Headings are collected by walking backwards from each regulation start over
 * heading-like lines (multi-line headings wrap in the narrow gazette columns).
 */
function parseBody(logical, { partWord }) {
  // Pass 1: mark heading lines. Walk backwards from each regulation start over
  // heading-like lines, allowing at most two wrapped continuation lines that
  // start lowercase (gazette line-wrapping), and requiring the topmost
  // collected line to be a normal heading-like (uppercase) start.
  const headingMark = new Set()
  for (let u = 0; u < logical.length; u++) {
    const text = logical[u].text
    const m = REG_RE.exec(text)
    if (!m || !validRegNumber(m[1], m[2])) continue
    const collected = []
    let lowerUsed = 0
    for (let i = u - 1; i >= 0 && u - i <= 8; i--) {
      const t = logical[i].text
      if (!t) continue
      if (ANNOTATION_LINE_RE.test(t)) continue
      if (headingMark.has(i)) break
      if (isHeadingBarrier(t)) break
      if (/^[A-Z0-9]/.test(t)) { collected.push(i); continue }
      if (lowerUsed >= 2) break
      lowerUsed++
      collected.push(i)
    }
    if (collected.length && !/^[A-Z0-9]/.test(logical[collected[collected.length - 1]].text)) {
      collected.length = 0 // topmost line is not a heading start — not a heading block
    }
    for (const i of collected) headingMark.add(i)
  }

  // Pass 2: build parts + regulations.
  const parts = []
  let currentPart = null
  let currentReg = null
  let headingBuffer = []

  function newPart(label, titleInline) {
    const part = { id: `p-${label}`, label, title: titleInline || '', sections: [] }
    parts.push(part)
    currentPart = part
    currentReg = null
    return part
  }

  function addBlock(reg, text) {
    if (text.startsWith('"')) {
      const termMatch = /^"([^"]*)"\s*(.*)$/.exec(text)
      reg.content.push({ kind: 'quote', term: termMatch ? termMatch[1].trim() : '', text: termMatch ? termMatch[2].trim() : text, annotation: '', items: [] })
      return
    }
    const last = reg.content[reg.content.length - 1]
    if (ITEM_RE.test(text)) {
      if (last && last.kind === 'quote') { last.items.push(text); return }
      reg.content.push({ kind: 'item', text, annotation: '' })
      return
    }
    // Plain line: a wrapped continuation of the previous block, else a paragraph.
    if (last && last.kind === 'quote') { last.text = `${last.text} ${text}`.replace(/\s+/g, ' '); return }
    if (last && (last.kind === 'paragraph' || last.kind === 'item')) { last.text = `${last.text} ${text}`.replace(/\s+/g, ' '); return }
    reg.content.push({ kind: 'paragraph', text, annotation: '' })
  }

  for (let i = 0; i < logical.length; i++) {
    const { text } = logical[i]

    if (PART_RE.test(text)) {
      const m = PART_RE.exec(text)
      const label = m[2]
      let title = m[3].trim()
      // Consume following ALL-CAPS lines as the (possibly wrapped) part title.
      if (!title || isAllCaps(logical[i + 1]?.text ?? '')) {
        const more = []
        let j = i + 1
        while (j < logical.length && isAllCaps(logical[j].text) && !REG_RE.test(logical[j].text) && !ITEM_RE.test(logical[j].text)) {
          more.push(logical[j].text)
          j++
        }
        if (more.length) { title = [title, ...more].filter(Boolean).join(' '); i = j - 1 }
      }
      newPart(label, title)
      continue
    }

    const m = REG_RE.exec(text)
    if (m && validRegNumber(m[1], m[2]) && !headingMark.has(i)) {
      const number = m[1]
      const heading = headingBuffer.join(' ').replace(/\s+/g, ' ').trim()
      headingBuffer = []
      const reg = { id: `r-${number}`, number, heading: heading || '(No heading)', content: [] }
      currentReg = reg
      if (m[2].trim()) addBlock(reg, m[2].trim())
      if (currentPart) currentPart.sections.push(reg)
      else warnings.push(`${partWord} missing before regulation ${number}`)
      if (!heading) warnings.push(`Regulation ${number}: empty heading`)
      continue
    }

    if (headingMark.has(i)) { headingBuffer.push(text); continue }

    if (currentReg) {
      if (ANNOTATION_LINE_RE.test(text)) {
        const last = currentReg.content[currentReg.content.length - 1]
        if (last) last.annotation = last.annotation ? `${last.annotation} ${text}` : text
      } else {
        addBlock(currentReg, text)
      }
    } else {
      warnings.push(`Orphan line outside any regulation: "${text.slice(0, 80)}"`)
    }
  }
  return parts
}

/* ------------------------------------------------------- schedules parser */

/** Parse one language's schedules span into schedule objects. */
function parseSchedules(logical, { schedRe, labelOf }) {
  const schedules = []
  const byWord = new Map()
  let current = null
  let madeNote = null
  let expectTitle = false

  function pushLine(text) {
    if (!current) return
    const blocks = current.blocks
    const last = blocks[blocks.length - 1]
    if (ITEM_RE.test(text)) { blocks.push({ kind: 'item', text, annotation: '' }); return }
    // Plain line: wrapped continuation of the previous block, else a paragraph.
    if (last && (last.kind === 'paragraph' || last.kind === 'item')) {
      last.text = `${last.text} ${text}`.replace(/\s+/g, ' ')
      return
    }
    blocks.push({ kind: 'paragraph', text, annotation: '' })
  }

  for (const { text } of logical) {
    if (/^(Dibuat|Made)\s+\d/.test(text)) { madeNote = [text]; current = null; continue }
    if (madeNote) { madeNote.push(text); continue }
    const m = schedRe.exec(text)
    if (m) {
      const word = labelOf(m[1])
      if (!byWord.has(word)) {
        current = { label: word, regRef: '', title: '', blocks: [] }
        byWord.set(word, current)
        schedules.push(current)
        expectTitle = true
        continue
      }
      current = byWord.get(word) // repeated page header — continue the same schedule
      expectTitle = true // a repeated title line may follow
      continue
    }
    if (!current) continue
    if (REGREF_RE.test(text)) { if (!current.regRef) current.regRef = text; continue }
    if (expectTitle) {
      expectTitle = false
      const isTitleCandidate =
        !ITEM_RE.test(text) && !PART_RE.test(text) && !/^\d/.test(text) &&
        !text.endsWith(':') && text.length <= 60
      if (isTitleCandidate) {
        if (!current.title) current.title = text
        continue // first-occurrence title or repeated page-header title
      }
      // fall through: not a title line — treat as content
    }
    pushLine(text)
  }
  return { schedules, madeNote }
}

/* ------------------------------------------------------------------- run */

const bmSlice = rawLines.slice(0, enArrStart)
const enSlice = rawLines.slice(enArrStart)

// TOC slices: the Arrangement of Regulations at the top of each language half.
const bmTocSlice = preprocess(bmSlice.slice(0, bmBodyStart))
const enTocSlice = preprocess(enSlice.slice(0, enBodyStart - enArrStart))
const bmToc = parseToc(bmTocSlice)
const enToc = parseToc(enTocSlice)

// Body spans stop at the first schedule header (schedules have their own
// PART/BAHAGIAN divisions and numbered items that are NOT regulations).
const bmBodyLogical = preprocess(bmSlice.slice(bmBodyStart, bmSchedStart))
const enBodyLogical = preprocess(enSlice.slice(enBodyStart - enArrStart, enSchedStart - enArrStart))

// Skip the preamble (up to and including "…makes the following regulations:").
function fromFirstPart(logical) {
  const idx = logical.findIndex((l) => PART_RE.test(l.text))
  return idx >= 0 ? logical.slice(idx) : logical
}

const enParts = parseBody(fromFirstPart(enBodyLogical), { partWord: 'PART' })
const bmParts = parseBody(fromFirstPart(bmBodyLogical), { partWord: 'BAHAGIAN' })

// Cross-check headings against the official Arrangement of Regulations.
function norm(s) { return s.toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:]$/g, '').trim() }
for (const [label, tocMap, parts] of [['EN', enToc, enParts], ['BM', bmToc, bmParts]]) {
  for (const part of parts) {
    for (const reg of part.sections) {
      const toc = tocMap.get(reg.number)
      if (toc && norm(toc) !== norm(reg.heading)) {
        warnings.push(`Reg ${reg.number} ${label} heading differs from TOC:\n    body: ${reg.heading}\n    toc:  ${toc}`)
      }
    }
  }
}

// Schedules (both languages), with the made-note split off the tail.
const BM_SCHED_TO_EN = { PERTAMA: 'FIRST', KEDUA: 'SECOND', KETIGA: 'THIRD', KEEMPAT: 'FOURTH', KELIMA: 'FIFTH', KEENAM: 'SIXTH' }
const bmSched = parseSchedules(preprocess(bmSlice.slice(bmSchedStart, enArrStart)), {
  schedRe: BM_SCHED_RE, labelOf: (w) => BM_SCHED_TO_EN[w.toUpperCase()] ?? w.toUpperCase(),
})
const enSched = parseSchedules(preprocess(enSlice.slice(enSchedStart - enArrStart)), {
  schedRe: EN_SCHED_RE, labelOf: (w) => w.toUpperCase(),
})

const schedLabels = ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH']
const enByLabel = new Map(enSched.schedules.map((s) => [s.label, s]))
const bmByLabel = new Map(bmSched.schedules.map((s) => [s.label, s]))
const schedules = schedLabels.map((label, i) => {
  const en = enByLabel.get(label)
  const bm = bmByLabel.get(label)
  if (!en || !bm) {
    warnings.push(`${label} Schedule missing (EN:${!!en} BM:${!!bm}) — placeholder injected`)
    return {
      id: `sched-${i + 1}`, label, regRef: '', title: '', missing: true,
      blocks: [{ kind: 'paragraph', text: '(This schedule is listed in the Arrangement of Regulations but its text is not reproduced in the source document.)', annotation: '' }],
      bm: { label: SCHED_WORD_BM[label], regRef: '', title: '', blocks: [{ kind: 'paragraph', text: '(Jadual ini disenaraikan dalam Susunan Peraturan tetapi teksnya tidak diperuntukkan dalam dokumen sumber.)', annotation: '' }] },
    }
  }
  return {
    id: `sched-${i + 1}`, label, regRef: en.regRef || '', title: en.title || '', missing: false,
    blocks: en.blocks,
    bm: { label: SCHED_WORD_BM[label], regRef: bm.regRef || '', title: bm.title || '', blocks: bm.blocks },
  }
})

// Mirror BM regulations onto EN parts by regulation number.
const bmRegMap = new Map()
for (const p of bmParts) for (const r of p.sections) bmRegMap.set(r.number, r)
const bmPartMap = new Map(bmParts.map((p) => [p.label, p]))

const parts = enParts.map((p) => ({
  id: p.id,
  label: p.label,
  title: p.title,
  bmTitle: bmPartMap.get(p.label)?.title ?? '',
  sections: p.sections.map((r) => {
    const bm = bmRegMap.get(r.number)
    if (!bm) warnings.push(`Regulation ${r.number}: no BM counterpart`)
    // Prefer the heading extracted from the body; fall back to the official
    // Arrangement of Regulations heading when the body one was not recoverable.
    let heading = r.heading
    if (heading === '(No heading)') {
      const toc = enToc.get(r.number)
      if (toc) { heading = toc; warnings.push(`Reg ${r.number} EN heading recovered from TOC: ${toc}`) }
    }
    let bmHeading = bm?.heading ?? ''
    if (!bmHeading) {
      const toc = bmToc.get(r.number)
      if (toc) { bmHeading = toc; warnings.push(`Reg ${r.number} BM heading recovered from TOC: ${toc}`) }
    }
    return {
      id: r.id, number: r.number, heading,
      content: r.content,
      bm: bm || bmHeading ? { heading: bmHeading, content: bm?.content ?? [] } : null,
    }
  }),
}))

const missing = []
for (let n = 1; n <= 60; n++) {
  if (!parts.some((p) => p.sections.some((r) => r.number === String(n)))) missing.push(n)
}
if (missing.length) warnings.push(`Missing regulation numbers: ${missing.join(', ')}`)

const data = {
  meta: {
    title: 'Customs Regulations 2019',
    number: 'P.U. (A) 397',
    parent: 'Customs Act 1967 (Act 235)',
    madeDate: '31 December 2019',
    source: 'Federal Government Gazette P.U. (A) 397 — extracted from reg.pdf',
  },
  preamble: {
    en: extractPreamble(/^IN exercise of the powers/, /^PART\s+[IVX]/, enBodyStart),
    bm: extractPreamble(/^PADA menjalankan kuasa/, /^BAHAGIAN\s+[IVX]/, bmBodyStart),
  },
  madeNote: {
    en: (enSched.madeNote ?? []).join(' ').trim(),
    bm: (bmSched.madeNote ?? []).join(' ').trim(),
  },
  parts,
  schedules,
}

/* ------------------------------------------------------------------ write */

mkdirSync(join(APP_ROOT, 'src', 'data'), { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(data, null, 2), 'utf8')

const regCount = parts.reduce((a, p) => a + p.sections.length, 0)
console.log(`Parts: ${parts.length}; regulations: ${regCount}; schedules: ${schedules.length}`)
for (const p of parts) {
  console.log(`  ${p.label.padEnd(4)} ${(p.title || '(untitled)').slice(0, 60)} — ${p.sections.length} regs`)
}
console.log(`Schedules: ${schedules.map((s) => `${s.label}${s.missing ? '(missing)' : ''}`).join(', ')}`)
console.log(`BM regs matched: ${bmRegMap.size}/60`)
console.log(`Preamble EN: ${data.preamble.en.slice(0, 60)}…`)
console.log(`Preamble BM: ${data.preamble.bm.slice(0, 60)}…`)
console.log(`Made note EN: ${data.madeNote.en.slice(0, 60)}…`)
console.log(`Made note BM: ${data.madeNote.bm.slice(0, 60)}…`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings) console.log('  ! ' + w)
} else {
  console.log('\nNo warnings.')
}
console.log(`\nWrote ${OUT_PATH}`)
