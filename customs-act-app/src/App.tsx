import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import act, { allSections, findSection, searchSections, bmSection, bmPartTitle } from './data'
import type { FlatSection } from './data'
import type { BmSection, Section } from './types'
import { SectionBody } from './components/SectionBody'
import { TextWithXrefs } from './components/TextWithXrefs'
import { LangProvider, useLang, UI, type Lang } from './i18n'
import { ThemeProvider, useTheme } from './theme'
import { useBookmarks, useTextSize, useTrackSection } from './hooks'

import { AuthProvider, AuthGate, useAuth } from './auth'

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <AuthGate>
            <Shell />
          </AuthGate>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  )
}

type SideMode = 'toc' | 'bookmarks'

/** The two kinds of view the reader can be on, each with a shareable URL. */
type View = { kind: 'section'; id: string } | { kind: 'schedule' }

const SCHEDULE_HASH = 'schedule'

function parseHash(): View | null {
  const h = window.location.hash.replace(/^#/, '')
  if (h === SCHEDULE_HASH) return { kind: 'schedule' }
  if (h && findSection(h)) return { kind: 'section', id: h }
  return null
}

function getLandingUrl(): string {
  if (typeof window === 'undefined') return '../'
  const isDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  if (isDev && (window.location.port === '5174' || window.location.port === '5175')) {
    return 'http://localhost:5173/'
  }
  return '../'
}

function Shell() {
  const { user, logout } = useAuth()
  const { lang, setLang } = useLang()
  const { theme, toggle } = useTheme()
  const t = UI[lang]

  const [view, setView] = useState<View | null>(parseHash)
  const [query, setQuery] = useState('')
  const [sideMode, setSideMode] = useState<SideMode>('toc')
  const searchRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchSections(query), [query])
  const bookmarks = useBookmarks()
  const textSize = useTextSize()

  const selectedId = view?.kind === 'section' ? view.id : null
  const selected = selectedId ? findSection(selectedId) : undefined
  const searching = query.trim().length >= 2

  // Recently-read list, most recent first.
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('customs-act-recent') ?? '[]'),
  )
  useTrackSection(selectedId, setRecentIds)

  const openSection = useCallback((id: string) => {
    // Hash drives selection, so back/forward and shared links work.
    if (window.location.hash.replace(/^#/, '') === id) {
      setView({ kind: 'section', id })
    } else {
      window.location.hash = id
    }
    window.scrollTo({ top: 0 })
  }, [])

  const openSchedule = useCallback(() => {
    if (window.location.hash.replace(/^#/, '') === SCHEDULE_HASH) {
      setView({ kind: 'schedule' })
    } else {
      window.location.hash = SCHEDULE_HASH
    }
    window.scrollTo({ top: 0 })
  }, [])

  // React to hash changes: initial deep link, sidebar clicks, browser nav.
  useEffect(() => {
    const onHash = () => {
      setView(parseHash())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const idx = selected ? allSections.findIndex((s) => s.id === selected.id) : -1
  const goPrev = useCallback(() => {
    if (idx > 0) openSection(allSections[idx - 1].id)
  }, [idx, openSection])
  const goNext = useCallback(() => {
    if (idx >= 0 && idx < allSections.length - 1) openSection(allSections[idx + 1].id)
  }, [idx, openSection])

  // Keyboard shortcuts: / focuses search, Esc clears, ← → page between sections.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      // The cross-reference preview modal handles ← → itself while open.
      const modalOpen = document.body.dataset.xrefModal === '1'

      if (e.key === '/' && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if (e.key === 'Escape') {
        if (typing) (target as HTMLInputElement).blur()
        setQuery('')
      } else if (!typing && !modalOpen && selected) {
        if (e.key === 'ArrowLeft') goPrev()
        else if (e.key === 'ArrowRight') goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, goPrev, goNext])

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-portal">
            <a href={getLandingUrl()} className="portal-link" title={t.portalBtnTitle}>
              <span className="portal-arrow" aria-hidden="true">←</span>
              <span>{t.portalBtn}</span>
            </a>
            {user && (
              <div className="officer-portal-badge">
                <span className="officer-email" title={user.email}>
                  {user.email}
                </span>
                <button
                  type="button"
                  className="logout-mini-btn"
                  onClick={logout}
                  title={t.signOutBtn}
                >
                  {t.signOutBtn}
                </button>
              </div>
            )}
          </div>
          <div className="brand-row">
            <h1>{t.brandTitle}</h1>
            <div className="brand-actions">
              <div className="size-controls" role="group" aria-label={t.textSizeLabel}>
                <button
                  className="size-btn"
                  onClick={() => textSize.step(-1)}
                  disabled={!textSize.canStep(-1)}
                  title={t.textSizeSmaller}
                  aria-label={t.textSizeSmaller}
                >
                  A−
                </button>
                <button
                  className="size-btn"
                  onClick={() => textSize.step(1)}
                  disabled={!textSize.canStep(1)}
                  title={t.textSizeLarger}
                  aria-label={t.textSizeLarger}
                >
                  A+
                </button>
              </div>
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
            ref={searchRef}
            type="search"
            placeholder={t.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="side-tabs" role="tablist">
          <button
            className={`side-tab${sideMode === 'toc' ? ' active' : ''}`}
            onClick={() => setSideMode('toc')}
            role="tab"
            aria-selected={sideMode === 'toc'}
            title={t.tocTabTitle}
          >
            {t.partWord}
          </button>
          <button
            className={`side-tab${sideMode === 'bookmarks' ? ' active' : ''}`}
            onClick={() => setSideMode('bookmarks')}
            role="tab"
            aria-selected={sideMode === 'bookmarks'}
            title={t.bookmarksTitle}
          >
            {t.bookmarksTab}
            {bookmarks.ids.length > 0 && <span className="badge">{bookmarks.ids.length}</span>}
          </button>
        </div>

        <nav className="toc">
          {searching ? (
            <SearchResults results={results} query={query} onOpen={openSection} />
          ) : sideMode === 'bookmarks' ? (
            <BookmarksList bookmarks={bookmarks} onOpen={openSection} />
          ) : (
            <>
              {act.parts.map((part) => (
                <PartGroup
                  key={part.id}
                  part={part}
                  selectedId={selectedId}
                  onOpen={openSection}
                />
              ))}
              <div className="toc-extra">
                <button className="schedule-link" onClick={openSchedule}>
                  <span className="sec-num">§</span>
                  <span>{t.scheduleTitle}</span>
                </button>
              </div>
            </>
          )}
        </nav>

        <div className="shortcut-hint">{t.shortcutHint}</div>
      </aside>

      <main className="content">
        {selected ? (
          <SectionView
            section={selected}
            onOpen={openSection}
            bookmarked={bookmarks.has(selected.id)}
            onToggleBookmark={() => bookmarks.toggle(selected.id)}
          />
        ) : view?.kind === 'schedule' ? (
          <ScheduleView />
        ) : (
          <Welcome onOpen={openSection} onOpenSchedule={openSchedule} recentIds={recentIds} />
        )}
      </main>
      <BackToTop />
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
  const containsSelected = selectedId != null && part.sections.some((s) => s.id === selectedId)
  // Auto-expand the PART holding the current section; still manually collapsible.
  const [openState, setOpen] = useState(false)
  const open = openState || containsSelected
  const listRef = useRef<HTMLUListElement>(null)

  // Scroll the auto-expanded group into view (not on first paint).
  const firstScroll = useRef(true)
  useEffect(() => {
    if (firstScroll.current) {
      firstScroll.current = false
      return
    }
    if (open && containsSelected && listRef.current) {
      listRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [open, containsSelected])

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
        <ul className="section-list" ref={listRef}>
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

function BookmarksList({
  bookmarks,
  onOpen,
}: {
  bookmarks: ReturnType<typeof useBookmarks>
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const sections = bookmarks.ids
    .map((id) => allSections.find((s) => s.id === id))
    .filter((s): s is FlatSection => Boolean(s))
  if (sections.length === 0) {
    return <p className="bookmarks-empty">{t.bookmarksEmpty}</p>
  }
  return (
    <>
      <div className="bookmarks-head">
        <p className="search-meta">{t.bookmarksTitle}</p>
        <button className="clear-btn" onClick={bookmarks.clear} title={t.bookmarksClear}>
          {t.bookmarksClear}
        </button>
      </div>
      <ul className="section-list">
        {sections.map((s) => {
          const loc = localized(s, lang)
          return (
            <li key={s.id}>
              <button className="sec-link" onClick={() => onOpen(s.id)}>
                <span className="sec-num">{s.number}</span>
                <span className="sec-heading">
                  {loc.heading}
                  <em className="sec-part"> — {t.partWord} {s.part.label}</em>
                </span>
                <span
                  className="star remove"
                  role="button"
                  tabIndex={0}
                  title={t.bookmarksRemove}
                  aria-label={t.bookmarksRemove}
                  onClick={(e) => {
                    e.stopPropagation()
                    bookmarks.toggle(s.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      bookmarks.toggle(s.id)
                    }
                  }}
                >
                  ★
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
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
  bookmarked,
  onToggleBookmark,
}: {
  section: FlatSection
  onOpen: (id: string) => void
  bookmarked: boolean
  onToggleBookmark: () => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const loc = localized(section, lang)
  const idx = allSections.findIndex((s) => s.id === section.id)
  const prev = idx > 0 ? allSections[idx - 1] : undefined
  const next = allSections[idx + 1]

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
  }, [])

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
        <div className="section-tools">
          <button
            className={`star-btn${bookmarked ? ' on' : ''}`}
            onClick={onToggleBookmark}
            title={bookmarked ? t.starRemove : t.starAdd}
            aria-label={bookmarked ? t.starRemove : t.starAdd}
            aria-pressed={bookmarked}
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <button className="print-btn" onClick={copyLink} title={t.copyLinkTitle} aria-label={t.copyLinkTitle}>
            🔗
          </button>
          <button
            className="print-btn"
            onClick={() => window.print()}
            title={t.printBtnTitle}
            aria-label={t.printBtnTitle}
          >
            🖨 {t.printBtn}
          </button>
        </div>
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

function ScheduleView() {
  const { lang } = useLang()
  const t = UI[lang]
  if (!act.schedule) return null
  return (
    <article className="section-view">
      <p className="crumb">{t.scheduleCrumb}</p>
      <div className="section-head">
        <div>
          <h2>{t.scheduleTitle}</h2>
          <h3 className="sec-title">{act.schedule.title}</h3>
        </div>
        <div className="section-tools">
          <button
            className="print-btn"
            onClick={() => window.print()}
            title={t.printBtnTitle}
            aria-label={t.printBtnTitle}
          >
            🖨 {t.printBtn}
          </button>
        </div>
      </div>
      <div className="section-body">
        {act.schedule.paragraphs.map((p, i) => (
          <p key={i} className="para">
            <TextWithXrefs text={p} />
          </p>
        ))}
        {act.note && (
          <div className="schedule-note">
            <h4>{act.note.title}</h4>
            {act.note.paragraphs.map((p, i) => {
              const cls = p.trim().startsWith('(') ? 'item' : 'para'
              return (
                <p key={i} className={cls}>
                  <TextWithXrefs text={p} />
                </p>
              )
            })}
          </div>
        )}
        <p className="print-footer">{t.printFooter}</p>
        <p className="print-footer">{t.printDisclaimer}</p>
      </div>
    </article>
  )
}

function Welcome({
  onOpen,
  onOpenSchedule,
  recentIds,
}: {
  onOpen: (id: string) => void
  onOpenSchedule: () => void
  recentIds: string[]
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const first = allSections[0]
  const last = allSections[allSections.length - 1]
  const recent = recentIds
    .map((id) => allSections.find((s) => s.id === id))
    .filter((s): s is FlatSection => Boolean(s))
    .slice(0, 5)
  const lastRead = recent[0]
  return (
    <div className="welcome">
      <h2>{t.welcomeTitle}</h2>
      <p className="lead">{t.welcomeLead(allSections.length)}</p>
      {lastRead && (
        <div className="resume-card">
          <span className="resume-label">{t.continueReading}</span>
          <button className="resume-btn" onClick={() => onOpen(lastRead.id)}>
            <span className="sec-num">{lastRead.number}</span>
            <span>{localized(lastRead, lang).heading}</span>
          </button>
        </div>
      )}
      <div className="welcome-actions">
        {lastRead ? (
          <button className="btn" onClick={() => onOpen(lastRead.id)}>
            {t.continueReading} →
          </button>
        ) : (
          <button className="btn" onClick={() => onOpen(first.id)}>
            {t.startBtn}
          </button>
        )}
        <button className="btn secondary" onClick={() => onOpen(last.id)}>
          {t.jumpBtn}
        </button>
        <button className="btn secondary" onClick={onOpenSchedule}>
          {t.scheduleBtn}
        </button>
      </div>
      {recent.length > 1 && (
        <div className="recent-list">
          <p className="crumb">{t.recentStat}</p>
          <ul className="section-list">
            {recent.slice(1).map((s) => (
              <li key={s.id}>
                <button className="sec-link" onClick={() => onOpen(s.id)}>
                  <span className="sec-num">{s.number}</span>
                  <span className="sec-heading">
                    {localized(s, lang).heading}
                    <em className="sec-part"> — {t.partWord} {s.part.label}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      <Disclaimer />
      <p className="translation-note">{t.translatedNote}</p>
    </div>
  )
}

function Disclaimer() {
  const { lang } = useLang()
  const t = UI[lang]
  return (
    <aside className="disclaimer">
      <h3>{t.disclaimerTitle}</h3>
      <p>{t.disclaimerP1}</p>
      <p>{t.disclaimerP2}</p>
      <p>
        {t.disclaimerP3}{' '}
        <a href={`https://${t.disclaimerPortal}`} target="_blank" rel="noopener noreferrer">
          🔗 {t.disclaimerPortal}
        </a>
      </p>
      <p className="disclaimer-updated">{t.disclaimerUpdated}</p>
    </aside>
  )
}

function BackToTop() {
  const { lang } = useLang()
  const t = UI[lang]
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      className="back-to-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title={t.backToTop}
      aria-label={t.backToTop}
    >
      ↑
    </button>
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
