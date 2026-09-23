// Print EN vs BM block lists for problem sections to locate alignment breaks.
// Default: compact heads. `--full` prints complete texts.
// Usage: node scripts/diff-blocks.mjs [--full] s-123 s-124 ...
import { readFileSync, readdirSync } from 'node:fs'

const full = process.argv.includes('--full')
const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'))

const en = JSON.parse(readFileSync(new URL('../src/data/customs-act.json', import.meta.url)))
const enById = new Map()
for (const p of en.parts) for (const s of p.sections) enById.set(s.id, s)

const bm = {}
for (const f of readdirSync(new URL('../src/bm', import.meta.url)).sort()) {
  if (!/^bm-batch-\d+\.mjs$/.test(f)) continue
  const batch = (await import(new URL(`../src/bm/${f}`, import.meta.url))).default
  for (const sec of batch) bm[sec.id] = sec
}

const cut = (s, n) => JSON.stringify(s).slice(1, -1).slice(0, n)

for (const id of ids) {
  const e = enById.get(id)
  const b = bm[id]
  console.log(`\n===== ${id} ===== en=${e?.content.length} bm=${b?.content?.length}`)
  if (!e || !b) { console.log('MISSING'); continue }
  console.log('EN:')
  e.content.forEach((x, i) => console.log(`  [${i}] ${cut(x.text, full ? 100000 : 88)}`))
  console.log('BM:')
  b.content.forEach((x, i) => console.log(`  [${i}] ${cut(x.text, full ? 100000 : 88)}`))
}
