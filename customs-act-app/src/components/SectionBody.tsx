import type { FlatSection } from '../data'
import type { QuoteBlock } from '../types'
import Annotation from './Annotation'
import { TextWithXrefs } from './TextWithXrefs'
import { UI, type Lang } from '../i18n'

export function SectionBody({ section, lang }: { section: FlatSection; lang: Lang }) {
  const t = UI[lang]
  if (section.deleted) {
    return (
      <>
        <p className="deleted-note">
          [{t.secWord} {section.number} — {t.deletedOmitted}.{' '}
          {stripBracket(section.annotation) || t.deletedNoForce}]
        </p>
        {lang === 'bm' && <p className="translation-note">{t.translatedNote}</p>}
        <p className="print-footer">{t.printFooter}</p>
        <p className="print-footer">{t.printDisclaimer}</p>
      </>
    )
  }
  return (
    <div className="section-body">
      {section.content.map((block, i) => {
        if (block.kind === 'quote') {
          return <QuoteEntry key={i} block={block as QuoteBlock} />
        }
        return (
          <p key={i} className={block.kind === 'item' ? 'item' : 'para'}>
            <TextWithXrefs text={block.text} />
            {block.annotation && <Annotation text={block.annotation} />}
          </p>
        )
      })}
      {section.annotation && <Annotation text={section.annotation} />}
      {lang === 'bm' && <p className="translation-note">{t.translatedNote}</p>}
      <p className="print-footer">{t.printFooter}</p>
      <p className="print-footer">{t.printDisclaimer}</p>
    </div>
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

function stripBracket(s: string): string {
  return s.replace(/^\[|\]$/g, '').trim()
}
