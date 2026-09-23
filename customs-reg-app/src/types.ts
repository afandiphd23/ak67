/**
 * Type shapes for the Customs Regulations 2019 data produced by
 * scripts/generate-data.mjs. Blocks are structurally identical to the
 * Customs Act app so the reader components can be shared verbatim.
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

export interface Regulation {
  id: string
  number: string
  heading: string
  content: Block[]
  /** Bahasa Melayu text extracted directly from the gazette. */
  bm: { heading: string; content: Block[] } | null
}

export interface RegPart {
  id: string
  label: string
  title: string
  bmTitle: string
  sections: Regulation[]
}

export interface ScheduleEntry {
  label: string
  regRef: string
  title: string
  blocks: Block[]
}

export interface Schedule {
  id: string
  label: string
  regRef: string
  title: string
  missing: boolean
  blocks: Block[]
  bm: ScheduleEntry | null
}

export interface CustomsRegulations {
  meta: {
    title: string
    number: string
    parent: string
    madeDate: string
    source: string
  }
  preamble: { en: string; bm: string }
  madeNote: { en: string; bm: string }
  parts: RegPart[]
  schedules: Schedule[]
}

/** A regulation flattened with its owning part attached. */
export interface FlatRegulation extends Regulation {
  part: RegPart
}
