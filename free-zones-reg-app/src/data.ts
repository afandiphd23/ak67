import data from './data/free-zones-reg.json'
import type { Block, FlatRegulation, FreeZonesRegulations, RegPart, Regulation } from './types'

const reg = data as unknown as FreeZonesRegulations
export default reg

export type { FlatRegulation } from './types'

/** All regulations in document order, with their owning part attached. */
export const allRegulations: FlatRegulation[] = reg.parts.flatMap((part) =>
  part.sections.map((section) => ({ ...section, part })),
)

export function findRegulation(id: string): FlatRegulation | undefined {
  return allRegulations.find((r) => r.id === id)
}

/** Index of regulations by citation number (e.g. "32A"), for cross-reference links. */
const regByNumberMap = new Map(allRegulations.map((r) => [r.number, r]))

/** Look up a regulation by its citation number, e.g. regByNumber('32A'). */
export function regByNumber(number: string): FlatRegulation | undefined {
  return regByNumberMap.get(number)
}

/** Case-insensitive full-text search over headings, numbers and body text. */
export function searchRegulations(query: string, limit = 80): FlatRegulation[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const results: FlatRegulation[] = []
  for (const r of allRegulations) {
    if (
      r.heading.toLowerCase().includes(q) ||
      r.number === q ||
      r.content.some((b) => blockText(b).toLowerCase().includes(q))
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

/** The statute text is BM-only; sections render identically in both UI modes. */
export function localized<T extends Regulation>(section: T, _lang: 'en' | 'bm'): T {
  return section
}

/** Localized view of a part title (BM is the native title). */
export function partTitleOf(p: RegPart, lang: 'en' | 'bm'): string {
  return lang === 'en' && p.bmTitle ? p.bmTitle : p.title
}
