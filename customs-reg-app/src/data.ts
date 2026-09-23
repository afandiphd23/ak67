import data from './data/customs-reg.json'
import type { Block, CustomsRegulations, FlatRegulation, RegPart } from './types'

const reg = data as unknown as CustomsRegulations
export default reg

/** All regulations in document order, with their owning part attached. */
export const allRegulations: FlatRegulation[] = reg.parts.flatMap((part) =>
  part.sections.map((section) => ({ ...section, part })),
)

export function findRegulation(id: string): FlatRegulation | undefined {
  return allRegulations.find((r) => r.id === id)
}

/** Index of regulations by citation number (e.g. "23"), for cross-reference links. */
const regByNumberMap = new Map(allRegulations.map((r) => [r.number, r]))

/** Look up a regulation by its citation number, e.g. regByNumber('23'). */
export function regByNumber(number: string): FlatRegulation | undefined {
  return regByNumberMap.get(number)
}

/** Case-insensitive full-text search over headings, numbers and body text (both languages). */
export function searchRegulations(query: string, limit = 80): FlatRegulation[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const results: FlatRegulation[] = []
  for (const r of allRegulations) {
    const bm = r.bm
    if (
      r.heading.toLowerCase().includes(q) ||
      r.number === q ||
      r.content.some((b) => blockText(b).toLowerCase().includes(q)) ||
      bm?.heading.toLowerCase().includes(q) ||
      bm?.content.some((b) => blockText(b).toLowerCase().includes(q))
    ) {
      results.push(r)
      if (results.length >= limit) return results
    }
  }
  return results
}

export function blockText(b: Block): string {
  if (b.kind === 'quote') return `${b.term} ${b.text} ${(b.items ?? []).join(' ')}`
  return b.text
}

/** Localized view of a part: BM title when requested. */
export function partTitle(p: RegPart, lang: 'en' | 'bm'): string {
  return lang === 'bm' ? p.bmTitle || p.title : p.title
}
