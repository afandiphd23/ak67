import { useEffect, useRef, useState } from 'react'
import type { FlatRegulation } from './../data'
import { UI } from './../i18n'

interface SpotlightSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelectSection: (id: string) => void
  allSections: FlatRegulation[]
  lang: 'en' | 'bm'
}

export function SpotlightSearch({
  isOpen,
  onClose,
  onSelectSection,
  allSections,
  lang,
}: SpotlightSearchProps) {
  const t = UI[lang]
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const filtered = query.trim()
    ? allRegulationsFiltered(query, allSections).slice(0, 10)
    : allSections.slice(0, 8)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault()
        onSelectSection(filtered[selectedIndex].id)
        onClose()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, filtered, selectedIndex, onSelectSection, onClose])

  if (!isOpen) return null

  return (
    <div className="spotlight-overlay" onClick={onClose}>
      <div className="spotlight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="spotlight-head">
          <span className="spotlight-icon" aria-hidden="true">
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            className="spotlight-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              lang === 'bm'
                ? 'Cari peraturan, nombor, perkataan (cth: 21, manifes, duti)...'
                : 'Search regulation number, title, or keywords (e.g. 21, manifest, duty)...'
            }
          />
          <span className="spotlight-badge">ESC</span>
        </div>

        <div className="spotlight-results">
          {filtered.length === 0 ? (
            <div className="spotlight-empty">
              {lang === 'bm' ? 'Tiada peraturan dijumpai.' : 'No provisions matching your search.'}
            </div>
          ) : (
            filtered.map((sec, idx) => (
              <div
                key={sec.id}
                className={`spotlight-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => {
                  onSelectSection(sec.id)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="spotlight-item-sec">per. {sec.number}</span>
                <div className="spotlight-item-info">
                  <span className="spotlight-item-title">{sec.heading}</span>
                  {sec.part?.title && (
                    <span className="spotlight-item-part">
                      {t.partWord} {sec.part.label} — {sec.part.title}
                    </span>
                  )}
                </div>
                <span className="spotlight-item-arrow">↵</span>
              </div>
            ))
          )}
        </div>

        <div className="spotlight-foot">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> {lang === 'bm' ? 'Pilih' : 'Navigate'}
          </span>
          <span>
            <kbd>↵</kbd> {lang === 'bm' ? 'Buka' : 'Open'}
          </span>
          <span>
            <kbd>ESC</kbd> {lang === 'bm' ? 'Tutup' : 'Close'}
          </span>
        </div>
      </div>
    </div>
  )
}

function allRegulationsFiltered(query: string, sections: FlatRegulation[]): FlatRegulation[] {
  const q = query.toLowerCase().trim()
  return sections.filter(
    (s) =>
      s.id.toLowerCase().includes(q) ||
      s.number.toLowerCase() === q ||
      s.heading.toLowerCase().includes(q) ||
      (s.part?.title && s.part.title.toLowerCase().includes(q)),
  )
}
