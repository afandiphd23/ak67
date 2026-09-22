import data from './data/customs-act.json'
import bmData from './bm/customs-act-bm.json'
import partsT from './bm/parts.json'
import type { CustomsAct, Part, Section, BmSection } from './types'

const act = data as unknown as CustomsAct

// Keyed BM translations; a section without an entry falls back to English.
const bm = bmData as Record<string, BmSection>

export interface FlatSection extends Section {
  part: Part
}

/** All sections in document order, with their owning part attached. */
export const allSections: FlatSection[] = act.parts.flatMap((part) =>
  part.sections.map((section) => ({ ...section, part })),
)

export function findSection(id: string): FlatSection | undefined {
  return allSections.find((s) => s.id === id)
}

/** Index of sections by citation number (e.g. "65A"), for cross-reference links. */
const sectionByNumberMap = new Map(allSections.map((s) => [s.number.toUpperCase(), s]))

/** Look up a section by its citation number, e.g. sectionByNumber('65A'). */
export function sectionByNumber(number: string): FlatSection | undefined {
  return sectionByNumberMap.get(number.toUpperCase())
}

/** Bahasa Melayu heading/content for a section, or undefined if not translated. */
export function bmSection(id: string): BmSection | undefined {
  return bm[id]
}

/** Bahasa Melayu PART title, or undefined to fall back to English. */
export function bmPartTitle(label: string): string | undefined {
  return partsT[label as keyof typeof partsT]
}

/** Case-insensitive full-text search over headings, numbers and body text. */
export function searchSections(query: string, limit = 80): FlatSection[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const results: FlatSection[] = []
  for (const s of allSections) {
    if (
      s.heading.toLowerCase().includes(q) ||
      s.number.toLowerCase() === q ||
      s.content.some((b) => blockText(b).toLowerCase().includes(q))
    ) {
      results.push(s)
      if (results.length >= limit) return results
    }
  }
  return results
}

export function blockText(b: { text?: string; items?: string[] }): string {
  if ('term' in b) return `${b.text} ${(b.items ?? []).join(' ')}`
  return b.text ?? ''
}

export default act
