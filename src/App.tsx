import { useMemo, useState } from 'react'
import act, { allSections, findSection, searchSections, bmSection, bmPartTitle } from './data'
import type { FlatSection } from './data'
import type { BmSection, Section } from './types'
import { SectionBody } from './components/SectionBody'
import { LangProvider, useLang, UI, type Lang } from './i18n'
import { ThemeProvider, useTheme } from './theme'

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <Shell />
      </LangProvider>
    </ThemeProvider>
  )
}

function Shell() {
  const { lang, setLang } = useLang()
  const { theme, toggle } = useTheme()
  const t = UI[lang]
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchSections(query), [query])

  const openSection = (id: string) => {
    setSelectedId(id)
    window.scrollTo({ top: 0 })
  }

  const selected = selectedId ? findSection(selectedId) : undefined
  const searching = query.trim().length >= 2

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-row">
            <h1>{t.brandTitle}</h1>
            <div className="brand-actions">
              <button
                className="theme-toggle"
                onClick={toggle}
                title={theme === 'dark' ? t.themeBtnTitleDark : t.themeBtnTitleLight}
                aria-label={theme === 'dark' ? t.themeBtnTitleDark : t.themeBtnTitleLight}
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>
              <button
                className="lang-toggle"
                onClick={() => setLang(lang === 'en' ? 'bm' : 'en')}
                title={t.langBtnTitle}
                aria-label={t.langBtnTitle}
              >
                {lang === 'en' ? 'BM' : 'EN'}
              </button>
            </div>
          </div>
          <p>
            {t.brandSub} ·{' '}
            <a
              className="creator-link"
              href={`mailto:${t.creatorEmail}`}
              title={t.creatorTitle}
            >
              {t.creatorLabel}
            </a>
          </p>
        </div>

        <div className="search-box">
          <input
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <nav className="toc">
          {searching ? (
            <SearchResults results={results} query={query} onOpen={openSection} />
          ) : (
            act.parts.map((part) => (
              <PartGroup key={part.id} part={part} selectedId={selectedId} onOpen={openSection} />
            ))
          )}
        </nav>
      </aside>

      <main className="content">
        {selected ? (
          <SectionView section={selected} onOpen={openSection} />
        ) : (
          <Welcome onOpen={openSection} />
        )}
      </main>
    </div>
  )
}

/** PART title, localized and de-capsified for display. */
function partTitle(label: string, title: string, lang: Lang): string {
  if (lang === 'bm') {
    const bm = bmPartTitle(label)
    if (bm) return bm
  }
  return titleCase(title)
}

/** Section with Bahasa Melayu heading/content when available. */
function localized<T extends Section>(section: T, lang: Lang): T {
  if (lang !== 'bm') return section
  const bm: BmSection | undefined = bmSection(section.id)
  if (!bm) return section
  return { ...section, heading: bm.heading, content: bm.content }
}

function PartGroup({
  part,
  selectedId,
  onOpen,
}: {
  part: (typeof act.parts)[number]
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const [open, setOpen] = useState(false)
  const hasSections = part.sections.length > 0
  return (
    <div className="part-group">
      <button
        className="part-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="chev">{open ? '▾' : '▸'}</span>
        <span className="part-label">
          {t.partWord} {part.label}
        </span>
        {part.title && <span className="part-title"> — {partTitle(part.label, part.title, lang)}</span>}
        {!hasSections && <span className="count">{t.noSections}</span>}
      </button>
      {open && hasSections && (
        <ul className="section-list">
          {part.sections.map((s) => {
            const loc = localized(s, lang)
            return (
              <li key={s.id}>
                <button
                  className={`sec-link${selectedId === s.id ? ' active' : ''}${s.deleted ? ' deleted' : ''}`}
                  onClick={() => onOpen(s.id)}
                >
                  <span className="sec-num">{s.number}</span>
                  <span className="sec-heading">{loc.heading}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SearchResults({
  results,
  query,
  onOpen,
}: {
  results: FlatSection[]
  query: string
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  return (
    <>
      <p className="search-meta">{t.resultsFor(results.length, query)}</p>
      <ul className="section-list">
        {results.map((s) => {
          const loc = localized(s, lang)
          return (
            <li key={s.id}>
              <button className="sec-link" onClick={() => onOpen(s.id)}>
                <span className="sec-num">{s.number}</span>
                <span className="sec-heading">
                  {loc.heading}
                  <em className="sec-part"> — {t.partWord} {s.part.label}</em>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function SectionView({
  section,
  onOpen,
}: {
  section: FlatSection
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const loc = localized(section, lang)
  const idx = allSections.findIndex((s) => s.id === section.id)
  const prev = idx > 0 ? allSections[idx - 1] : undefined
  const next = allSections[idx + 1]
  return (
    <article className="section-view">
      <p className="crumb">
        {t.partWord} {section.part.label}
        {section.part.title ? ` — ${partTitle(section.part.label, section.part.title, lang)}` : ''}
      </p>
      <div className="section-head">
        <div>
          <h2>
            {t.secWord} {section.number}
          </h2>
          <h3 className="sec-title">{loc.heading}</h3>
        </div>
        <button
          className="print-btn"
          onClick={() => window.print()}
          title={t.printBtnTitle}
          aria-label={t.printBtnTitle}
        >
          🖨 {t.printBtn}
        </button>
      </div>
      <SectionBody section={loc} lang={lang} />
      <div className="pager">
        {prev ? (
          <button className="pager-btn" onClick={() => onOpen(prev.id)}>
            ← {prev.number}
          </button>
        ) : (
          <span />
        )}
        {next ? (
          <button className="pager-btn" onClick={() => onOpen(next.id)}>
            {next.number} →
          </button>
        ) : (
          <span />
        )}
      </div>
    </article>
  )
}

function Welcome({ onOpen }: { onOpen: (id: string) => void }) {
  const { lang } = useLang()
  const t = UI[lang]
  const first = allSections[0]
  const last = allSections[allSections.length - 1]
  return (
    <div className="welcome">
      <h2>{t.welcomeTitle}</h2>
      <p className="lead">{t.welcomeLead(allSections.length)}</p>
      <div className="welcome-actions">
        <button className="btn" onClick={() => onOpen(first.id)}>
          {t.startBtn}
        </button>
        <button className="btn secondary" onClick={() => onOpen(last.id)}>
          {t.jumpBtn}
        </button>
      </div>
      <div className="stats">
        <div>
          <strong>{act.parts.length}</strong> {t.partsStat}
        </div>
        <div>
          <strong>{allSections.length}</strong> {t.sectionsStat}
        </div>
        <div>
          <strong>1</strong> {t.scheduleStat}
        </div>
      </div>
      <p className="translation-note">{t.translatedNote}</p>
    </div>
  )
}

/** Undo ALL-CAPS part titles into readable case (English only). */
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bOf\b|\bThe\b|\bAnd\b/g, (m) => m.toLowerCase())
    .replace(/^./, (m) => m.toUpperCase())
}
