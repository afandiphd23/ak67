import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bm'

export interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {} })

const STORAGE_KEY = 'customs-act-lang'

function initialLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'bm' ? 'bm' : 'en'
  } catch {
    return 'en'
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = (l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* private mode etc. */
    }
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'bm' ? 'ms' : 'en'
  }, [lang])

  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>
}

export function useLang(): LangCtx {
  return useContext(Ctx)
}

/** UI chrome strings (not the Act's text itself). */
export const UI = {
  en: {
    brandTitle: 'Customs Act 1967',
    brandSub: 'Laws of Malaysia · Act 235',
    searchPlaceholder: 'Search sections & text…',
    noSections: '(no sections)',
    partWord: 'PART',
    resultsFor: (n: number, q: string) => `${n} result${n === 1 ? '' : 's'} for “${q}”`,
    secWord: 'Section',
    printBtn: 'Print',
    printBtnTitle: 'Print this section',
    printFooter: 'Printed from DrFendi\u2019s \u00b7 afandi.amin@customs.gov.my \u00b7 Digital Customs Act 1967',
    deletedOmitted: 'deleted / omitted',
    deletedNoForce: 'No longer in force.',
    deletedNote: (num: string, ann: string) =>
      `[Section ${num} — deleted / omitted. ${ann || 'No longer in force.'}]`,
    welcomeTitle: 'Customs Act 1967 (Act 235)',
    welcomeLead: (n: number) =>
      `Browse the Act by PART using the sidebar, or search across all ${n} sections. Definitions, itemised lists and amendment annotations are preserved from the source document.`,
    startBtn: 'Start at Section 1',
    jumpBtn: 'Jump to Repeal & Saving',
    partsStat: 'Parts',
    sectionsStat: 'Sections',
    scheduleStat: 'Schedule',
    langBtnTitle: 'Tukar ke Bahasa Melayu',
    themeBtnTitleLight: 'Tukar ke tema gelap',
    themeBtnTitleDark: 'Tukar ke tema cerah',
    translatedNote:
      'Bahasa Melayu text is a working translation of the English source. For legal purposes refer to the official text published by the Commissioner of Law Revision.',
  },
  bm: {
    brandTitle: 'Akta Kastam 1967',
    brandSub: 'Undang-Undang Malaysia · Akta 235',
    searchPlaceholder: 'Cari seksyen & teks…',
    noSections: '(tiada seksyen)',
    partWord: 'BAHAGIAN',
    resultsFor: (n: number, q: string) => `${n} hasil untuk “${q}”`,
    secWord: 'Seksyen',
    printBtn: 'Cetak',
    printBtnTitle: 'Cetak seksyen ini',
    printFooter: 'Dicetak daripada DrFendi\u2019s \u00b7 afandi.amin@customs.gov.my \u00b7 Digital Customs Act 1967',
    deletedOmitted: 'dimansuhkan / digugurkan',
    deletedNoForce: 'Tiada lagi berkuat kuasa.',
    deletedNote: (num: string, ann: string) =>
      `[Seksyen ${num} — dimansuhkan / digugurkan. ${ann || 'Tiada lagi berkuat kuasa.'}]`,
    welcomeTitle: 'Akta Kastam 1967 (Akta 235)',
    welcomeLead: (n: number) =>
      `Layari Akta mengikut BAHAGIAN menggunakan bar sisi, atau cari merentasi semua ${n} seksyen. Takrif, senarai berbutir dan anotasi pindaan dikekalkan daripada dokumen sumber.`,
    startBtn: 'Mula di Seksyen 1',
    jumpBtn: 'Lompat ke Pembatalan & Penjimatan',
    partsStat: 'Bahagian',
    sectionsStat: 'Seksyen',
    scheduleStat: 'Jadual',
    langBtnTitle: 'Switch to English',
    themeBtnTitleLight: 'Switch to dark theme',
    themeBtnTitleDark: 'Switch to light theme',
    translatedNote:
      'Teks Bahasa Melayu merupakan terjemahan kerja daripada sumber Bahasa Inggeris. Bagi tujuan undang-undang, rujuk teks rasmi yang diterbitkan oleh Pesuruhjaya Penyemak Undang-Undang.',
  },
} as const

export type UiStrings = (typeof UI)['en']
