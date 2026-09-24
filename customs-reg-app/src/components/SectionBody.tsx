import type { FlatRegulation } from '../types'
import type { Block, QuoteBlock } from '../types'
import Annotation from './Annotation'
import { HighlightableText } from './HighlightableText'
import { UI, type Lang } from '../i18n'

export function SectionBody({ section, lang }: { section: FlatRegulation; lang: Lang }) {
  const t = UI[lang]
  return (
    <div className="section-body">
      {section.content.map((block, i) => (
        <BlockView key={i} block={block} sectionId={section.id} />
      ))}
      <p className="print-footer">{t.printFooter}</p>
      <p className="print-footer">{t.printDisclaimer}</p>
    </div>
  )
}

export function BlockView({ block, sectionId }: { block: Block; sectionId: string }) {
  if (block.kind === 'quote') {
    return <QuoteEntry block={block as QuoteBlock} sectionId={sectionId} />
  }
  return (
    <p className={block.kind === 'item' ? 'item' : 'para'}>
      <HighlightableText text={block.text} sectionId={sectionId} />
      {block.annotation && <Annotation text={block.annotation} />}
    </p>
  )
}

function QuoteEntry({ block, sectionId }: { block: QuoteBlock; sectionId: string }) {
  return (
    <div className="quote-entry">
      <p className="quote-term">
        &ldquo;<HighlightableText text={block.term} sectionId={sectionId} /> {block.text}
        {block.annotation && <Annotation text={block.annotation} />}
      </p>
      {block.items.length > 0 && (
        <div className="quote-items">
          {block.items.map((it, i) => (
            <p key={i} className="item">
              <HighlightableText text={it} sectionId={sectionId} />
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
