import { useEffect, useRef, useState } from 'react'
import type { FlatRegulation } from '../types'

interface SpotlightSearchProps {
  isOpen: boolean
  onClose: () => void
  onSelectSection: (id: string) => void
  allRegulations: FlatRegulation[]
  lang: 'en' | 'bm'
}

export function SpotlightSearch({
  isOpen,
  onClose,
  onSelectSection,
  allRegulations,
  lang,
}: SpotlightSearchProps) {
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
    ? allRegulations
        .filter((r) => {
          const q = query.toLowerCase().trim()
          return (
            r.id.toLowerCase().includes(q) ||
            r.number.toLowerCase() === q ||
            r.heading.toLowerCase().includes(q) ||
            (r.bm && r.bm.heading.toLowerCase().includes(q)) ||
            (r.part?.title && r.part.title.toLowerCase().includes(q)) ||
            (r.part?.bmTitle && r.part.bmTitle.toLowerCase().includes(q))
          )
        })
        .slice(0, 10)
    : allRegulations.slice(0, 8)

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
                ? 'Cari peraturan, nombor, perkataan (cth: 12, gudang, borang)...'
                : 'Search regulation number, title, or keywords (e.g. 12, warehouse, form)...'
            }
          />
          <span className="spotlight-badge">ESC</span>
        </div>

        <div className="spotlight-results">
          {filtered.length === 0 ? (
            <div className="spotlight-empty">
              {lang === 'bm'
                ? 'Tiada peraturan dijumpai.'
                : 'No regulations matching your search.'}
            </div>
          ) : (
            filtered.map((reg, idx) => {
              const heading = lang === 'bm' && reg.bm?.heading ? reg.bm.heading : reg.heading
              return (
                <div
                  key={reg.id}
                  className={`spotlight-item ${idx === selectedIndex ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectSection(reg.id)
                    onClose()
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="spotlight-item-sec">r. {reg.number}</span>
                  <div className="spotlight-item-info">
                    <span className="spotlight-item-title">{heading}</span>
                    {reg.part?.title && (
                      <span className="spotlight-item-part">
                        {lang === 'bm' && reg.part.bmTitle
                          ? `BAHAGIAN ${reg.part.label} — ${reg.part.bmTitle}`
                          : `PART ${reg.part.label} — ${reg.part.title}`}
                      </span>
                    )}
                  </div>
                  <span className="spotlight-item-arrow">↵</span>
                </div>
              )
            })
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
