// Dump the English source of a batch in a compact plain-text format for translation.
// Usage: node scripts/extract-en.mjs <batchNo> [startOffset] [count]
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const plan = require('../batch-plan.json')
const act = JSON.parse(readFileSync(new URL('../src/data/customs-act.json', import.meta.url)))

const batchNo = process.argv[2]
const start = Number(process.argv[3] ?? 0)
const count = Number(process.argv[4] ?? 1000)
const ids = plan[batchNo]
if (!ids) {
  console.error(`batch ${batchNo} not found`)
  process.exit(1)
}

const byId = new Map()
for (const part of act.parts) for (const s of part.sections) byId.set(s.id, s)

let shown = 0
for (let i = start; i < ids.length && shown < count; i++, shown++) {
  const s = byId.get(ids[i])
  if (!s) {
    console.error(`section ${ids[i]} not found`)
    continue
  }
  console.log(`### ${s.id} | ${s.heading}${s.deleted ? ' | DELETED' : ''}`)
  for (const b of s.content) {
    if (b.kind === 'quote') {
      console.log(`[Q] ${b.term} :: ${b.text}`)
      for (const it of b.items ?? []) console.log(`  | ${it}`)
    } else {
      console.log(b.text)
    }
  }
}
