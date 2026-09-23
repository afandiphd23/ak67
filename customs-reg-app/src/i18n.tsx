import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bm'

export interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {} })

const STORAGE_KEY = 'customs-reg-lang'

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

/** UI chrome strings (not the regulations' text itself). */
export const UI = {
  en: {
    brandTitle: 'Customs Regulations 2019',
    brandSub: 'P.U. (A) 397 · under the Customs Act 1967',
    creatorLabel: 'by Dr.Fendi Ameen',
    creatorEmail: 'afandi.amin@customs.gov.my',
    creatorTitle: 'Email the creator: afandi.amin@customs.gov.my',
    searchPlaceholder: 'Search regulations & text…',
    noSections: '(no regulations)',
    partWord: 'PART',
    resultsFor: (n: number, q: string) => `${n} result${n === 1 ? '' : 's'} for “${q}”`,
    secWord: 'Regulation',
    printBtn: 'Print',
    printBtnTitle: 'Print this regulation',
    printFooter: 'Printed from DrFendi\u2019s \u00b7 afandi.amin@customs.gov.my \u00b7 Digital Customs Regulations 2019',
    welcomeTitle: 'Customs Regulations 2019 (P.U. (A) 397)',
    welcomeLead: (n: number) =>
      `Browse the Regulations by PART using the sidebar, or search across all ${n} regulations. Definitions, itemised lists and the six schedules are preserved from the source document.`,
    bookmarksTab: '★',
    tocTabTitle: 'Browse by PART',
    textSizeLabel: 'Text size',
    textSizeSmaller: 'Smaller text',
    textSizeLarger: 'Larger text',
    copyLinkTitle: 'Copy link to this regulation',
    shortcutHint: '← → regulations · / search · Esc clear',
    continueReading: 'Continue reading',
    recentStat: 'Recently viewed',
    scheduleBtn: 'Schedules',
    scheduleCrumb: 'SCHEDULE',
    scheduleTitle: 'Schedules',
    backToTop: 'Back to top',
    disclaimerTitle: 'Disclaimer',
    disclaimerP1: 'This website is a convenient reference version only, and is not an official legal publication.',
    disclaimerP2:
      'The official and authoritative version of the Customs Regulations 2019 (P.U. (A) 397) is published by the Attorney General\u2019s Chambers of Malaysia.',
    disclaimerP3:
      'For all legal, official, or commercial purposes, please refer to the latest consolidated reprint from the Attorney General\u2019s Chambers portal:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Made: 31 December 2019 · in force 1 January 2020',
    printDisclaimer: 'Unofficial reference — for legal purposes refer to https://lom.agc.gov.my',
    previewOpenTitle: 'Click to preview the full regulation',
    previewOpenFull: 'Open full regulation',
    previewClose: 'Close preview',
    prevSection: 'Previous regulation',
    nextSection: 'Next regulation',
    bookmarksTitle: 'Bookmarks',
    bookmarksEmpty: 'No bookmarks yet — tap the ☆ on any regulation to save it here for quick access.',
    bookmarksClear: 'Clear all',
    bookmarksRemove: 'Remove bookmark',
    starAdd: 'Bookmark this regulation',
    starRemove: 'Remove bookmark',
    startBtn: 'Start at Regulation 1',
    jumpBtn: 'Jump to Last Regulation',
    schedulesStat: 'Schedules',
    partsStat: 'Parts',
    sectionsStat: 'Regulations',
    langBtnTitle: 'Tukar ke Bahasa Melayu',
    themeBtnTitleLight: 'Switch to dark theme',
    themeBtnTitleDark: 'Switch to light theme',
    translatedNote:
      'Bahasa Melayu text is reproduced from the official bilingual gazette (P.U. (A) 397). For legal purposes refer to the official text published by the Attorney General\u2019s Chambers.',
    scheduleRefLabel: 'Under',
    scheduleMissingNote: 'Listed in the Arrangement of Regulations but not reproduced in the gazette.',
  },
  bm: {
    brandTitle: 'Peraturan-Peraturan Kastam 2019',
    brandSub: 'P.U. (A) 397 · di bawah Akta Kastam 1967',
    creatorLabel: 'oleh Dr.Fendi Ameen',
    creatorEmail: 'afandi.amin@customs.gov.my',
    creatorTitle: 'E-mel pencipta: afandi.amin@customs.gov.my',
    searchPlaceholder: 'Cari peraturan & teks…',
    noSections: '(tiada peraturan)',
    partWord: 'BAHAGIAN',
    resultsFor: (n: number, q: string) => `${n} hasil untuk “${q}”`,
    secWord: 'Peraturan',
    printBtn: 'Cetak',
    printBtnTitle: 'Cetak peraturan ini',
    printFooter: 'Dicetak daripada DrFendi\u2019s \u00b7 afandi.amin@customs.gov.my \u00b7 Peraturan-Peraturan Kastam 2019 Digital',
    welcomeTitle: 'Peraturan-Peraturan Kastam 2019 (P.U. (A) 397)',
    welcomeLead: (n: number) =>
      `Layari Peraturan-Peraturan mengikut BAHAGIAN menggunakan bar sisi, atau cari merentasi semua ${n} peraturan. Takrif, senarai berbutir dan enam Jadual dikekalkan daripada dokumen sumber.`,
    bookmarksTab: '★',
    tocTabTitle: 'Layari mengikut BAHAGIAN',
    textSizeLabel: 'Saiz teks',
    textSizeSmaller: 'Teks lebih kecil',
    textSizeLarger: 'Teks lebih besar',
    copyLinkTitle: 'Salin pautan peraturan ini',
    shortcutHint: '← → peraturan · / carian · Esc kosongkan',
    continueReading: 'Sambung baca',
    recentStat: 'Dilihat baru-baru ini',
    scheduleBtn: 'Jadual',
    scheduleCrumb: 'JADUAL',
    scheduleTitle: 'Jadual-Jadual',
    backToTop: 'Kembali ke atas',
    disclaimerTitle: 'Penafian',
    disclaimerP1: 'Laman web ini adalah versi rujukan mudah sahaja, dan bukan penerbitan undang-undang rasmi.',
    disclaimerP2:
      'Versi rasmi dan sahih Peraturan-Peraturan Kastam 2019 (P.U. (A) 397) diterbitkan oleh Jabatan Peguam Negara Malaysia.',
    disclaimerP3:
      'Bagi semua tujuan undang-undang, rasmi atau komersial, sila rujuk cetakan semula konsolidasi terkini daripada portal Jabatan Peguam Negara:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Dibuat: 31 Disember 2019 · berkuat kuasa 1 Januari 2020',
    printDisclaimer: 'Rujukan tidak rasmi — bagi tujuan undang-undang rujuk https://lom.agc.gov.my',
    previewOpenTitle: 'Klik untuk pratonton peraturan penuh',
    previewOpenFull: 'Buka peraturan penuh',
    previewClose: 'Tutup pratonton',
    prevSection: 'Peraturan sebelum',
    nextSection: 'Peraturan berikut',
    bookmarksTitle: 'Tanda Buku',
    bookmarksEmpty: 'Belum ada tanda buku — tekan ☆ pada mana-mana peraturan untuk simpan di sini.',
    bookmarksClear: 'Kosongkan',
    bookmarksRemove: 'Buang tanda buku',
    starAdd: 'Tanda peraturan ini',
    starRemove: 'Buang tanda buku',
    startBtn: 'Mula di Peraturan 1',
    jumpBtn: 'Lompat ke Peraturan Terakhir',
    schedulesStat: 'Jadual',
    partsStat: 'Bahagian',
    sectionsStat: 'Peraturan',
    langBtnTitle: 'Switch to English',
    themeBtnTitleLight: 'Tukar ke tema gelap',
    themeBtnTitleDark: 'Tukar ke tema cerah',
    translatedNote:
      'Teks Bahasa Melayu disalin daripada Warta kerajaan dwibahasa rasmi (P.U. (A) 397). Bagi tujuan undang-undang, rujuk teks rasmi yang diterbitkan oleh Jabatan Peguam Negara.',
    scheduleRefLabel: 'Di bawah',
    scheduleMissingNote: 'Disenaraikan dalam Susunan Peraturan tetapi tidak diperuntukkan dalam warta.',
  },
} as const

export type UiStrings = (typeof UI)['en']
