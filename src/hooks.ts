import { useCallback, useEffect, useState } from 'react'

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

const BOOKMARKS_KEY = 'customs-act-bookmarks'

function initialBookmarks(): string[] {
  try {
    const raw = read(BOOKMARKS_KEY, '[]')
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Section ids the reader has starred, in the order they were added. */
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

/* ------------------------------------------------------------ text size */

export type TextSize = 's' | 'm' | 'l' | 'xl'

const TEXT_SIZE_KEY = 'customs-act-text-size'
const SIZES: TextSize[] = ['s', 'm', 'l', 'xl']
export const TEXT_SIZE_STEP_PX = 1.5

function initialTextSize(): TextSize {
  const saved = read(TEXT_SIZE_KEY, 'm')
  return SIZES.includes(saved as TextSize) ? (saved as TextSize) : 'm'
}

/** Reading font size for the section body, persisted like the theme. */
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
