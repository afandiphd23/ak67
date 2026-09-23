import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bm'

export interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {} })

const STORAGE_KEY = 'customs-act-lang'

function initialLang(): Lang {
  // URL param wins (?lang=bm|en) — handy for sharing language-specific links.
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q === 'bm' || q === 'en') return q
  } catch {
    /* ignore */
  }
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
    creatorLabel: 'by Dr.Fendi Ameen',
    creatorEmail: 'afandi.amin@customs.gov.my',
    creatorTitle: 'Email the creator: afandi.amin@customs.gov.my',
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
    bookmarksTab: '★',
    tocTabTitle: 'Browse by PART',
    textSizeLabel: 'Text size',
    textSizeSmaller: 'Smaller text',
    textSizeLarger: 'Larger text',
    copyLinkTitle: 'Copy link to this section',
    shortcutHint: '← → sections · / search · Esc clear',
    continueReading: 'Continue reading',
    recentStat: 'Recently viewed',
    scheduleBtn: 'Schedule',
    scheduleCrumb: 'SCHEDULE',
    scheduleTitle: 'The Schedule',
    noteCrumb: 'NOTE',
    backToTop: 'Back to top',
    disclaimerTitle: 'Disclaimer',
    disclaimerP1: 'This website is a convenient reference version only, and is not an official legal publication.',
    disclaimerP2:
      'The official and authoritative version of the Customs Act 1967 (Act 235) is published by the Attorney General\u2019s Chambers of Malaysia.',
    disclaimerP3:
      'For all legal, official, or commercial purposes, please refer to the latest consolidated reprint from the Attorney General\u2019s Chambers portal:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Last updated: 30 December 2023 (consolidated reprint reference)',
    printDisclaimer: 'Unofficial reference — for legal purposes refer to https://lom.agc.gov.my',
    previewOpenTitle: 'Click to preview the full section',
    previewOpenFull: 'Open full section',
    previewClose: 'Close preview',
    prevSection: 'Previous section',
    nextSection: 'Next section',
    bookmarksTitle: 'Bookmarks',
    bookmarksEmpty: 'No bookmarks yet — tap the ☆ on any section to save it here for quick access.',
    bookmarksClear: 'Clear all',
    bookmarksRemove: 'Remove bookmark',
    starAdd: 'Bookmark this section',
    starRemove: 'Remove bookmark',
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
    creatorLabel: 'oleh Dr.Fendi Ameen',
    creatorEmail: 'afandi.amin@customs.gov.my',
    creatorTitle: 'E-mel pencipta: afandi.amin@customs.gov.my',
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
    bookmarksTab: '★',
    tocTabTitle: 'Layari mengikut BAHAGIAN',
    textSizeLabel: 'Saiz teks',
    textSizeSmaller: 'Teks lebih kecil',
    textSizeLarger: 'Teks lebih besar',
    copyLinkTitle: 'Salin pautan seksyen ini',
    shortcutHint: '← → seksyen · / carian · Esc kosongkan',
    continueReading: 'Sambung baca',
    recentStat: 'Dilihat baru-baru ini',
    scheduleBtn: 'Jadual',
    scheduleCrumb: 'JADUAL',
    scheduleTitle: 'Jadual',
    noteCrumb: 'NOTA',
    backToTop: 'Kembali ke atas',
    disclaimerTitle: 'Penafian',
    disclaimerP1: 'Laman web ini adalah versi rujukan mudah sahaja, dan bukan penerbitan undang-undang rasmi.',
    disclaimerP2:
      'Versi rasmi dan sahih Akta Kastam 1967 (Akta 235) diterbitkan oleh Jabatan Peguam Negara Malaysia.',
    disclaimerP3:
      'Bagi semua tujuan undang-undang, rasmi atau komersial, sila rujuk cetakan semula konsolidasi terkini daripada portal Jabatan Peguam Negara:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Kemas kini terakhir: 30 Disember 2023 (rujukan cetakan semula konsolidasi)',
    printDisclaimer: 'Rujukan tidak rasmi — bagi tujuan undang-undang rujuk https://lom.agc.gov.my',
    previewOpenTitle: 'Klik untuk pratonton seksyen penuh',
    previewOpenFull: 'Buka seksyen penuh',
    previewClose: 'Tutup pratonton',
    prevSection: 'Seksyen sebelum',
    nextSection: 'Seksyen berikut',
    bookmarksTitle: 'Tanda Buku',
    bookmarksEmpty: 'Belum ada tanda buku — tekan ☆ pada mana-mana seksyen untuk simpan di sini.',
    bookmarksClear: 'Kosongkan',
    bookmarksRemove: 'Buang tanda buku',
    starAdd: 'Tanda seksyen ini',
    starRemove: 'Buang tanda buku',
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
