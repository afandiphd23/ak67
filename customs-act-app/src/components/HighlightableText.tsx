import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { HIGHLIGHT_COLORS, useHighlights, type HighlightColor } from '../highlights'
import { useLang } from '../i18n'

/**
 * Renders a text string, wrapping any stored highlights in <mark>. While the
 * user selects text inside, a small color popup offers to highlight/remove.
 */
export function HighlightableText({ text, sectionId }: { text: string; sectionId: string }) {
  const { forSection, add, remove } = useHighlights()
  const { lang } = useLang()
  const ref = useRef<HTMLSpanElement>(null)
  const [popup, setPopup] = useState<{ x: number; y: number; selected: string } | null>(null)
  const highlights = forSection(sectionId)

  const closePopup = useCallback(() => setPopup(null), [])

  // Close on outside click / scroll / Esc.
  useEffect(() => {
    if (!popup) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closePopup()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePopup()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [popup, closePopup])

  const onMouseUp = () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) {
      setPopup(null)
      return
    }
    // Only react to selections fully inside this text span.
    const range = sel.getRangeAt(0)
    if (!ref.current || !ref.current.contains(range.commonAncestorContainer)) {
      setPopup(null)
      return
    }
    const selected = sel.toString()
    if (!selected.trim()) {
      setPopup(null)
      return
    }
    const rect = range.getBoundingClientRect()
    setPopup({
      x: Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130),
      y: Math.max(rect.top - 10, 60),
      selected,
    })
  }

  /** Split text into highlight/non-highlight runs (earliest, longest match wins). */
  const runs = useMemo(() => {
    type Run = { text: string; hl?: { color: HighlightColor } }
    if (highlights.length === 0) return [{ text }] as Run[]
    const marks: { start: number; end: number; hl: (typeof highlights)[number] }[] = []
    for (const h of highlights) {
      let from = 0
      while (from <= text.length - h.text.length) {
        const idx = text.indexOf(h.text, from)
        if (idx < 0) break
        marks.push({ start: idx, end: idx + h.text.length, hl: h })
        from = idx + h.text.length
      }
    }
    if (marks.length === 0) return [{ text }] as Run[]
    marks.sort((a, b) => a.start - b.start || b.end - a.end)
    const out: Run[] = []
    let pos = 0
    let lastEnd = -1
    for (const m of marks) {
      if (m.start < pos || m.start < lastEnd) continue // overlaps an accepted mark
      if (m.start > pos) out.push({ text: text.slice(pos, m.start) })
      out.push({ text: text.slice(m.start, m.end), hl: m.hl })
      pos = m.end
      lastEnd = m.end
    }
    if (pos < text.length) out.push({ text: text.slice(pos) })
    return out
  }, [text, highlights])

  const applyColor = (color: HighlightColor) => {
    if (!popup) return
    add(sectionId, popup.selected, color)
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }

  const removeAtCursor = () => {
    if (!popup) return
    remove(sectionId, popup.selected.trim())
    window.getSelection()?.removeAllRanges()
    setPopup(null)
  }

  const existingColors = popup
    ? new Set(
        highlights
          .filter((h) => h.text === popup.selected.trim())
          .map((h) => h.color),
      )
    : new Set<HighlightColor>()

  return (
    <span ref={ref} onMouseUp={onMouseUp} className="hl-text">
      {runs.map((run, i) =>
        run.hl ? (
          <mark
            key={i}
            className={`hl-mark hl-${run.hl.color}`}
            title={lang === 'bm' ? 'Tanda buku teks — pilih untuk buang' : 'Text highlight — select to remove'}
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
      {popup && (
        <span
          className="hl-popup"
          style={{ left: popup.x, top: popup.y }}
          role="menu"
          onMouseDown={(e) => e.preventDefault()}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`hl-color-btn${existingColors.has(c.id) ? ' active' : ''}`}
              style={{ background: c.swatch }}
              title={lang === 'bm' ? c.bm : c.en}
              aria-label={lang === 'bm' ? c.bm : c.en}
              onClick={() => applyColor(c.id)}
            />
          ))}
          {existingColors.size > 0 && (
            <button
              type="button"
              className="hl-remove-btn"
              title={lang === 'bm' ? 'Buang tanda' : 'Remove highlight'}
              aria-label={lang === 'bm' ? 'Buang tanda' : 'Remove highlight'}
              onClick={removeAtCursor}
            >
              ✕
            </button>
          )}
        </span>
      )}
    </span>
  )
}
