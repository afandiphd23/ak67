import { useCallback, useEffect, useRef, useState } from 'react'

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode etc. */
  }
}

/* ------------------------------------------------------------ bookmarks */

const BOOKMARKS_KEY = 'free-zones-reg-bookmarks'

function initialBookmarks(): string[] {
  try {
    const raw = read(BOOKMARKS_KEY, '[]')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Regulation ids the reader has starred, in the order they were added. */
export function useBookmarks() {
  const [ids, setIds] = useState<string[]>(initialBookmarks)

  const persist = (next: string[]) => {
    setIds(next)
    write(BOOKMARKS_KEY, JSON.stringify(next))
  }

  const has = useCallback((id: string) => ids.includes(id), [ids])

  const toggle = useCallback(
    (id: string) => persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]),
    [ids],
  )

  const clear = useCallback(() => persist([]), [])

  return { ids, has, toggle, clear }
}

/* ------------------------------------------------------------ recent */

const RECENT_KEY = 'free-zones-reg-recent'
const RECENT_MAX = 8

function initialRecent(): string[] {
  try {
    const parsed: unknown = JSON.parse(read(RECENT_KEY, '[]'))
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Tracks the current regulation id into recent list; calls onChange with the fresh list. */
export function useTrackSection(id: string | null, onChange: (ids: string[]) => void) {
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!id || last.current === id) return
    last.current = id
    setIdsInStorage(id, onChange)
  }, [id, onChange])
}

function setIdsInStorage(id: string, onChange: (ids: string[]) => void) {
  const prev = initialRecent()
  const next = [id, ...prev.filter((x) => x !== id)].slice(0, RECENT_MAX)
  write(RECENT_KEY, JSON.stringify(next))
  onChange(next)
}

/* ------------------------------------------------------------ text size */

export type TextSize = 's' | 'm' | 'l' | 'xl'

const TEXT_SIZE_KEY = 'free-zones-reg-text-size'
const SIZES: TextSize[] = ['s', 'm', 'l', 'xl']
export const TEXT_SIZE_STEP_PX = 1.5

function initialTextSize(): TextSize {
  const saved = read(TEXT_SIZE_KEY, 'm')
  return SIZES.includes(saved as TextSize) ? (saved as TextSize) : 'm'
}

/** Reading font size for the regulation body, persisted like the theme. */
export function useTextSize() {
  const [size, setSizeState] = useState<TextSize>(initialTextSize)

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--text-scale',
      String(SIZES.indexOf(size) - SIZES.indexOf('m')),
    )
  }, [size])

  const setSize = useCallback((s: TextSize) => {
    setSizeState(s)
    write(TEXT_SIZE_KEY, s)
  }, [])

  const step = useCallback(
    (dir: 1 | -1) => {
      const i = Math.min(SIZES.length - 1, Math.max(0, SIZES.indexOf(size) + dir))
      setSize(SIZES[i])
    },
    [size, setSize],
  )

  return { size, setSize, step, canStep: (dir: 1 | -1) =>
    dir === 1 ? SIZES.indexOf(size) < SIZES.length - 1 : SIZES.indexOf(size) > 0 }
}
