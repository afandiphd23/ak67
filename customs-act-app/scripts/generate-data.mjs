/**
 * Parser for Malaysia's Customs Act 1967 (Act 235).
 * Reads ../../extracted_raw.txt (project root) and emits
 * ../src/data/customs-act.json with parts -> sections -> blocks.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const RAW_PATH = join(APP_ROOT, '..', 'extracted_raw.txt')
const OUT_DIR = join(APP_ROOT, 'src', 'data')
const OUT_PATH = join(OUT_DIR, 'customs-act.json')

const warnings = []

/* ---------------------------------------------------------------- helpers */

const SECTION_RE = /^(\d{1,3})([A-Za-z]{0,3})\s*\.\s*(.*)$/
const PART_RE = /^PART\s+([IVXLCD]+[A-Z]*)\.?\s*(.*)$/
const RANGE_DELETED_RE = /^(\d{1,3}\s*[^\d\s.]\s*\d{1,3})\.\s*(.*)$/
const ITEM_RE = /^\((?:[A-Za-z]{1,4}|\d{1,2}|[ivxlIVXL]{1,5})\)\s/
const DELETED_REST_RE = /^\[?(deleted|omitted)\b.*\]?$/i
const ANNOTATION_LINE_RE = /^\[.*\]$/
const ALL_CAPS_RE = /^[A-Z0-9 ,'&\-\.']+$/

function validSectionNumber(num, letters, rest) {
  const n = parseInt(num, 10)
  if (n < 1 || n > 170) return false
  if (letters === '' && /^\d/.test(rest)) return false // e.g. "1.14 per centum"
  return true
}

function isUnitStart(text) {
  if (PART_RE.test(text)) return true
  if (/^SCHEDULE\b/.test(text)) return true
  const m = SECTION_RE.exec(text)
  if (m && validSectionNumber(m[1], m[2], m[3])) return true
  return false
}

function isAllCaps(text) {
  const letters = text.replace(/[^A-Za-z]/g, '')
  if (!letters) return false
  const upper = text.replace(/[^A-Z]/g, '')
  return ALL_CAPS_RE.test(text) && upper.length / letters.length > 0.9
}

/** A line qualifies as (part of) a section heading. */
function isHeadingLike(text) {
  if (PART_RE.test(text)) return false
  if (/^SCHEDULE\b/.test(text)) return false
  if (/^[("[]/.test(text)) return false
  // part titles are ALL CAPS (possibly with a trailing [annotation])
  if (isAllCaps(text.replace(/\s*\[.*\]\s*$/, ''))) return false
  if (RANGE_DELETED_RE.test(text)) return false // deleted ranges are not headings
  if (text.length > 300) return false
  if (/\.$/.test(text) && !/\b(etc|viz)\.$/i.test(text)) return false // sentences end with "."
  if (!/^[A-Z0-9]/.test(text)) return false
  return true
}

/** Split a glued "PART I TITLE Heading 1. text" line into synthetic lines. */
function expandPartLine(line) {
  const m = PART_RE.exec(line)
  if (!m) return [line]
  const label = m[1]
  const rest = m[2].trim()
  if (!rest) return [`PART ${label}`]
  const tokens = rest.split(/\s+/)
  const titleWords = []
  let i = 0
  while (i < tokens.length && /^[A-Z0-9,'&\-\.']+$/.test(tokens[i])) {
    titleWords.push(tokens[i])
    i++
  }
  const title = titleWords.join(' ')
  const remaining = tokens.slice(i).join(' ')
  const out = [title ? `PART ${label} ${title}` : `PART ${label}`]
  if (!remaining) return out
  const hm = /^((?:[A-Za-z][A-Za-z'\-]*\s+)*?)(\d{1,3}[A-Za-z]{0,3})\s*\.(?!\d)\s*(.*)$/.exec(remaining)
  if (hm && validSectionNumber(hm[2], hm[2].slice(String(parseInt(hm[2], 10)).length), hm[3])) {
    const heading = hm[1].trim()
    if (heading) out.push(heading)
    out.push(`${hm[2]}. ${hm[3]}`.trim())
  } else {
    out.push(remaining)
  }
  return out
}

/* ------------------------------------------------------------------- load */

const originalLines = readFileSync(RAW_PATH, 'utf8').split(/\r?\n/)

// Body starts after the LAST "CUSTOMS ACT 1967" title line (before it is the TOC).
let bodyStart = -1
for (let i = originalLines.length - 1; i >= 0; i--) {
  if (originalLines[i].trim() === 'CUSTOMS ACT 1967') { bodyStart = i + 1; break }
}
if (bodyStart < 0) throw new Error('Could not locate body start (CUSTOMS ACT 1967 header)')

// Preprocess: strip \f into pageBreak flags, drop repeated page headers.
const HEADER_SET = new Set(['LAWS OF MALAYSIA', 'Act 235', 'CUSTOMS ACT 1967'])
const logicalLines = []
let pendingBreak = false
for (const raw of originalLines.slice(bodyStart)) {
  let line = raw
  if (line.startsWith('\f')) { pendingBreak = true; line = line.slice(1) }
  const trimmed = line.trim()
  if (trimmed === '' || HEADER_SET.has(trimmed)) continue
  logicalLines.push({ text: line.trim(), pageBreak: pendingBreak })
  pendingBreak = false
}

// Split glued "Heading 12. text" lines (e.g. "Interpretation 2. (1) In this Act...").
const GLUE_RE = /^((?:[A-Za-z][A-Za-z'\u2019-]*\s+){1,12})(\d{1,3}[A-Za-z]{0,3})\s*\.(?!\d)\s+(.*)$/
function splitGluedHeading(text) {
  const m = GLUE_RE.exec(text)
  if (!m) return [text]
  const prefix = m[1].trim()
  const num = m[2]
  const rest = m[3]
  if (!/^[A-Z]/.test(prefix)) return [text]
  if (!validSectionNumber(num.replace(/[A-Za-z]+$/, ''), num.replace(/^\d+/, ''), rest)) return [text]
  return [prefix, `${num}. ${rest}`]
}

// Expand glued part lines (may contain first heading + section start).
const lines = []
for (const l of logicalLines) {
  if (PART_RE.test(l.text)) {
    expandPartLine(l.text).forEach((p, idx) =>
      lines.push({ text: p, pageBreak: idx === 0 ? l.pageBreak : false }))
  } else {
    splitGluedHeading(l.text).forEach((p, idx) =>
      lines.push({ text: p, pageBreak: idx === 0 ? l.pageBreak : false }))
  }
}

/* --------------------------------------------- pass 1: mark heading lines */

let scheduleStartIdx = lines.findIndex((l) => /^SCHEDULE\b/.test(l.text))
if (scheduleStartIdx < 0) scheduleStartIdx = lines.length

const headingMark = new Set()
for (let u = 0; u < scheduleStartIdx; u++) {
  const text = lines[u].text
  if (!text || !isUnitStart(text)) continue
  const isDeletedRest =
    SECTION_RE.test(text) && DELETED_REST_RE.test(SECTION_RE.exec(text)[3].trim())
  if (isDeletedRest) continue // deleted sections have no heading
  // Walk backwards over heading-like lines, skipping annotation-only lines,
  // stopping at any non-heading content or unit boundary.
  for (let i = u - 1; i >= 0; i--) {
    const t = lines[i].text
    if (!t) continue
    if (ANNOTATION_LINE_RE.test(t)) continue
    if (!isHeadingLike(t)) break
    if (headingMark.has(i)) break // already belongs to an earlier unit's heading
    headingMark.add(i)
  }
}

/* -------------------------------------------------- pass 2: build the act */

const act = {
  meta: {
    title: 'Customs Act 1967',
    actNumber: 'Act 235',
    source: 'Laws of Malaysia — extracted from CUSTOMS ACT 1967.pdf',
  },
  parts: [],
  schedule: null, // { title, paragraphs: [] }
  note: null,     // { title, paragraphs: [] }
}

let currentPart = null
let currentSection = null
let headingBuffer = []

function flushHeadingAsHeadnote() {
  if (!headingBuffer.length) return
  const text = headingBuffer.join(' ').replace(/\s+/g, ' ').trim()
  headingBuffer = []
  if (!text) return
  if (currentPart) currentPart.headnotes.push({ text })
  else warnings.push(`Headnote before any part: "${text.slice(0, 80)}"`)
}

function newPart(label, title, pageBreak) {
  const part = {
    id: `p-${label}`,
    label,
    title: title || '',
    pageBreakBefore: !!pageBreak,
    headnotes: [],
    annotation: '',
    sections: [],
  }
  act.parts.push(part)
  currentPart = part
  currentSection = null
  return part
}

/** Recover a heading glued to the end of the previous section's last block, e.g.
 *  "...levied under protest. Director General to determine questions..." before 13B. */
function recoverGluedHeading(prevSection) {
  if (!prevSection || prevSection.deleted) return null
  const last = lastBlock(prevSection)
  if (!last || (last.kind !== 'paragraph' && last.kind !== 'item')) return null
  const idx = last.text.lastIndexOf('. ')
  if (idx < 0) return null
  const candidate = last.text.slice(idx + 2).trim()
  if (!candidate || candidate.includes('. ')) return null
  if (/\.$/.test(candidate) || candidate.length > 130) return null
  if (ITEM_RE.test(candidate) || /^["[]/.test(candidate)) return null
  return { text: last.text.slice(0, idx + 1).trim(), heading: candidate }
}

function newSection(numToken, rest, pageBreak) {
  const m = /^(\d{1,3})([A-Za-z]{0,3})$/i.exec(numToken)
  const number = m ? m[1] + m[2].toUpperCase() : numToken
  if (!headingBuffer.length) {
    const rec = recoverGluedHeading(currentSection)
    if (rec) {
      lastBlock(currentSection).text = rec.text
      headingBuffer = [rec.heading]
    }
  }
  const heading = headingBuffer.join(' ').replace(/\s+/g, ' ').trim()
  headingBuffer = []
  const deleted = DELETED_REST_RE.test(rest.trim())
  const section = {
    id: `s-${number}`,
    number,
    heading: heading || (deleted ? '(Deleted)' : '(No heading)'),
    pageBreakBefore: !!pageBreak,
    deleted,
    annotation: '',
    content: [],
  }
  if (!heading && !deleted) {
    warnings.push(`Section ${number}: empty heading`)
  } else if (heading.length > 200) {
    warnings.push(`Section ${number}: suspiciously long heading "${heading.slice(0, 120)}..."`)
  }
  if (deleted) {
    // keep the [Deleted by ...] note as the annotation
    if (rest.trim()) section.annotation = rest.trim()
  } else if (rest.trim()) {
    addBlock(section, rest)
  }
  currentSection = section
  if (currentPart) currentPart.sections.push(section)
  else warnings.push(`Section ${number} appeared before any PART`)
  return section
}

function lastBlock(section) {
  return section.content.length ? section.content[section.content.length - 1] : null
}

function addBlock(section, text) {
  if (text.startsWith('"')) {
    const termMatch = /^"([^"]*)"\s*(.*)$/.exec(text)
    const block = { kind: 'quote', term: termMatch ? termMatch[1] : '', text: termMatch ? termMatch[2].trim() : text, annotation: '', items: [] }
    section.content.push(block)
    return
  }
  const kind = ITEM_RE.test(text) ? 'item' : 'paragraph'
  const last = lastBlock(section)
  if (kind === 'item' && last && last.kind === 'quote') {
    last.items.push(text)
    return
  }
  section.content.push({ kind, text, annotation: '' })
}

function attachAnnotation(target, text) {
  if (!target) return
  target.annotation = target.annotation ? `${target.annotation} ${text}` : text
}

/* ------------------------------------------------------------- main loop */

let schedule = null
let note = null

for (let i = 0; i < lines.length; i++) {
  const { text, pageBreak } = lines[i]
  if (!text) continue

  // End-of-act material ----------------------------------------------------
  if (schedule) {
    if (/^Note:/i.test(text)) {
      note = { title: text, paragraphs: [] }
      act.note = note
    } else if (note) {
      note.paragraphs.push(text)
    } else {
      schedule.paragraphs.push(text)
    }
    continue
  }

  // Structural starts -------------------------------------------------------
  if (PART_RE.test(text)) {
    flushHeadingAsHeadnote()
    const m = PART_RE.exec(text)
    newPart(m[1], m[2].trim(), pageBreak)
    // Consume a following ALL-CAPS line as the part title (if not inline).
    if (!currentPart.title) {
      let j = i + 1
      while (j < lines.length && !lines[j].text) j++
      if (
        j < scheduleStartIdx &&
        j < lines.length &&
        lines[j].text &&
        !headingMark.has(j) &&
        isAllCaps(lines[j].text.replace(/\s*\[.*\]\s*$/, '')) &&
        !isUnitStart(lines[j].text) &&
        !ANNOTATION_LINE_RE.test(lines[j].text)
      ) {
        const annM = /^([^\[]*?)\s*(\[.*\])\s*$/.exec(lines[j].text)
        currentPart.title = (annM ? annM[1] : lines[j].text).trim()
        if (annM) {
          currentPart.annotation = currentPart.annotation
            ? `${currentPart.annotation} ${annM[2]}`
            : annM[2]
        }
        i = j
      }
    }
    continue
  }
  if (/^SCHEDULE\b/.test(text)) {
    flushHeadingAsHeadnote()
    schedule = { title: text, paragraphs: [] }
    act.schedule = schedule
    currentPart = null
    currentSection = null
    continue
  }

  // Deleted section ranges, e.g. "146–153. [Deleted by Act 329]"
  const rangeM = RANGE_DELETED_RE.exec(text)
  if (
    rangeM &&
    /deleted|omitted/i.test(rangeM[2]) &&
    scheduleStartIdx > i &&
    !headingMark.has(i)
  ) {
    const number = rangeM[1].replace(/\s+/g, '').replace(/\D+/g, '–')
    const headingBufferJoined = headingBuffer.join(' ').replace(/\s+/g, ' ').trim()
    headingBuffer = []
    const section = {
      id: `s-${number}`,
      number,
      heading: headingBufferJoined || '(Deleted)',
      pageBreakBefore: !!pageBreak,
      deleted: true,
      annotation: rangeM[2] ? rangeM[2].trim() : '',
      content: [],
    }
    currentSection = section
    if (currentPart) currentPart.sections.push(section)
    continue
  }

  const secM = SECTION_RE.exec(text)
  if (secM && validSectionNumber(secM[1], secM[2], secM[3])) {
    newSection(`${secM[1]}${secM[2]}`, secM[3], pageBreak)
    continue
  }

  // Marked heading lines feed the pending heading buffer.
  if (headingMark.has(i)) {
    headingBuffer.push(text)
    continue
  }

  // Content lines -----------------------------------------------------------
  if (currentSection) {
    if (text.startsWith('[')) {
      attachAnnotation(lastBlock(currentSection), text)
    } else {
      addBlock(currentSection, text)
    }
  } else if (currentPart) {
    // stray content between parts (e.g. part-level annotations)
    if (text.startsWith('[')) {
      currentPart.annotation = currentPart.annotation
        ? `${currentPart.annotation} ${text}`
        : text
    } else {
      currentPart.headnotes.push({ text })
    }
  } else {
    warnings.push(`Orphan line before any part: "${text.slice(0, 80)}"`)
  }
}
flushHeadingAsHeadnote()
currentSection = null

/* ------------------------------------------------- TOC placeholder repair */

// Some lettered sections (119A, 141FA) are listed in the Act's own Table of
// Contents but are absent from the body text of this PDF. Inject clearly
// marked placeholder sections so the app reflects the official structure.
function tocLetteredSectionsByPart() {
  const map = new Map() // part label -> Set of lettered section numbers
  const tocLines = originalLines.slice(0, bodyStart)
  let label = null
  const tokenRe = /(?:^|\s|\r)(\d{1,3})([A-Za-z]{1,3})\s*\.(?!\d)/g
  for (const line of tocLines) {
    const pm = PART_RE.exec(line.trim())
    if (pm) { label = pm[1]; if (!map.has(label)) map.set(label, new Set()); continue }
    if (!label) continue
    let m
    tokenRe.lastIndex = 0
    while ((m = tokenRe.exec(line))) {
      const n = parseInt(m[1], 10)
      if (n >= 1 && n <= 170) {
        if (!map.has(label)) map.set(label, new Set())
        map.get(label).add(m[1] + m[2].toUpperCase())
      }
    }
  }
  return map
}

const tocMap = tocLetteredSectionsByPart()
let placeholders = 0
for (const part of act.parts) {
  const tocSet = tocMap.get(part.label)
  if (!tocSet) continue
  const present = new Set(part.sections.map((s) => s.number))
  const missing = [...tocSet].filter((t) => !present.has(t)).sort()
  for (const num of missing) {
    part.sections.push({
      id: `s-${num}`,
      number: num,
      heading: '(Not reproduced in the source document)',
      pageBreakBefore: false,
      deleted: false,
      annotation: '',
      content: [
        {
          kind: 'paragraph',
          text: `Section ${num} is listed in the Arrangement of Sections of the source document but its text is not present in the extracted body.`,
          annotation: '',
        },
      ],
    })
    placeholders++
    warnings.push(`Injected placeholder for section ${num} (Part ${part.label}) — in TOC, missing from body`)
  }
  // keep sections ordered (stable for equal numerics)
  part.sections.sort(
    (a, b) => parseInt(a.number, 10) - parseInt(b.number, 10),
  )
}

/* -------------------------------------------------------------- validate */

let sectionCount = 0
for (const part of act.parts) {
  let prev = 0
  for (const s of part.sections) {
    sectionCount++
    const n = parseInt(s.number, 10)
    if (n < prev) warnings.push(`Part ${part.label}: section ${s.number} out of order (after ${prev})`)
    prev = n
  }
}

/* ------------------------------------------------------------------ write */

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(act, null, 2), 'utf8')

console.log(`Parts: ${act.parts.length}`)
for (const p of act.parts) {
  console.log(`  ${p.label.padEnd(6)} ${p.title || '(untitled)'} — ${p.sections.length} sections`)
}
console.log(`Sections total: ${sectionCount}`)
console.log(`Schedule: ${act.schedule ? 'yes' : 'no'}; Note: ${act.note ? 'yes' : 'no'}`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings) console.log('  ! ' + w)
} else {
  console.log('\nNo warnings.')
}
console.log(`\nWrote ${OUT_PATH}`)
