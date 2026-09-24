/**
 * Type shapes for the Free Zones Regulations 1991 data produced by
 * scripts/generate-data.mjs. Block structure is identical to the other
 * readers so components can be shared verbatim.
 *
 * The gazette text is Bahasa Melayu only (P.U. (B) 455/1991, as at the
 * January 2011 print in azbp.md). There is no English overlay; the UI
 * chrome is bilingual and the statute text stays BM in both modes.
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
  annotation: string
  content: Block[]
}

export interface RegPart {
  id: string
  label: string
  title: string
  bmTitle: string
  sections: Regulation[]
}

export interface Schedule {
  id: string
  label: string
  ref: string
  title: string
  blocks: Block[]
}

export interface FreeZonesRegulations {
  meta: {
    title: string
    bmTitle: string
    number: string
    parent: string
    bmParent: string
    madeUnder: string
    bmMadeUnder: string
    commencement: string
    source: string
  }
  preamble: string[]
  parts: RegPart[]
  schedules: Schedule[]
}

/** A regulation flattened with its owning part attached. */
export interface FlatRegulation extends Regulation {
  part: RegPart
}
