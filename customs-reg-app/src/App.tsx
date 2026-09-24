import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import reg, { allRegulations, findRegulation, searchRegulations, partTitle } from './data'
import type { Block, FlatRegulation, Regulation, Schedule } from './types'
import { SectionBody } from './components/SectionBody'
import { TextWithXrefs } from './components/TextWithXrefs'
import { LangProvider, useLang, UI, type Lang } from './i18n'
import { ThemeProvider, useTheme } from './theme'
import { useBookmarks, useTextSize, useTrackSection } from './hooks'

import {
  HighlightProvider,
  makeHighlightsHook,
  useHighlights,
} from './highlights'
import { HighlightsPanel } from './components/HighlightsPanel'
import { AuthProvider, AuthGate, useAuth } from './auth'
import { AudioPlayer } from './components/AudioPlayer'
import { SpotlightSearch } from './components/SpotlightSearch'
import { OfficerNotes } from './components/OfficerNotes'

const useHighlightsState = makeHighlightsHook('customs-reg-highlights')

function HighlightsRoot({ children }: { children: ReactNode }) {
  const value = useHighlightsState()
  return <HighlightProvider value={value}>{children}</HighlightProvider>
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <AuthGate>
            <HighlightsRoot>
              <Shell />
            </HighlightsRoot>
          </AuthGate>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  )
}

type SideMode = 'toc' | 'bookmarks' | 'highlights'

/** The two kinds of view the reader can be on, each with a shareable URL. */
type View = { kind: 'section'; id: string } | { kind: 'schedules' }

const SCHEDULES_HASH = 'schedules'

function parseHash(): View | null {
  const h = window.location.hash.replace(/^#/, '')
  if (h === SCHEDULES_HASH) return { kind: 'schedules' }
  if (h && findRegulation(h)) return { kind: 'section', id: h }
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

function getActUrl(): string {
  if (typeof window === 'undefined') return '../customs-act-app/'
  const isDev =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === '[::1]'
  if (isDev && window.location.port === '5175') {
    return 'http://localhost:5174/'
  }
  return '../customs-act-app/'
}

function extractSectionPlainText(sec: { content: Block[] }): string {
  const parts: string[] = []
  for (const b of sec.content) {
    if (b.kind === 'quote') {
      parts.push(`${b.term}: ${b.text}`)
      if (b.items) parts.push(...b.items)
    } else if (b.text) {
      parts.push(b.text)
    }
  }
  return parts.join('\n\n')
}

function ReadingProgressBar() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight
      if (total <= 0) {
        setProgress(0)
        return
      }
      setProgress(Math.min(100, Math.max(0, (window.scrollY / total) * 100)))
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
}

function Shell() {
  const { user, logout } = useAuth()
  const { lang, setLang } = useLang()
  const { toggle, currentThemeMeta } = useTheme()
  const t = UI[lang]

  const [view, setView] = useState<View | null>(parseHash)
  const [query, setQuery] = useState('')
  const [sideMode, setSideMode] = useState<SideMode>('toc')
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const results = useMemo(() => searchRegulations(query), [query])
  const bookmarks = useBookmarks()
  const highlights = useHighlights()
  const textSize = useTextSize()

  const selectedId = view?.kind === 'section' ? view.id : null
  const selected = selectedId ? findRegulation(selectedId) : undefined
  const searching = query.trim().length >= 2

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }, [])

  // Recently-read list, most recent first.
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem('customs-reg-recent') ?? '[]'),
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

  const openSchedules = useCallback(() => {
    if (window.location.hash.replace(/^#/, '') === SCHEDULES_HASH) {
      setView({ kind: 'schedules' })
    } else {
      window.location.hash = SCHEDULES_HASH
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

  const idx = selected ? allRegulations.findIndex((r) => r.id === selected.id) : -1
  const goPrev = useCallback(() => {
    if (idx > 0) openSection(allRegulations[idx - 1].id)
  }, [idx, openSection])
  const goNext = useCallback(() => {
    if (idx >= 0 && idx < allRegulations.length - 1) openSection(allRegulations[idx + 1].id)
  }, [idx, openSection])

  // Keyboard shortcuts: Ctrl+K spotlight, / focuses search, Esc clears, ← → page between regulations.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typing =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      // The cross-reference preview modal handles ← → itself while open.
      const modalOpen = document.body.dataset.xrefModal === '1'

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSpotlightOpen((prev) => !prev)
      } else if (e.key === '/' && !typing) {
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
      <ReadingProgressBar />
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-portal">
            <a href={getLandingUrl()} className="portal-link" title={t.portalBtnTitle}>
              <span className="portal-arrow" aria-hidden="true">←</span>
              <span>{t.portalBtn}</span>
            </a>
            <a
              href={getActUrl()}
              className="companion-link"
              title={lang === 'bm' ? 'Akta Kastam 1967 (Akta 235)' : 'Customs Act 1967 (Act 235)'}
            >
              <span>🏛️ {lang === 'bm' ? 'Akta 1967' : 'Act 1967'} →</span>
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
                title={`${lang === 'bm' ? 'Tukar tema' : 'Switch theme'} (${lang === 'bm' ? currentThemeMeta.nameBm : currentThemeMeta.nameEn})`}
                aria-label={`${lang === 'bm' ? 'Tukar tema' : 'Switch theme'} (${lang === 'bm' ? currentThemeMeta.nameBm : currentThemeMeta.nameEn})`}
              >
                {currentThemeMeta.icon}
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
          <button
            type="button"
            className="spotlight-quick-btn"
            onClick={() => setIsSpotlightOpen(true)}
            title={lang === 'bm' ? 'Carian pantas (Ctrl+K)' : 'Omnibox Spotlight search (Ctrl+K)'}
          >
            ⌘K
          </button>
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
          <button
            className={`side-tab${sideMode === 'highlights' ? ' active' : ''}`}
            onClick={() => setSideMode('highlights')}
            role="tab"
            aria-selected={sideMode === 'highlights'}
            title={t.highlightsTitle}
          >
            {t.highlightsTab}
            {highlights.all.length > 0 && (
              <span className="badge">{t.highlightsBadge(highlights.all.length)}</span>
            )}
          </button>
        </div>

        <nav className="toc">
          {searching ? (
            <SearchResults results={results} query={query} onOpen={openSection} />
          ) : sideMode === 'bookmarks' ? (
            <BookmarksList bookmarks={bookmarks} onOpen={openSection} />
          ) : sideMode === 'highlights' ? (
                    <HighlightsPanel onOpen={openSection} findRegulation={findRegulation} />
          ) : (
            <>
              {reg.parts.map((part) => (
                <PartGroup
                  key={part.id}
                  part={part}
                  selectedId={selectedId}
                  onOpen={openSection}
                />
              ))}
              <div className="toc-extra">
                <button className="schedule-link" onClick={openSchedules}>
                  <span className="sec-num">§</span>
                  <span>{t.scheduleTitle}</span>
                </button>
              </div>
            </>
          )}
        </nav>

        <div className="shortcut-hint">
          {t.shortcutHint} · <span className="kbd-shortcut">Ctrl+K / ⌘K</span> {lang === 'bm' ? 'Spotlight' : 'Spotlight'}
        </div>
      </aside>

      <main className="content">
        {selected ? (
          <RegulationView
            section={selected}
            onOpen={openSection}
            bookmarked={bookmarks.has(selected.id)}
            onToggleBookmark={() => bookmarks.toggle(selected.id)}
            onShowToast={showToast}
          />
        ) : view?.kind === 'schedules' ? (
          <SchedulesView />
        ) : (
          <Welcome onOpen={openSection} onOpenSchedules={openSchedules} recentIds={recentIds} />
        )}
      </main>
      <BackToTop />
      <SpotlightSearch
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onSelectSection={openSection}
        allRegulations={allRegulations}
        lang={lang}
      />
      {toastMessage && <div className="toast-popup">{toastMessage}</div>}
    </div>
  )
}

/** Localized view of a regulation: BM heading/content when available. */
function localized<T extends Regulation>(section: T, lang: Lang): T {
  if (lang !== 'bm') return section
  if (!section.bm) return section
  return { ...section, heading: section.bm.heading, content: section.bm.content }
}

function PartGroup({
  part,
  selectedId,
  onOpen,
}: {
  part: (typeof reg.parts)[number]
  selectedId: string | null
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const containsSelected = selectedId != null && part.sections.some((r) => r.id === selectedId)
  // Auto-expand the PART holding the current regulation; still manually collapsible.
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
        {part.title && <span className="part-title"> — {titleCase(partTitle(part, lang), lang)}</span>}
        {!hasSections && <span className="count">{t.noSections}</span>}
      </button>
      {open && hasSections && (
        <ul className="section-list" ref={listRef}>
          {part.sections.map((r) => {
            const loc = localized(r, lang)
            return (
              <li key={r.id}>
                <button
                  className={`sec-link${selectedId === r.id ? ' active' : ''}`}
                  onClick={() => onOpen(r.id)}
                >
                  <span className="sec-num">{r.number}</span>
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
    .map((id) => allRegulations.find((r) => r.id === id))
    .filter((r): r is FlatRegulation => Boolean(r))
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
        {sections.map((r) => {
          const loc = localized(r, lang)
          return (
            <li key={r.id}>
              <button className="sec-link" onClick={() => onOpen(r.id)}>
                <span className="sec-num">{r.number}</span>
                <span className="sec-heading">
                  {loc.heading}
                  <em className="sec-part"> — {t.partWord} {r.part.label}</em>
                </span>
                <span
                  className="star remove"
                  role="button"
                  tabIndex={0}
                  title={t.bookmarksRemove}
                  aria-label={t.bookmarksRemove}
                  onClick={(e) => {
                    e.stopPropagation()
                    bookmarks.toggle(r.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      e.stopPropagation()
                      bookmarks.toggle(r.id)
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
  results: FlatRegulation[]
  query: string
  onOpen: (id: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  return (
    <>
      <p className="search-meta">{t.resultsFor(results.length, query)}</p>
      <ul className="section-list">
        {results.map((r) => {
          const loc = localized(r, lang)
          return (
            <li key={r.id}>
              <button className="sec-link" onClick={() => onOpen(r.id)}>
                <span className="sec-num">{r.number}</span>
                <span className="sec-heading">
                  {loc.heading}
                  <em className="sec-part"> — {t.partWord} {r.part.label}</em>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function RegulationView({
  section,
  onOpen,
  bookmarked,
  onToggleBookmark,
  onShowToast,
}: {
  section: FlatRegulation
  onOpen: (id: string) => void
  bookmarked: boolean
  onToggleBookmark: () => void
  onShowToast: (msg: string) => void
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const loc = localized(section, lang)
  const idx = allRegulations.findIndex((r) => r.id === section.id)
  const prev = idx > 0 ? allRegulations[idx - 1] : undefined
  const next = allRegulations[idx + 1]

  const plainText = useMemo(() => extractSectionPlainText(loc), [loc])
  const wordCount = useMemo(() => plainText.trim().split(/\s+/).filter(Boolean).length, [plainText])
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 180))

  const copyLink = useCallback(() => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    onShowToast(lang === 'bm' ? 'Pautan disalin!' : 'Link copied to clipboard!')
  }, [onShowToast, lang])

  const copyCitation = useCallback(() => {
    const citation = `Customs Regulations 2019 [P.U. (A) 397/2019], r. ${section.number} — ${loc.heading}`
    navigator.clipboard?.writeText(citation).catch(() => {})
    onShowToast(lang === 'bm' ? 'Petikan peraturan disalin!' : 'Legal citation copied!')
  }, [section.number, loc.heading, onShowToast, lang])

  return (
    <article className="section-view">
      <div className="section-meta-row">
        <p className="crumb">
          {t.partWord} {section.part.label}
          {section.part.title ? ` — ${titleCase(partTitle(section.part, lang), lang)}` : ''}
        </p>
        <span className="reading-stat-badge">
          ⏱️ ~{readingMinutes} {lang === 'bm' ? 'min bacaan' : 'min read'} · 📄 {wordCount} {lang === 'bm' ? 'patah perkataan' : 'words'}
        </span>
      </div>

      <div className="section-head">
        <div>
          <h2>
            {t.secWord} {section.number}
          </h2>
          <h3 className="sec-title">{loc.heading}</h3>
        </div>
        <div className="section-tools">
          <AudioPlayer
            title={`${t.secWord} ${section.number}: ${loc.heading}`}
            text={plainText}
            lang={lang}
          />
          <button
            className="tool-btn"
            onClick={copyCitation}
            title={lang === 'bm' ? 'Salin petikan peraturan' : 'Copy legal citation'}
          >
            📋 {lang === 'bm' ? 'Petikan' : 'Cite'}
          </button>
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

      <OfficerNotes sectionId={section.id} lang={lang} />

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

function SchedulesView() {
  const { lang } = useLang()
  const t = UI[lang]
  return (
    <article className="section-view">
      <p className="crumb">{t.scheduleCrumb}</p>
      <div className="section-head">
        <div>
          <h2>{t.scheduleTitle}</h2>
          <h3 className="sec-title">{reg.meta.title}</h3>
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
        {reg.schedules.map((s) => (
          <ScheduleBlock key={s.id} schedule={s} lang={lang} />
        ))}
        <p className="made-note">{lang === 'bm' ? reg.madeNote.bm : reg.madeNote.en}</p>
        <p className="print-footer">{t.printFooter}</p>
        <p className="print-footer">{t.printDisclaimer}</p>
      </div>
    </article>
  )
}

function ScheduleBlock({ schedule: s, lang }: { schedule: Schedule; lang: Lang }) {
  const t = UI[lang]
  const entry = lang === 'bm' ? s.bm : null
  const label = entry?.label ?? s.label
  const regRef = entry?.regRef ?? s.regRef
  const title = entry?.title ?? s.title
  const blocks = entry?.blocks ?? s.blocks
  return (
    <section className="schedule-block">
      <h3 className="schedule-heading">
        {t.partWord === 'BAHAGIAN' ? 'JADUAL' : 'SCHEDULE'} {label.toUpperCase()}
        {regRef && <span className="schedule-ref"> {regRef}</span>}
      </h3>
      {title && <p className="schedule-title">{title}</p>}
      {s.missing && <p className="schedule-missing">{t.scheduleMissingNote}</p>}
      {blocks.map((b, i) => (
        <p key={i} className={b.kind === 'item' ? 'item' : 'para'}>
          <TextWithXrefs text={b.text} />
          {b.annotation && <span className="annotation">{b.annotation}</span>}
        </p>
      ))}
    </section>
  )
}

function Welcome({
  onOpen,
  onOpenSchedules,
  recentIds,
}: {
  onOpen: (id: string) => void
  onOpenSchedules: () => void
  recentIds: string[]
}) {
  const { lang } = useLang()
  const t = UI[lang]
  const first = allRegulations[0]
  const last = allRegulations[allRegulations.length - 1]
  const recent = recentIds
    .map((id) => allRegulations.find((r) => r.id === id))
    .filter((r): r is FlatRegulation => Boolean(r))
    .slice(0, 5)
  const lastRead = recent[0]
  return (
    <div className="welcome">
      <h2>{t.welcomeTitle}</h2>
      <p className="lead">{t.welcomeLead(allRegulations.length)}</p>
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
        <button className="btn secondary" onClick={onOpenSchedules}>
          {t.scheduleBtn}
        </button>
      </div>
      {recent.length > 1 && (
        <div className="recent-list">
          <p className="crumb">{t.recentStat}</p>
          <ul className="section-list">
            {recent.slice(1).map((r) => (
              <li key={r.id}>
                <button className="sec-link" onClick={() => onOpen(r.id)}>
                  <span className="sec-num">{r.number}</span>
                  <span className="sec-heading">
                    {localized(r, lang).heading}
                    <em className="sec-part"> — {t.partWord} {r.part.label}</em>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="stats">
        <div>
          <strong>{reg.parts.length}</strong> {t.partsStat}
        </div>
        <div>
          <strong>{allRegulations.length}</strong> {t.sectionsStat}
        </div>
        <div>
          <strong>{reg.schedules.length}</strong> {t.schedulesStat}
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
function titleCase(s: string, lang: Lang): string {
  if (lang === 'bm') return s
  return s
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .replace(/\bOf\b|\bThe\b|\bAnd\b|\bOr\b/g, (m) => m.toLowerCase())
    .replace(/^./, (m) => m.toUpperCase())
}
