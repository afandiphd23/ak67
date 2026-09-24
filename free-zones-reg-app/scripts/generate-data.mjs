/**
 * Parser for Malaysia's Free Zones Regulations 1991
 * (Peraturan-Peraturan Zon Bebas 1991, P.U. (B) 455/1991).
 *
 * Reads ../../azbp.md (project root) and extracts ONLY the Regulations
 * portion (from the "### PERATURAN-PERATURAN ZON BEBAS" heading to the end
 * of file), emitting ../src/data/free-zones-reg.json with
 * parts -> regulations -> blocks. Bahasa Melayu is the gazette text; an
 * English working translation can be merged later via the `en` overlay
 * (same pattern as free-zones-app's bm overlay).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const SRC_PATH = join(APP_ROOT, '..', 'azbp.md')
const OUT_DIR = join(APP_ROOT, 'src', 'data')
const OUT_PATH = join(OUT_DIR, 'free-zones-reg.json')

const warnings = []

/* ---------------------------------------------------------------- helpers */

const SECTION_RE = /^\*\*(\d{1,3}[A-Z]{0,2})\.\*\*\s*(.*)$/
const PART_RE = /^\*\*BAHAGIAN\s+([IVXLCD]+)\*\*\s*(.*)$/
const PART_PLAIN_RE = /^BAHAGIAN\s+([IVXLCD]+)\s*(.*)$/
const ITEM_RE = /^\*?\((?:[a-z]{1,4}|\d{1,2}|[ivxlIVXL]{1,5})\)\*?\s/
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/
const QUOTE_START = '\u201C' // “

function isAllCaps(text) {
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!letters) return false
  const upper = text.replace(/[^A-ZÀ-Þ]/g, '')
  return upper.length / letters.length > 0.85
}

/** Collapse whitespace and drop markdown emphasis asterisks. */
function stripMd(text) {
  return text.replace(/\*+/g, '').replace(/\s+/g, ' ').trim()
}

/** Load lines, keeping heading kind. */
function loadLines() {
  const raw = readFileSync(SRC_PATH, 'utf8').split(/\r?\n/)
  const out = []
  for (const line of raw) {
    let t = line.replace(/\u00A0/g, ' ')
    if (/^\s*$/.test(t)) continue
    let kind = 'p'
    const hm = /^#{1,6}\s+(.*)$/.exec(t)
    if (hm) {
      kind = 'h'
      t = hm[1]
    }
    t = t.trim()
    if (!t) continue
    out.push({ kind, text: t, md: TABLE_ROW_RE.test(line) })
  }
  return out
}

/* ------------------------------------------------- locate the regulations */

const all = loadLines()
let startIdx = all.findIndex((l) => /^PERATURAN-PERATURAN ZON BEBAS\s*\**$/.test(l.text))
if (startIdx < 0) throw new Error('Could not locate "PERATURAN-PERATURAN ZON BEBAS" heading')
// Skip its '—————' ornament if present
while (startIdx < all.length && /^[—─]+$/.test(all[startIdx].text)) startIdx++
// The Susunan Peraturan (TOC) follows; the real body starts at the enabling
// clause "PADA menjalankan kuasa-kuasa…" made under section 47 of the Act.
let bodyIdx = all.findIndex((l) => /^PADA menjalankan kuasa/i.test(l.text))
if (bodyIdx < startIdx) throw new Error('Could not locate regulations body start')

const lines = all.slice(bodyIdx)

/* ------------------------------------------------------------ parse state */

const parts = []
const regs = []
const schedules = []
const preamble = []

let part = null
let reg = null
let pendingHeading = null
let inSchedules = false
let currentSchedule = null
let preambleDone = false

const newPart = (label, title) => {
  // Re-entering an existing part (duplicated BAHAGIAN marker) reuses it.
  const existing = parts.find((p) => p.label === label)
  if (existing && !title) {
    part = existing
    reg = null
    return
  }
  part = {
    id: `p-${label}`,
    label,
    title: title || '',
    bmTitle: title || '',
    sections: [],
  }
  parts.push(part)
  reg = null
}

const newReg = (num, rest) => {
  const number = num.toUpperCase()
  const heading = pendingHeading || ''
  pendingHeading = null
  reg = {
    id: `r-${number}`,
    number,
    heading: heading || '(No heading)',
    annotation: '',
    content: [],
  }
  if (rest) addText(reg, rest)
  if (!part) warnings.push(`regulation ${number} before any BAHAGIAN`)
  else part.sections.push(reg)
  regs.push(reg)
}

const addText = (sec, rawText) => {
  const text = stripMd(rawText)
  if (!text) return
  if (text.includes(QUOTE_START)) {
    const qi = text.indexOf(QUOTE_START)
    const before = text.slice(0, qi).trim()
    const quoteRun = text.slice(qi)
    // A run of glued definitions — “term” …; “term” … — splits at each “
    // that directly follows a semicolon.
    const segments = quoteRun.split(/(?<=;)\s+(?=“)/)
    if (before) pushBlock(sec, before)
    for (const seg of segments) pushBlock(sec, seg)
    return
  }
  pushBlock(sec, text)
}

const pushBlock = (sec, text) => {
  if (text.startsWith(QUOTE_START)) {
    // A continuation of a glued definition (“term” …) that begins with a
    // fragment (not a fresh definition) stays a quote block as-is.
    const m = new RegExp('^“([^”]*)”\\s*(.*)$').exec(text)
    sec.content.push({
      kind: 'quote',
      term: m ? m[1] : '',
      text: m ? m[2].trim() : text,
      annotation: '',
      items: [],
    })
    return
  }
  if (ITEM_RE.test(text)) {
    const last = sec.content[sec.content.length - 1]
    if (last && last.kind === 'quote') {
      last.items.push(text)
      return
    }
    sec.content.push({ kind: 'item', text, annotation: '' })
    return
  }
  sec.content.push({ kind: 'paragraph', text, annotation: '' })
}

const appendOrNew = (sec, text) => {
  const last = sec.content[sec.content.length - 1]
  if (last && last.kind === 'quote') {
    last.text = `${last.text} ${text}`
    return
  }
  if (last) {
    last.text = `${last.text} ${text}`
    return
  }
  pushBlock(sec, text)
}

const attachAnnotation = (sec, text) => {
  const last = sec.content[sec.content.length - 1]
  const t = stripMd(text)
  if (last) last.annotation = last.annotation ? `${last.annotation} ${t}` : t
  else sec.annotation = sec.annotation ? `${sec.annotation} ${t}` : t
}

/* --------------------------------------------------------------- parsing */

for (let i = 0; i < lines.length; i++) {
  const { kind, text, md } = lines[i]

  const schedM = /^\*{0,2}(JADUAL (PERTAMA|KEDUA|KETIGA))\*{0,2}\s*(.*)$/.exec(text)
  if (schedM) {
    inSchedules = true
    currentSchedule = {
      id: `sched-${schedM[2].toLowerCase()}`,
      label: schedM[1],
      ref: '',
      title: '',
      blocks: [],
    }
    schedules.push(currentSchedule)
    reg = null
    pendingHeading = null
    // "**JADUAL PERTAMA** **BORANG-BORANG** JABATAN KASTAM …" — glued title
    // and content on one line.
    const rest = stripMd(schedM[3])
    if (rest) {
      const titleM = /^(BORANG-BORANG)\b\s*(.*)$/.exec(rest)
      if (titleM) {
        currentSchedule.title = titleM[1]
        if (titleM[2]) currentSchedule.blocks.push({ kind: 'paragraph', text: titleM[2], annotation: '' })
      } else {
        currentSchedule.blocks.push({ kind: 'paragraph', text: rest, annotation: '' })
      }
    }
    continue
  }

  if (inSchedules) {
    if (!currentSchedule) continue
    if (!currentSchedule.ref && /^\[.*\]$/.test(text) && currentSchedule.blocks.length === 0) {
      currentSchedule.ref = stripMd(text)
      continue
    }
    // Schedule titles: "BORANG-BORANG", "KESALAHAN-KESALAHAN BOLEH DIKOMPAUN"
    if (!currentSchedule.title && isAllCaps(text.replace(/\*\*/g, '')) && text.length > 4) {
      currentSchedule.title = stripMd(text)
      continue
    }
    if (md) {
      // Form tables — render as readable "cell — cell" paragraphs.
      const cells = text.split('|').slice(1, -1).map((c) => stripMd(c))
      const meaningful = cells.filter((c) => c && !/^(—|-+|\.\.+)$/.test(c) && c.length > 1)
      if (meaningful.length === 0) continue
      const joined = meaningful.join(' — ')
      if (/^peraturan$/i.test(joined)) continue
      currentSchedule.blocks.push({ kind: 'paragraph', text: joined, annotation: '' })
      continue
    }
    // Skip obvious page furniture and dotted leaders.
    if (/^[.·…\s]+$/.test(text)) continue
    currentSchedule.blocks.push({ kind: 'paragraph', text: stripMd(text), annotation: '' })
    continue
  }

  if (!preambleDone) {
  const pm = PART_RE.exec(text) || PART_PLAIN_RE.exec(text)
  if (pm) {
    preambleDone = true
    const title = stripMd(pm[2])
    newPart(pm[1], title)
    // Bare "BAHAGIAN X": the ALL-CAPS title is the next heading line.
    if (!title) {
      for (let j = i + 1; j < lines.length; j++) {
        const nt = stripMd(lines[j].text)
        if (PART_RE.test(nt) || PART_PLAIN_RE.test(nt) || SECTION_RE.test(nt)) break
        if (nt && !/^[—─]+$/.test(nt)) {
          part.title = nt
          part.bmTitle = nt
          i = j
          break
        }
      }
    }
    pendingHeading = null
    continue
  }
    // Preamble: enabling words + commencement line (skip TOC leftovers).
    const t = stripMd(text)
    if (
      /^PADA menjalankan kuasa/i.test(t) ||
      /^\[?\s*5 September 1991/i.test(t)
    ) {
      preamble.push(t)
    }
    continue
  }

  const pm = PART_RE.exec(text) || PART_PLAIN_RE.exec(text)
  if (pm) {
    const title = stripMd(pm[2])
    newPart(pm[1], title)
    if (!title) {
      for (let j = i + 1; j < lines.length; j++) {
        const nt = stripMd(lines[j].text)
        if (PART_RE.test(nt) || PART_PLAIN_RE.test(nt) || SECTION_RE.test(nt)) break
        if (nt && !/^[—─]+$/.test(nt)) {
          part.title = nt
          part.bmTitle = nt
          i = j
          break
        }
      }
    }
    continue
  }

  const sm = SECTION_RE.exec(text)
  if (sm) {
    newReg(sm[1], sm[2])
    continue
  }

  if (kind === 'h') {
    const t = text.replace(/^\*+|\*+$/g, '').trim()
    if (
      isAllCaps(t) ||
      /^(Provided|Dengan syarat)\b/i.test(t) ||
      t.length > 220 ||
      ITEM_RE.test(stripMd(t)) ||
      /\(\d+[A-Za-z]?\)/.test(t) ||
      /:$/.test(t) ||
      /^[—─]+$/.test(t)
    ) {
      // Not a heading (part title / ornament / body glue) — treat as content.
      if (reg && !isAllCaps(t)) pushBlock(reg, stripMd(t))
      else if (reg && isAllCaps(t)) pushBlock(reg, stripMd(t))
      continue
    }
    pendingHeading = t
    continue
  }

  // Bold-wrapped heading-looking plain line.
  if (/^\*\*[^*]+\*\*:?$/.test(text)) {
    pendingHeading = text.replace(/^\*\*|\*\*$/g, '')
    continue
  }

  if (/^\[.*\]$/.test(stripMd(text)) && reg) {
    attachAnnotation(reg, text)
    continue
  }

  if (reg) {
    const stripped = stripMd(text)
    if (ITEM_RE.test(stripped) || stripped.startsWith(QUOTE_START)) addText(reg, text)
    else appendOrNew(reg, stripped)
  } else {
    warnings.push(`orphan line: "${text.slice(0, 60)}"`)
  }
}

/* --------------------------------------------------------------- output */

const data = {
  meta: {
    title: 'Free Zones Regulations 1991',
    bmTitle: 'Peraturan-Peraturan Zon Bebas 1991',
    number: 'P.U. (B) 455/1991',
    parent: 'Free Zones Act 1990 (Act 438)',
    bmParent: 'Akta Zon Bebas 1990 (Akta 438)',
    madeUnder: 'Section 47 of the Free Zones Act 1990 [Act 438]',
    bmMadeUnder: 'Seksyen 47 Akta Zon Bebas 1990 [Akta 438]',
    commencement: '5 September 1991',
    source: 'Undang-Undang Malaysia — extracted from azbp.md (cetakan Januari 2011)',
  },
  preamble,
  parts,
  schedules,
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(data, null, 1), 'utf8')

/* -------------------------------------------------------------- report */

console.log(`Parts: ${data.parts.length}`)
for (const p of data.parts) {
  console.log(`  ${p.label.padEnd(4)} ${p.title || '(untitled)'} — ${p.sections.length} regulations`)
}
console.log(`Regulations total: ${regs.length}`)
console.log(`Numbers: ${regs.map((r) => r.number).join(' ')}`)
console.log(`Schedules: ${schedules.map((s) => `${s.label} (${s.blocks.length} blocks)`).join(', ')}`)
console.log(`Preamble lines: ${preamble.length}`)
const noHeading = regs.filter((r) => r.heading === '(No heading)')
if (noHeading.length) console.log(`No heading: ${noHeading.map((r) => r.number).join(', ')}`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings.slice(0, 40)) console.log('  ! ' + w)
} else {
  console.log('\nNo warnings.')
}
console.log(`\nWrote ${OUT_PATH}`)
