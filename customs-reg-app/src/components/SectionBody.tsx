import type { FlatRegulation } from '../types'
import type { Block, QuoteBlock } from '../types'
import Annotation from './Annotation'
import { TextWithXrefs } from './TextWithXrefs'
import { UI, type Lang } from '../i18n'

export function SectionBody({ section, lang }: { section: FlatRegulation; lang: Lang }) {
  const t = UI[lang]
  return (
    <div className="section-body">
      {section.content.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
      <p className="print-footer">{t.printFooter}</p>
      <p className="print-footer">{t.printDisclaimer}</p>
    </div>
  )
}

export function BlockView({ block }: { block: Block }) {
  if (block.kind === 'quote') {
    return <QuoteEntry block={block as QuoteBlock} />
  }
  return (
    <p className={block.kind === 'item' ? 'item' : 'para'}>
      <TextWithXrefs text={block.text} />
      {block.annotation && <Annotation text={block.annotation} />}
    </p>
  )
}

function QuoteEntry({ block }: { block: QuoteBlock }) {
  return (
    <div className="quote-entry">
      <p className="quote-term">
        &ldquo;<TextWithXrefs text={block.term} /> {block.text}
        {block.annotation && <Annotation text={block.annotation} />}
      </p>
      {block.items.length > 0 && (
        <div className="quote-items">
          {block.items.map((it, i) => (
            <p key={i} className="item">
              <TextWithXrefs text={it} />
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
