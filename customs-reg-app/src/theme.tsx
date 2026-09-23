import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'sepia' | 'dark' | 'navy' | 'emerald'

export const THEMES: { id: Theme; nameEn: string; nameBm: string; icon: string }[] = [
  { id: 'light', nameEn: 'Light', nameBm: 'Cerah', icon: '☀️' },
  { id: 'sepia', nameEn: 'Sepia', nameBm: 'Sepia', icon: '📜' },
  { id: 'dark', nameEn: 'Dark', nameBm: 'Gelap', icon: '🌙' },
  { id: 'navy', nameEn: 'Midnight', nameBm: 'Malam', icon: '🌌' },
  { id: 'emerald', nameEn: 'Forest', nameBm: 'Hutan', icon: '🌿' },
]

export interface ThemeCtx {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
  currentThemeMeta: { id: Theme; nameEn: string; nameBm: string; icon: string }
}

const Ctx = createContext<ThemeCtx>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
  currentThemeMeta: THEMES[0],
})

const STORAGE_KEY = 'customs-reg-theme'
const VALID_THEMES: Theme[] = ['light', 'sepia', 'dark', 'navy', 'emerald']

function initialTheme(): Theme {
  try {
    const q = new URLSearchParams(window.location.search).get('theme') as Theme
    if (VALID_THEMES.includes(q)) return q
  } catch {}
  try {
    const saved = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem('customs-act-theme')) as Theme
    if (VALID_THEMES.includes(saved)) return saved
  } catch {}
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme)

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
      localStorage.setItem('customs-act-theme', t)
    } catch {}
  }

  const toggle = () => {
    const currentIndex = VALID_THEMES.indexOf(theme)
    const nextIndex = (currentIndex + 1) % VALID_THEMES.length
    setTheme(VALID_THEMES[nextIndex])
  }

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme === 'light' || theme === 'sepia' ? 'light' : 'dark'
  }, [theme])

  const currentThemeMeta = THEMES.find((t) => t.id === theme) || THEMES[0]

  return (
    <Ctx.Provider value={{ theme, setTheme, toggle, currentThemeMeta }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTheme(): ThemeCtx {
  return useContext(Ctx)
}
