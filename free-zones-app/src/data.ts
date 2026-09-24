import data from './data/free-zones.json'
import type { Block, FlatSection, FreeZonesAct, Part, Section } from './types'

export type { FlatSection } from './types'

const act = data as unknown as FreeZonesAct
export default act

/** All sections in document order, with their owning part attached. */
export const allSections: FlatSection[] = act.parts.flatMap((part) =>
  part.sections.map((section) => ({ ...section, part })),
)

export function findSection(id: string): FlatSection | undefined {
  return allSections.find((s) => s.id === id)
}

/** Index of sections by citation number (e.g. "42A"), for cross-reference links. */
const sectionByNumberMap = new Map(allSections.map((s) => [s.number.toUpperCase(), s]))

/** Look up a section by its citation number, e.g. sectionByNumber('42A'). */
export function sectionByNumber(number: string): FlatSection | undefined {
  return sectionByNumberMap.get(number.toUpperCase())
}

/** Case-insensitive full-text search over headings, numbers and body text (both languages). */
export function searchSections(query: string, limit = 80): FlatSection[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const results: FlatSection[] = []
  for (const s of allSections) {
    if (
      s.heading.toLowerCase().includes(q) ||
      s.number.toLowerCase() === q ||
      s.content.some((b) => blockText(b).toLowerCase().includes(q)) ||
      s.bm?.heading.toLowerCase().includes(q) ||
      s.bm?.content.some((b) => blockText(b).toLowerCase().includes(q))
    ) {
      results.push(s)
      if (results.length >= limit) return results
    }
  }
  return results
}

export function blockText(b: Block): string {
  if (b.kind === 'quote') return `${b.term} ${b.text} ${(b.items ?? []).join(' ')}`
  return b.text
}

/** Localized view of a section: BM overlay when requested and available. */
export function localized<T extends Section>(section: T, lang: 'en' | 'bm'): T {
  if (lang !== 'bm') return section
  if (!section.bm) return section
  return { ...section, heading: section.bm.heading, content: section.bm.content }
}

/** Localized view of a part: BM title when requested (falls back to EN title). */
export function partTitleOf(p: Part, lang: 'en' | 'bm'): string {
  return lang === 'bm' ? p.bmTitle || p.title : p.title
}
