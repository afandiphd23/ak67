import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { allRegulations, findRegulation, regByNumber } from '../data'
import type { FlatRegulation } from '../types'
import { UI, useLang } from '../i18n'
import { SectionBody } from './SectionBody'

/** A run of plain text, a link to another regulation, or a link to the schedules. */
export type Token = string | { kind: 'xref'; id: string; label: string } | { kind: 'sched'; id: string; label: string }

/** Regulation number, 1–60 — must end at a word boundary so "2019" never matches. */
const NUM = String.raw`\d{1,2}(?![\dA-Za-z])`
/** Separators inside a list citation: "regulations 22, 23 and 24" / "dan". */
const SEP = String.raw`(?:\s*[,;&]\s*|\s+(?:and|or|dan|atau)\s+)`
/** Citations like "regulation 23", "regulations 22 and 23", "Peraturan 58". */
const REGREF_SRC =
  String.raw`\b(?:regulations?|peraturan-peraturan|peraturan)\s+` + NUM + String.raw`(?:` + SEP + NUM + `)*`
/** Schedule citations like "First Schedule" / "Jadual Ketiga". */
const SCHED_SRC =
  String.raw`\b(?:(First|Second|Third|Fourth|Fifth|Sixth)\s+Schedule|(Jadual)\s+(Pertama|Kedua|Ketiga|Keempat|Kelima|Keenam))\b`
const SCHED_NUM = { First: 1, Second: 2, Third: 3, Fourth: 4, Fifth: 5, Sixth: 6, Pertama: 1, Kedua: 2, Ketiga: 3, Keempat: 4, Kelima: 5, Keenam: 6 } as const

const XREF_SRC = `${SCHED_SRC}|${REGREF_SRC}`
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
    if (m[1] || m[2]) {
      // Schedule citation — link to the schedules page.
      const word = (m[1] || m[3]) as keyof typeof SCHED_NUM
      tokens.push({ kind: 'sched', id: `sched-${SCHED_NUM[word]}`, label: m[0] })
    } else {
      // Regulation citation — link each number to its regulation.
      let pos = start
      scan(m[0], new RegExp(NUM_SRC, 'g'), (n) => {
        const nStart = start + n.index
        if (nStart > pos) tokens.push(text.slice(pos, nStart))
        const target = regByNumber(n[0])
        if (target) tokens.push({ kind: 'xref', id: target.id, label: n[0] })
        else tokens.push(n[0])
        pos = nStart + n[0].length
      })
      const end = start + m[0].length
      if (pos < end) tokens.push(text.slice(pos, end))
    }
    last = start + m[0].length
  })
  if (last < text.length) tokens.push(text.slice(last))

  cache.set(text, tokens)
  return tokens
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** Renders text with "regulation 23"-style citations linked to their regulations. */
export function TextWithXrefs({ text }: { text: string }) {
  const tokens = useMemo(() => tokenize(text), [text])
  const [preview, setPreview] = useState<{
    section: FlatRegulation
    x: number
    y: number
    above: boolean
  } | null>(null)
  const [modalId, setModalId] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const show = (el: HTMLElement, id: string) => {
    const section = findRegulation(id)
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
        ) : tok.kind === 'sched' ? (
          <a key={i} className="xref" href="#schedules" title={UI.en.scheduleTitle}>
            {tok.label}
          </a>
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
      {modalId && (
        <XrefModal
          id={modalId}
          onClose={() => setModalId(null)}
          onNavigate={setModalId}
        />
      )}
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
  section: FlatRegulation
  x: number
  y: number
  above: boolean
  onEnter: () => void
  onLeave: () => void
  onOpen: () => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const heading = lang === 'bm' && section.bm ? section.bm.heading : section.heading
  const content = lang === 'bm' && section.bm ? section.bm.content : section.content
  const snippet = (content[0]?.text ?? '').trim()
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

/** Compact full-text preview of a regulation, shown over the page. */
function XrefModal({
  id,
  onClose,
  onNavigate,
}: {
  id: string
  onClose: () => void
  onNavigate: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const section = findRegulation(id)
  const closeRef = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)

  const idx = allRegulations.findIndex((r) => r.id === id)
  const prev = idx > 0 ? allRegulations[idx - 1] : undefined
  const next = idx >= 0 && idx < allRegulations.length - 1 ? allRegulations[idx + 1] : undefined

  // Mount-only: pause the app's global shortcuts, lock scroll, focus the dialog.
  useEffect(() => {
    document.body.dataset.xrefModal = '1'
    closeRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      delete document.body.dataset.xrefModal
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // New regulation in the modal: start scrolled to its top.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && prev) onNavigate(prev.id)
      else if (e.key === 'ArrowRight' && next) onNavigate(next.id)
    }
    // Navigating (link, back/forward, "open full") always closes the preview.
    window.addEventListener('keydown', onKey)
    window.addEventListener('hashchange', onClose)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('hashchange', onClose)
    }
  }, [onClose, onNavigate, prev, next])

  if (!section) return null
  const loc: FlatRegulation =
    lang === 'bm' && section.bm ? { ...section, heading: section.bm.heading, content: section.bm.content } : section

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
        <div className="xref-modal-body" ref={bodyRef}>
          <SectionBody section={loc} lang={lang} />
        </div>
        <div className="xref-modal-actions">
          <div className="xref-modal-pager">
            {prev ? (
              <button
                className="pager-btn"
                onClick={() => onNavigate(prev.id)}
                title={t.prevSection}
                aria-label={t.prevSection}
              >
                ← {prev.number}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button
                className="pager-btn"
                onClick={() => onNavigate(next.id)}
                title={t.nextSection}
                aria-label={t.nextSection}
              >
                {next.number} →
              </button>
            ) : (
              <span />
            )}
          </div>
          <button className="btn" onClick={openFull}>
            {t.previewOpenFull}
          </button>
        </div>
      </div>
    </div>
  )
}
