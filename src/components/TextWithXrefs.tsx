import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { bmSection, findSection, sectionByNumber } from '../data'
import type { FlatSection } from '../data'
import { UI, useLang } from '../i18n'
import { SectionBody } from './SectionBody'

/** A run of plain text, or a link to another section of the Act. */
export type Token = string | { kind: 'xref'; id: string; label: string }

/** Citation number, e.g. 65A — must end at a word boundary so "12A" in "12AB" doesn't match. */
const NUM = String.raw`\d{1,3}[A-Z]{0,2}(?![\dA-Za-z])`
/** Separators inside a list citation: "sections 12, 13 and 14" / "&" / "dan". */
const SEP = String.raw`(?:\s*[,;&]\s*|\s+(?:and|or|dan|atau)\s+)`

/** Citations like "section 65A", "sections 12, 13 and 14", "Seksyen 10C". */
const XREF_SRC = String.raw`\b(?:sections?|seksyen)\s+` + NUM + String.raw`(?:` + SEP + NUM + `)*`
const NUM_SRC = NUM

function scan(src: string, re: RegExp, cb: (m: RegExpExecArray) => void) {
  re.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(src)) !== null) cb(m)
}

const cache = new Map<string, Token[]>()

/** Split text into plain runs and cross-reference tokens. Results are cached. */
export function tokenize(text: string): Token[] {
  const cached = cache.get(text)
  if (cached) return cached

  const tokens: Token[] = []
  let last = 0
  scan(text, new RegExp(XREF_SRC, 'gi'), (m) => {
    const start = m.index
    if (start > last) tokens.push(text.slice(last, start))
    let pos = start
    scan(m[0], new RegExp(NUM_SRC, 'gi'), (n) => {
      const nStart = start + n.index
      if (nStart > pos) tokens.push(text.slice(pos, nStart))
      const target = sectionByNumber(n[0])
      if (target) tokens.push({ kind: 'xref', id: target.id, label: n[0] })
      else tokens.push(n[0])
      pos = nStart + n[0].length
    })
    const end = start + m[0].length
    if (pos < end) tokens.push(text.slice(pos, end))
    last = end
  })
  if (last < text.length) tokens.push(text.slice(last))

  cache.set(text, tokens)
  return tokens
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Renders text with "section 65A"-style citations linked to their sections. */
export function TextWithXrefs({ text }: { text: string }) {
  const tokens = useMemo(() => tokenize(text), [text])
  const [preview, setPreview] = useState<{
    section: FlatSection
    x: number
    y: number
    above: boolean
  } | null>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = (el: HTMLElement, id: string) => {
    const section = findSection(id)
    if (!section) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      // Prefer below the link; flip above when the viewport bottom is near.
      const above = window.innerHeight - r.bottom < 180
      setPreview({
        section,
        x: clamp(r.left + r.width / 2, 175, window.innerWidth - 175),
        y: above ? r.top - 8 : r.bottom + 8,
        above,
      })
    }, 150)
  }

  // Delayed hide keeps the popover alive long enough to click it; moving the
  // cursor onto the popover cancels the hide.
  const hideSoon = () => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setPreview(null), 200)
  }
  const cancelHide = () => window.clearTimeout(timer.current)

  return (
    <>
      {tokens.map((tok, i) =>
        typeof tok === 'string' ? (
          <Fragment key={i}>{tok}</Fragment>
        ) : (
          <a
            key={i}
            className="xref"
            href={`#${tok.id}`}
            onMouseEnter={(e) => show(e.currentTarget, tok.id)}
            onMouseLeave={hideSoon}
            onFocus={(e) => show(e.currentTarget, tok.id)}
            onBlur={hideSoon}
            onClick={(e) => {
              // Self-references don't change the hash; re-fire to scroll to top.
              if (window.location.hash === `#${tok.id}`) {
                e.preventDefault()
                window.dispatchEvent(new HashChangeEvent('hashchange'))
              }
            }}
          >
            {tok.label}
          </a>
        ),
      )}
      {preview && (
        <XrefPreview
          section={preview.section}
          x={preview.x}
          y={preview.y}
          above={preview.above}
          onEnter={cancelHide}
          onLeave={hideSoon}
          onOpen={() => {
            setPreview(null)
            setModalId(preview.section.id)
          }}
        />
      )}
      {modalId && <XrefModal id={modalId} onClose={() => setModalId(null)} />}
    </>
  )
}

function XrefPreview({
  section,
  x,
  y,
  above,
  onEnter,
  onLeave,
  onOpen,
}: {
  section: FlatSection
  x: number
  y: number
  above: boolean
  onEnter: () => void
  onLeave: () => void
  onOpen: () => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const bm = lang === 'bm' ? bmSection(section.id) : undefined
  const heading = bm?.heading ?? section.heading
  const snippet = (bm?.content[0]?.text ?? section.content[0]?.text ?? '').trim()
  return (
    <div
      className={`xref-pop${above ? ' above' : ''}`}
      style={{ left: x, top: y }}
      role="button"
      title={t.previewOpenTitle}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onOpen}
    >
      <span className="xref-pop-crumb">
        {t.partWord} {section.part.label}
      </span>
      <span className="xref-pop-title">
        {t.secWord} {section.number} — {heading}
      </span>
      {snippet && <span className="xref-pop-snippet">{snippet.slice(0, 160)}…</span>}
      <span className="xref-pop-hint">{t.previewOpenTitle}</span>
    </div>
  )
}

/** Compact full-text preview of a section, shown over the page. */
function XrefModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { lang } = useLang()
  const t = UI[lang]
  const section = findSection(id)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Navigating (link, back/forward, "open full") always closes the preview.
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onClose)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  if (!section) return null
  const bm = lang === 'bm' ? bmSection(section.id) : undefined
  const loc: FlatSection = bm ? { ...section, heading: bm.heading, content: bm.content } : section

  const openFull = () => {
    if (window.location.hash === `#${section.id}`) {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    } else {
      window.location.hash = section.id
    }
    window.scrollTo({ top: 0 })
  }

  return (
    <div
      className="xref-modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="xref-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${t.secWord} ${section.number}`}
      >
        <div className="xref-modal-head">
          <div>
            <p className="crumb">
              {t.partWord} {section.part.label}
            </p>
            <h2 className="xref-modal-title">
              {t.secWord} {section.number} — {loc.heading}
            </h2>
          </div>
          <button
            ref={closeRef}
            className="xref-modal-close"
            onClick={onClose}
            title={t.previewClose}
            aria-label={t.previewClose}
          >
            ✕
          </button>
        </div>
        <div className="xref-modal-body">
          <SectionBody section={loc} lang={lang} />
        </div>
        <div className="xref-modal-actions">
          <button className="btn" onClick={openFull}>
            {t.previewOpenFull}
          </button>
        </div>
      </div>
    </div>
  )
}
