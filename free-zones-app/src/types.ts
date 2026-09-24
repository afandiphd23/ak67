/**
 * Type shapes for the Free Zones Act 1990 data produced by
 * scripts/generate-data.mjs. Block structure is identical to the other
 * readers so components can be shared verbatim.
 *
 * EN (azbe.md, 15 Dec 2025) is the PRIMARY text; BM (azb.md, 1 May 2013)
 * is a per-section overlay. Sections inserted after the 2013 BM reprint
 * (8A, 8B, 10A, 17A, 17B, 20A, 30B, 41A, 48A, 48B) have bm: null.
 */
export interface ParagraphBlock {
  kind: 'paragraph'
  text: string
  annotation: string
}

export interface ItemBlock {
  kind: 'item'
  text: string
  annotation: string
}

export interface QuoteBlock {
  kind: 'quote'
  term: string
  text: string
  annotation: string
  items: string[]
}

export type Block = ParagraphBlock | ItemBlock | QuoteBlock

export interface Section {
  id: string
  number: string
  heading: string
  deleted: boolean
  annotation: string
  content: Block[]
  /** Bahasa Melayu text from the 2013 gazette; null for post-2013 sections. */
  bm: { heading: string; content: Block[] } | null
}

export interface Part {
  id: string
  label: string
  title: string
  bmTitle: string
  sections: Section[]
}

export interface ScheduleEntry {
  label: string
  ref: string
  blocks: Block[]
}

export interface Schedule {
  id: string
  label: string
  bmLabel: string
  ref: string
  title: string
  blocks: Block[]
  bm: ScheduleEntry | null
}

export interface FreeZonesAct {
  meta: {
    title: string
    bmTitle: string
    actNumber: string
    enSource: string
    bmSource: string
  }
  preamble: { en: string[]; bm: string[] }
  parts: Part[]
  schedules: Schedule[]
}

/** A section flattened with its owning part attached. */
export interface FlatSection extends Section {
  part: Part
}
