import type { FlatRegulation } from '../data'
import type { QuoteBlock } from '../types'
import Annotation from './Annotation'
import { HighlightableText } from './HighlightableText'
import { UI, type Lang } from '../i18n'

export function SectionBody({ section, lang }: { section: FlatRegulation; lang: Lang }) {
  const t = UI[lang]
  return (
    <div className="section-body">
      {section.content.map((block, i) => {
        if (block.kind === 'quote') {
          return <QuoteEntry key={i} block={block as QuoteBlock} sectionId={section.id} />
        }
        return (
          <p key={i} className={block.kind === 'item' ? 'item' : 'para'}>
            <HighlightableText text={block.text} sectionId={section.id} />
            {block.annotation && <Annotation text={block.annotation} />}
          </p>
        )
      })}
      {section.annotation && <Annotation text={section.annotation} />}
      <p className="print-footer">{t.printFooter}</p>
      <p className="print-footer">{t.printDisclaimer}</p>
    </div>
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
