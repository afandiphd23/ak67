import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/* ------------------------------------------------------------------ types */

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink'

export interface Highlight {
  id: string
  /** Section id, e.g. "s-42A" / "r-21". */
  sectionId: string
  /** Exact text selected (dedupe key together with sectionId). */
  text: string
  color: HighlightColor
  createdAt: number
}

export interface HighlightCtx {
  /** Highlights for one section, keyed by exact text. */
  forSection: (sectionId: string) => Highlight[]
  add: (sectionId: string, text: string, color: HighlightColor) => void
  remove: (sectionId: string, text: string) => void
  removeById: (id: string) => void
  clearSection: (sectionId: string) => void
  all: Highlight[]
  countFor: (sectionId: string) => number
}

const Ctx = createContext<HighlightCtx>({
  forSection: () => [],
  add: () => {},
  remove: () => {},
  removeById: () => {},
  clearSection: () => {},
  all: [],
  countFor: () => 0,
})

/* -------------------------------------------------------------- storage */

export const HIGHLIGHT_COLORS: { id: HighlightColor; en: string; bm: string; swatch: string }[] = [
  { id: 'yellow', en: 'Yellow', bm: 'Kuning', swatch: '#f7d74a' },
  { id: 'green', en: 'Green', bm: 'Hijau', swatch: '#8fd694' },
  { id: 'blue', en: 'Blue', bm: 'Biru', swatch: '#8fbcd9' },
  { id: 'pink', en: 'Pink', bm: 'Merah jambu', swatch: '#e8a1b6' },
]

export function makeHighlightsHook(storageKey: string) {
  return function useHighlightsState(): HighlightCtx {
    const [all, setAll] = useState<Highlight[]>(() => {
      try {
        const raw = localStorage.getItem(storageKey)
        const parsed: unknown = raw ? JSON.parse(raw) : []
        if (!Array.isArray(parsed)) return []
        return parsed.filter(
          (h): h is Highlight =>
            !!h && typeof h === 'object' &&
            typeof (h as Highlight).sectionId === 'string' &&
            typeof (h as Highlight).text === 'string' &&
            typeof (h as Highlight).color === 'string',
        )
      } catch {
        return []
      }
    })

    useEffect(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(all))
      } catch {
        /* private mode etc. */
      }
    }, [all])

    // Cross-tab sync.
    useEffect(() => {
      const onStorage = (e: StorageEvent) => {
        if (e.key !== storageKey) return
        try {
          const raw = localStorage.getItem(storageKey)
          setAll(raw ? (JSON.parse(raw) as Highlight[]) : [])
        } catch {
          /* ignore */
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }, [])

    const add = useCallback((sectionId: string, text: string, color: HighlightColor) => {
      const clean = text.trim()
      if (!clean) return
      setAll((prev) => {
        const existing = prev.find((h) => h.sectionId === sectionId && h.text === clean)
        if (existing?.color === color) return prev
        const next = existing
          ? prev.map((h) => (h.id === existing.id ? { ...h, color } : h))
          : [
              {
                id: `hl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                sectionId,
                text: clean,
                color,
                createdAt: Date.now(),
              },
              ...prev,
            ]
        return next
      })
    }, [])

    const remove = useCallback((sectionId: string, text: string) => {
      setAll((prev) => prev.filter((h) => !(h.sectionId === sectionId && h.text === text)))
    }, [])

    const removeById = useCallback((id: string) => {
      setAll((prev) => prev.filter((h) => h.id !== id))
    }, [])

    const clearSection = useCallback((sectionId: string) => {
      setAll((prev) => prev.filter((h) => h.sectionId !== sectionId))
    }, [])

    const forSection = useCallback(
      (sectionId: string) => all.filter((h) => h.sectionId === sectionId),
      [all],
    )

    const countFor = useCallback(
      (sectionId: string) => all.reduce((n, h) => (h.sectionId === sectionId ? n + 1 : n), 0),
      [all],
    )

    return useMemo(
      () => ({ forSection, add, remove, removeById, clearSection, all, countFor }),
      [forSection, add, remove, removeById, clearSection, all, countFor],
    )
  }
}

export function HighlightProvider({
  value,
  children,
}: {
  value: HighlightCtx
  children: ReactNode
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useHighlights(): HighlightCtx {
  return useContext(Ctx)
}
