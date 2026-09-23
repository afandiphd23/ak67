// Merge compact BM batch files (src/bm/bm-batch-*.mjs) into src/bm/customs-act-bm.json.
// BM files carry only id/heading/text/items; `kind` and `annotation` are copied from
// the English source (annotations are statutory citations, identical in both languages).
// Usage: node scripts/merge-bm.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'

const en = JSON.parse(readFileSync(new URL('../src/data/customs-act.json', import.meta.url)))

const enById = new Map()
for (const p of en.parts) for (const s of p.sections) enById.set(s.id, s)

const bm = {}
let files = 0
for (const f of readdirSync(new URL('../src/bm', import.meta.url)).sort()) {
  if (!/^bm-batch-\d+\.mjs$/.test(f)) continue
  files++
  const batch = (await import(new URL(`../src/bm/${f}`, import.meta.url))).default
  for (const sec of batch) {
    if (bm[sec.id]) throw new Error(`duplicate section ${sec.id} in ${f}`)
    bm[sec.id] = sec
  }
}

let missing = 0
const errors = []

for (const [id, enSec] of enById) {
  const t = bm[id]
  if (!t) {
    missing++
    errors.push(`MISSING ${id}`)
    continue
  }
  if (typeof t.heading !== 'string' || !t.heading.trim()) {
    errors.push(`BAD HEADING ${id}`)
    continue
  }
  const enBlocks = enSec.content
  const bmBlocks = Array.isArray(t.content) ? t.content : []
  if (enBlocks.length !== bmBlocks.length) {
    errors.push(`BLOCK COUNT ${id}: en=${enBlocks.length} bm=${bmBlocks.length}`)
    continue
  }
  for (let i = 0; i < enBlocks.length; i++) {
    const eb = enBlocks[i]
    const bb = bmBlocks[i]
    if (eb.kind === 'quote') {
      if (bb.kind !== 'quote' || !bb.term || !bb.term.trim()) {
        errors.push(`QUOTE TERM ${id}[${i}]`)
        break
      }
      if (!bb.text || !String(bb.text).trim()) {
        errors.push(`QUOTE TEXT ${id}[${i}]`)
        break
      }
      const nEn = (eb.items ?? []).length
      const nBm = (bb.items ?? []).length
      if (nEn !== nBm) {
        errors.push(`ITEM COUNT ${id}[${i}]: en=${nEn} bm=${nBm}`)
        break
      }
      let bad = false
      for (let j = 0; j < nEn; j++) {
        if (!bb.items[j] || !bb.items[j].trim()) {
          errors.push(`EMPTY ITEM ${id}[${i}].items[${j}]`)
          bad = true
          break
        }
      }
      if (bad) break
    } else if (!bb.text || !String(bb.text).trim()) {
      errors.push(`EMPTY TEXT ${id}[${i}]`)
      break
    }
  }
}

const translated = Object.keys(bm).length
const total = enById.size
console.log(`batch files: ${files}`)
console.log(`translated: ${translated}/${total}`)
if (errors.length) {
  console.log(`problems: ${errors.length}`)
  console.log(errors.slice(0, 40).join('\n'))
  if (errors.length > 40) console.log(`… and ${errors.length - 40} more`)
} else {
  console.log('all sections structurally valid')
}

if (missing === 0 && errors.length === 0) {
  // Build the final keyed file with kind + annotation copied from English.
  const out = {}
  for (const [id, enSec] of enById) {
    const t = bm[id]
    out[id] = {
      heading: t.heading,
      content: enSec.content.map((eb, i) => {
        const bb = t.content[i]
        return {
          kind: eb.kind,
          text: bb.text,
          annotation: eb.annotation ?? '',
          ...(eb.kind === 'quote'
            ? { term: bb.term, items: bb.items }
            : {}),
        }
      }),
    }
  }
  writeFileSync(
    new URL('../src/bm/customs-act-bm.json', import.meta.url),
    JSON.stringify(out, null, 1),
  )
  console.log(`wrote src/bm/customs-act-bm.json (${total} sections)`)
  process.exit(0)
}
process.exit(1)
