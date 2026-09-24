/**
 * Parser for Malaysia's Free Zones Act 1990 (Akta Zon Bebas 1990, Act 438).
 *
 * Reads two project-root sources and emits ../src/data/free-zones.json:
 *   - azbe.md  English updated text as at 15 December 2025 (PRIMARY — most complete)
 *   - azb.md   Bahasa Melayu reprint as at 1 May 2013 (per-section BM overlay)
 *
 * Sections added after the 2013 BM reprint (8A, 8B, 10A, 17A, 17B, 20A, 30B,
 * 41A, 48A, 48B) have bm: null and the reader falls back to English.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const APP_ROOT = join(__dirname, '..')
const EN_PATH = join(APP_ROOT, '..', 'azbe.md')
const BM_PATH = join(APP_ROOT, '..', 'azb.md')
const OUT_DIR = join(APP_ROOT, 'src', 'data')
const OUT_PATH = join(OUT_DIR, 'free-zones.json')

const warnings = []

/* ---------------------------------------------------------------- helpers */

const SECTION_RE = /^\*{0,3}\*\*(\d{1,3}[A-Z]{0,2})\.\*\*\s*(.*)$/
const BOLD_ONLY_RE = /^\*\*[^*]+\*\*:?$/
const PART_EN_RE = /^PART\s+([IVXLCD]+)\.?\.?$/
const PART_BM_RE = /^BAHAGIAN\s+([IVXLCD]+)\.?$/
const ITEM_RE = /^\*?\((?:[a-z]{1,4}|\d{1,2}|[ivxlIVXL]{1,5})\)\*?\s/
const DELETED_RE = /^[(*\s]*(Deleted|Dipotong)\b/i
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/
const QUOTE_START = '\u201C' // “

function isAllCaps(text) {
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (!letters) return false
  const upper = text.replace(/[^A-ZÀ-Þ]/g, '')
  return upper.length / letters.length > 0.85
}

/** Collapse whitespace and drop markdown emphasis asterisks (plain-text render). */
function stripMd(text) {
  return text.replace(/\*+/g, '').replace(/\s+/g, ' ').trim()
}

/** A #### heading is a real section heading unless it is one of these artifacts. */
function isHeadingLike(text) {
  if (!text) return false
  if (/^(Provided|Dengan syarat)\b/i.test(text)) return false // proviso artifact
  if (/[—─]$/.test(text.trim())) return false // trailing dash artifact
  if (/^NOTES?\b/i.test(text)) return false
  if (BOLD_ONLY_RE.test(text)) return true // **Title** wrapped heading
  if (isAllCaps(text) && text.length > 3) return false // part title consumed separately
  if (SECTION_RE.test(text)) return false
  if (ITEM_RE.test(text)) return false
  if (text.length > 220) return false
  if (/\(\d+[A-Za-z]?\)/.test(text)) return false // "(2) For the purpose…" body glue
  if (/:$/.test(text.trim())) return false // headings never end with ':'
  return true
}

/**
 * Load a source file into logical lines: {kind:'h'|'p', text, md:true|false}.
 * '#### ' prefixes become kind 'h'; markdown table rows are flagged md.
 */
function loadLines(path, dropHeaders, pageArtifacts) {
  const raw = readFileSync(path, 'utf8').split(/\r?\n/)
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
    if (dropHeaders.has(t)) continue
    if (pageArtifacts.some((re) => re.test(t))) continue
    out.push({ kind, text: t, md: TABLE_ROW_RE.test(line) })
  }
  return out
}

/* --------------------------------------------------------- generic parser */

function findBodyStart(lines, marker) {
  const idx = lines.findIndex((l) => l.text.startsWith(marker))
  if (idx < 0) throw new Error(`body start marker not found: ${marker}`)
  return idx
}

/**
 * Parse one language of the Act into { parts, sections (flat), schedules, preamble }.
 * cfg: { lang, partRe, partTitleFromHeading, scheduleMarkers, listMarkers,
 *        dropHeaders, pageArtifacts, deletedWords, bodyMarker }
 */
function parseSource(cfg) {
  const lines = loadLines(cfg.path, cfg.dropHeaders, cfg.pageArtifacts)
  const body = lines.slice(findBodyStart(lines, cfg.bodyMarker))

  const parts = []
  const sections = [] // flat, in order
  const schedules = []
  const preamble = []

  let part = null
  let section = null
  let pendingHeading = null
  let inSchedules = false
  let currentSchedule = null
  let preambleDone = false

  const newPart = (label) => {
    part = {
      id: `p-${label}`,
      label,
      title: '',
      bmTitle: '',
      sections: [],
    }
    parts.push(part)
    section = null
    pendingHeading = null
  }

  const newSection = (num, rest) => {
    const number = num.toUpperCase()
    const deleted = DELETED_RE.test(rest)
    const heading = pendingHeading || (deleted ? cfg.deletedHeading : '')
    pendingHeading = null
    section = {
      id: `s-${number}`,
      number,
      heading: heading || (deleted ? cfg.deletedHeading : '(No heading)'),
      deleted,
      annotation: '',
      content: [],
    }
    if (deleted) {
      section.annotation = rest ? stripMd(rest).replace(/[()]/g, '').trim() : ''
    } else if (rest) {
      addText(section, rest)
    }
    if (!part) warnings.push(`[${cfg.lang}] section ${number} before any PART`)
    else part.sections.push(section)
    sections.push(section)
  }

  const addText = (sec, rawText) => {
    let text = stripMd(rawText)
    if (!text) return
    // Section-start glue: "**2.** (1) In this Act…— “activity” includes…" —
    // split the first definition quote onto its own block.
    if (text.includes(QUOTE_START)) {
      const qi = text.indexOf(QUOTE_START)
      const before = text.slice(0, qi).trim()
      const after = text.slice(qi)
      if (before) pushBlock(sec, before)
      pushBlock(sec, after)
      return
    }
    pushBlock(sec, text)
  }

  const pushBlock = (sec, text) => {
    if (text.startsWith(QUOTE_START)) {
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
      // Lettered items following a definition quote nest inside it.
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
    // Plain continuation lines extend the previous block (wrapped prose),
    // except after nothing exists yet.
    const last = sec.content[sec.content.length - 1]
    if (last && last.kind === 'quote') {
      // Wrapped definition prose continues the quote text.
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

  for (let i = 0; i < body.length; i++) {
    const { kind, text, md } = body[i]

    /* ----------------------------------------------------------- schedules */
    const schedMarker = cfg.scheduleMarkers.find((m) => m.match.test(text))
    if (schedMarker) {
      inSchedules = true
      currentSchedule = {
        id: schedMarker.id,
        label: schedMarker.label,
        bmLabel: schedMarker.bmLabel,
        ref: '',
        title: '',
        blocks: [],
        skip: !!schedMarker.skip,
      }
      schedules.push(currentSchedule)
      section = null
      pendingHeading = null
      continue
    }
    const listMarker = cfg.listMarkers.find((m) => m.match.test(text))
    if (listMarker) {
      inSchedules = true
      currentSchedule = {
        id: listMarker.id,
        label: '',
        bmLabel: '',
        ref: '',
        title: listMarker.title,
        blocks: [],
        skip: !!listMarker.skip,
      }
      schedules.push(currentSchedule)
      section = null
      pendingHeading = null
      continue
    }

    if (inSchedules) {
      if (!currentSchedule || currentSchedule.skip) continue
      // Reference line right after the schedule marker, e.g. [Section 49]
      if (!currentSchedule.ref && /^\[.*\]$/.test(text) && currentSchedule.blocks.length === 0) {
        currentSchedule.ref = stripMd(text)
        continue
      }
      if (md) {
        // Parse markdown table rows into readable "cell — cell" paragraphs.
        const cells = text.split('|').slice(1, -1).map((c) => c.trim())
        const meaningful = cells.filter((c) => c && !/^(—|-+)$/.test(c))
        if (meaningful.length === 0) continue
        if (meaningful.length === 1 && isTableHeader(meaningful[0], cfg.lang)) continue
        const joined = meaningful.join(' — ')
        if (isTableHeader(joined, cfg.lang)) continue
        currentSchedule.blocks.push({ kind: 'paragraph', text: joined, annotation: '' })
        continue
      }
      if (isScheduleJunk(text, cfg.lang)) continue
      // Repeated column headers inside schedules.
      currentSchedule.blocks.push({ kind: 'paragraph', text, annotation: '' })
      continue
    }

    /* --------------------------------------------------------------- body */

    // Repeated page headers rendered as #### headings.
    if (cfg.pageTitleRe.test(text)) continue

    if (!preambleDone) {
      const pm = cfg.partRe.exec(text)
      if (pm) {
        preambleDone = true
        newPart(pm[1])
        // Part title on the next non-empty line (ALL CAPS).
        for (let j = i + 1; j < body.length; j++) {
          const nt = body[j].text
          if (cfg.partRe.test(nt) || cfg.sectionTest(nt)) break
          if (isAllCaps(nt.replace(/^\*+|\*+$/g, '')) && !cfg.scheduleMarkerTest(nt)) {
            if (cfg.lang === 'en') part.title = nt.replace(/^\*+|\*+$/g, '')
            else part.bmTitle = nt.replace(/^\*+|\*+$/g, '')
            i = j
            break
          }
          if (isHeadingLike(nt)) {
            pendingHeading = nt.replace(/^\*+|\*+$/g, '')
            i = j
            break
          }
          break
        }
        continue
      }
      preamble.push(text)
      continue
    }

    const pm = cfg.partRe.exec(text)
    if (pm) {
      newPart(pm[1])
      for (let j = i + 1; j < body.length; j++) {
        const nt = body[j].text
        if (cfg.partRe.test(nt) || cfg.sectionTest(nt)) break
        if (isAllCaps(nt.replace(/^\*+|\*+$/g, '')) && !cfg.scheduleMarkerTest(nt)) {
          if (cfg.lang === 'en') part.title = nt.replace(/^\*+|\*+$/g, '')
          else part.bmTitle = nt.replace(/^\*+|\*+$/g, '')
          i = j
          break
        }
        if (isHeadingLike(nt)) {
          pendingHeading = nt.replace(/^\*+|\*+$/g, '')
          i = j
          break
        }
        break
      }
      continue
    }

    const sm = SECTION_RE.exec(text)
    if (sm) {
      newSection(sm[1], sm[2])
      continue
    }

    if (kind === 'h') {
      const t = text.replace(/^\*+|\*+$/g, '').trim()
      if (isHeadingLike(t)) {
        pendingHeading = t
        continue
      }
      // Proviso-style artifact: keep as content.
      if (section) pushBlock(section, t)
      continue
    }

    // Annotation-only lines: [Amending authority…]
    if (/^\[.*\]$/.test(text) && section) {
      attachAnnotation(section, text)
      continue
    }

    // Stray bold-wrapped heading-looking line (BM wraps some headings in **).
    if (BOLD_ONLY_RE.test(text)) {
      pendingHeading = text.replace(/^\*\*|\*\*$/g, '')
      continue
    }

    if (section) {
      const stripped = stripMd(text)
      if (ITEM_RE.test(stripped) || stripped.startsWith(QUOTE_START)) addText(section, text)
      else appendOrNew(section, text)
    } else {
      warnings.push(`[${cfg.lang}] orphan line: "${text.slice(0, 60)}"`)
    }
  }

  return { parts, sections, schedules, preamble }
}

function isTableHeader(text, lang) {
  const headers =
    lang === 'en'
      ? ['amending law', 'short title', 'in force from', 'amending authority', 'section', 'acts', 'amendments']
      : ['undang-undang', 'tajuk ringkas', 'berkuat kuasa', 'meminda', 'seksyen']
  const t = text.toLowerCase()
  return headers.some((h) => t === h || t.startsWith(`${h} —`))
}

function isScheduleJunk(text, lang) {
  const junk =
    lang === 'en'
      ? [
          /^\(1\)\s*\(2\)$/,
          /^Name of Free (Commercial|Industrial) Zone( Activities)?$/,
          /^Activities$/,
          /^\([12]\)$/,
          /^Section$/,
          /^(First|Second|Third) Schedule$/,
        ]
      : [
          /^\(1\)\s*\(2\)$/,
          /^Nama bagi Zon/,
          /^Aktiviti-aktiviti/,
          /^Seksyen$/,
          /^\([12]\)$/,
          /^JADUAL (PERTAMA|KEDUA|KETIGA)$/,
          /^PINDAAN DAN PEMANSUHAN$/,
        ]
  return junk.some((re) => re.test(text))
}

/* ------------------------------------------------------------ parse: EN */

const en = parseSource({
  lang: 'en',
  path: EN_PATH,
  bodyMarker: 'An Act to provide for the establishment of free zones',
  partRe: PART_EN_RE,
  sectionTest: (t) => SECTION_RE.test(t),
  scheduleMarkerTest: (t) => /^(FIRST|SECOND|THIRD) SCHEDULE$/.test(t) || /^LIST OF/.test(t),
  pageTitleRe: /^(LAWS OF MALAYSIA|Act 438|FREE ZONES ACT 1990|Free Zones \d+|\d+ Laws of Malaysia.*)$/,
  dropHeaders: new Set(['LAWS OF MALAYSIA', 'Act 438', 'FREE ZONES ACT 1990']),
  pageArtifacts: [
    /^Free Zones \d+$/,
    /^\d+ Laws of Malaysia/,
    /^Laws of Malaysia ACT 438$/,
    /^ACT 438$/,
    /^\|?\s*\d{1,3}\s*\|+\s*Laws of Malaysia\|/,
  ],
  scheduleMarkers: [
    { id: 'sched-1', label: 'First Schedule', bmLabel: 'Jadual Pertama', match: /^FIRST SCHEDULE$/ },
    { id: 'sched-2', label: 'Second Schedule', bmLabel: 'Jadual Kedua', match: /^SECOND SCHEDULE$/ },
    { id: 'sched-3', label: 'Third Schedule', bmLabel: 'Jadual Ketiga', match: /^THIRD SCHEDULE$/ },
  ],
  listMarkers: [
    { id: 'list-amendments', title: 'List of Amendments', match: /^LIST OF AMENDMENTS$/ },
    { id: 'list-sections', title: 'List of Sections Amended', match: /^LIST OF SECTIONS AMENDED$/ },
  ],
  deletedWords: ['Deleted'],
  deletedHeading: '(Deleted)',
})

/* ------------------------------------------------------------ parse: BM */

const bm = parseSource({
  lang: 'bm',
  path: BM_PATH,
  bodyMarker: 'Suatu Akta untuk membuat peruntukan mengenai penubuhan zon bebas',
  partRe: PART_BM_RE,
  sectionTest: (t) => SECTION_RE.test(t),
  scheduleMarkerTest: (t) => /^JADUAL (PERTAMA|KEDUA|KETIGA)$/.test(t) || /^SENARAI/.test(t),
  pageTitleRe: /^(UNDANG-UNDANG MALAYSIA|Akta 438|AKTA ZON BEBAS 1990|Zon Bebas \d+|\d+ Undang-Undang Malaysia.*)$/,
  dropHeaders: new Set(['UNDANG-UNDANG MALAYSIA', 'Akta 438', 'AKTA ZON BEBAS 1990']),
  pageArtifacts: [
    /^Zon Bebas \d+$/,
    /^\d+ Undang-Undang Malaysia/,
    /^Undang-Undang Malaysia AKTA 438$/,
    /^AKTA 438$/,
  ],
  scheduleMarkers: [
    { id: 'sched-1', label: 'Jadual Pertama', bmLabel: 'Jadual Pertama', match: /^JADUAL PERTAMA$/ },
    { id: 'sched-2', label: 'Jadual Kedua', bmLabel: 'Jadual Kedua', match: /^JADUAL KEDUA$/ },
    { id: 'sched-3', label: 'Jadual Ketiga', bmLabel: 'Jadual Ketiga', match: /^JADUAL KETIGA$/ },
    { id: 'list-amendments', title: 'Senarai Pindaan', match: /^SENARAI PINDAAN$/, skip: true },
    { id: 'list-sections', title: 'Senarai Seksyen yang Dipinda', match: /^SENARAI SEKSYEN YANG DIPINDA$/, skip: true },
  ],
  listMarkers: [],
  deletedWords: ['Dipotong'],
  deletedHeading: '(Dipotong)',
})

/* --------------------------------------------------------------- merge */

const bmByNumber = new Map(bm.sections.map((s) => [s.number, s]))
const bmSchedById = new Map(bm.schedules.map((s) => [s.id, s]))

let bmCovered = 0
for (const sec of en.sections) {
  const b = bmByNumber.get(sec.number)
  if (b) {
    sec.bm = { heading: b.heading, content: b.content }
    bmCovered++
  } else {
    sec.bm = null
  }
}

const bmPartTitleByLabel = new Map(bm.parts.map((p) => [p.label, p.bmTitle || p.title]))

for (const sched of en.schedules) {
  const b = bmSchedById.get(sched.id)
  sched.bm = b && !b.skip ? { label: b.label, ref: b.ref, blocks: b.blocks } : null
}

/* -------------------------------------------------------------- output */

const act = {
  meta: {
    title: 'Free Zones Act 1990',
    bmTitle: 'Akta Zon Bebas 1990',
    actNumber: 'Act 438',
    enSource: 'Laws of Malaysia — updated text as at 15 December 2025 (azbe.md)',
    bmSource: 'Undang-Undang Malaysia — cetakan semula as at 1 Mei 2013 (azb.md)',
  },
  preamble: { en: en.preamble, bm: bm.preamble },
  parts: en.parts.map((p) => ({
    id: p.id,
    label: p.label,
    title: p.title,
    bmTitle: bmPartTitleByLabel.get(p.label) || p.title,
    sections: p.sections,
  })),
  schedules: en.schedules,
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(OUT_PATH, JSON.stringify(act, null, 1), 'utf8')

/* -------------------------------------------------------------- report */

console.log(`Parts: ${act.parts.length}`)
for (const p of act.parts) {
  console.log(`  ${p.label.padEnd(4)} ${p.title || '(untitled)'} / ${p.bmTitle || '—'} — ${p.sections.length} sections`)
}
console.log(`Sections total: ${en.sections.length} (BM overlay: ${bmCovered}, EN-only: ${en.sections.length - bmCovered})`)
console.log(
  `BM-only sections (in azb.md but not azbe.md): ${
    bm.sections.filter((s) => !en.sections.some((e) => e.number === s.number)).join(', ') || '(none)'
  }`,
)
console.log(`Schedules/lists: ${act.schedules.map((s) => s.id + (s.bm ? '*' : '')).join(', ')}`)
console.log(`Preamble lines: en=${en.preamble.length} bm=${bm.preamble.length}`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of warnings.slice(0, 60)) console.log('  ! ' + w)
  if (warnings.length > 60) console.log(`  … and ${warnings.length - 60} more`)
} else {
  console.log('\nNo warnings.')
}
console.log(`\nWrote ${OUT_PATH}`)
