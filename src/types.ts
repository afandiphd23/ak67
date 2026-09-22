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
  pageBreakBefore: boolean
  deleted: boolean
  annotation: string
  content: Block[]
}

export interface Part {
  id: string
  label: string
  title: string
  pageBreakBefore: boolean
  headnotes: { text: string }[]
  annotation: string
  sections: Section[]
}

export interface CustomsAct {
  meta: {
    title: string
    actNumber: string
    source: string
  }
  parts: Part[]
  schedule: { title: string; paragraphs: string[] } | null
  note: { title: string; paragraphs: string[] } | null
}

/** Localized (Bahasa Melayu) section, produced by scripts/merge-bm.mjs. */
export interface BmSection {
  heading: string
  content: Block[]
}
