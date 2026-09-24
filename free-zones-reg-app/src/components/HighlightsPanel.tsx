import { useHighlights } from '../highlights'
import { UI, useLang } from '../i18n'
import type { FlatRegulation } from '../data'

/**
 * Sidebar tab content: every saved highlight across the Act, grouped by
 * section, newest first. Click to jump; ✕ removes the highlight.
 */
export function HighlightsPanel({
  onOpen,
  findRegulation,
}: {
  onOpen: (id: string) => void
  findRegulation: (id: string) => FlatRegulation | undefined
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const { all, removeById, clearSection } = useHighlights()

  if (all.length === 0) {
    return <p className="bookmarks-empty">{t.highlightsEmpty}</p>
  }

  // Group by sectionId preserving section order of first appearance.
  const bySection = new Map<string, typeof all>()
  for (const h of all) {
    const list = bySection.get(h.sectionId) ?? []
    list.push(h)
    bySection.set(h.sectionId, list)
  }

  return (
    <>
      <div className="bookmarks-head">
        <p className="search-meta">
          {t.highlightsTitle} · {all.length}
        </p>
        <button
          className="clear-btn"
          onClick={() => bySection.forEach((_, sid) => clearSection(sid))}
          title={t.highlightsClear}
        >
          {t.highlightsClear}
        </button>
      </div>
      <ul className="section-list highlights-list">
        {[...bySection.entries()].map(([sectionId, items]) => {
          const sec = findRegulation(sectionId)
          return (
            <li key={sectionId} className="hl-group">
              <button className="sec-link hl-group-head" onClick={() => onOpen(sectionId)}>
                <span className="sec-num">{sec?.number ?? '§'}</span>
                <span className="sec-heading">{sec?.heading ?? sectionId}</span>
              </button>
              <ul className="hl-items">
                {items.map((h) => (
                  <li key={h.id} className="hl-item">
                    <mark className={`hl-mark hl-${h.color}`}>
                      <button
                        className="hl-item-btn"
                        onClick={() => onOpen(sectionId)}
                        title={t.highlightsJump}
                      >
                        {h.text.length > 120 ? `${h.text.slice(0, 120)}…` : h.text}
                      </button>
                    </mark>
                    <span
                      className="star remove"
                      role="button"
                      tabIndex={0}
                      title={t.highlightsRemove}
                      aria-label={t.highlightsRemove}
                      onClick={() => removeById(h.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          removeById(h.id)
                        }
                      }}
                    >
                      ✕
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          )
        })}
      </ul>
    </>
  )
}
