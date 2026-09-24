import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bm'

export interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'en', setLang: () => {} })

const STORAGE_KEY = 'free-zones-lang'

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
    brandTitle: 'Free Zones Act 1990',
    brandSub: 'Laws of Malaysia · Act 438',
    portalBtn: 'All Readers',
    portalBtnTitle: 'Back to Customs Law Readers landing page',
    signOutBtn: 'Sign Out',
    officerBadgeLabel: 'JKDM Officer',
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
    printFooter:
      'Printed from DrFendi’s · afandi.amin@customs.gov.my · Digital Free Zones Act 1990',
    deletedOmitted: 'deleted',
    deletedNoForce: 'No longer in force.',
    welcomeTitle: 'Free Zones Act 1990 (Act 438)',
    welcomeLead: (n: number) =>
      `Browse the Act by PART using the sidebar, or search across all ${n} sections. Free commercial and industrial zones, schedules of declared zones and amendment annotations are preserved from the source documents.`,
    bookmarksTab: '★',
    tocTabTitle: 'Browse by PART',
    textSizeLabel: 'Text size',
    textSizeSmaller: 'Smaller text',
    textSizeLarger: 'Larger text',
    copyLinkTitle: 'Copy link to this section',
    shortcutHint: '← → sections · / search · Esc clear',
    continueReading: 'Continue reading',
    recentStat: 'Recently viewed',
    scheduleBtn: 'Schedules',
    scheduleCrumb: 'SCHEDULES',
    scheduleTitle: 'Schedules & Amendment Lists',
    backToTop: 'Back to top',
    disclaimerTitle: 'Disclaimer',
    disclaimerP1:
      'This website is a convenient reference version only, and is not an official legal publication.',
    disclaimerP2:
      'The official and authoritative version of the Free Zones Act 1990 (Act 438) is published by the Attorney General’s Chambers of Malaysia.',
    disclaimerP3:
      'For all legal, official, or commercial purposes, please refer to the latest consolidated reprint from the Attorney General’s Chambers portal:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated:
      'English text as at 15 December 2025 · Bahasa Melayu reprint as at 1 May 2013',
    printDisclaimer: 'Unofficial reference — for legal purposes refer to https://lom.agc.gov.my',
    previewOpenTitle: 'Click to preview the full section',
    previewOpenFull: 'Open full section',
    previewClose: 'Close preview',
    prevSection: 'Previous section',
    nextSection: 'Next section',
    bookmarksTitle: 'Bookmarks',
    bookmarksEmpty:
      'No bookmarks yet — tap the ☆ on any section to save it here for quick access.',
    bookmarksClear: 'Clear all',
    bookmarksRemove: 'Remove bookmark',
    starAdd: 'Bookmark this section',
    starRemove: 'Remove bookmark',
    startBtn: 'Start at Section 1',
    jumpBtn: 'Jump to last section',
    partsStat: 'Parts',
    sectionsStat: 'Sections',
    scheduleStat: 'Schedules',
    langBtnTitle: 'Tukar ke Bahasa Melayu',
    translatedNote:
      'Bahasa Melayu text is the official 2013 reprint. Sections amended after 2013 (8A, 8B, 10A, 17A, 17B, 20A, 30B, 41A, 48A, 48B) are shown in English until an official BM text is available.',
  },
  bm: {
    brandTitle: 'Akta Zon Bebas 1990',
    brandSub: 'Undang-Undang Malaysia · Akta 438',
    portalBtn: 'Semua Pembaca',
    portalBtnTitle: 'Kembali ke laman utama Pembaca Undang-Undang Kastam',
    signOutBtn: 'Log Keluar',
    officerBadgeLabel: 'Pegawai JKDM',
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
    printFooter:
      'Dicetak daripada DrFendi’s · afandi.amin@customs.gov.my · Digital Free Zones Act 1990',
    deletedOmitted: 'dipotong',
    deletedNoForce: 'Tiada lagi berkuat kuasa.',
    welcomeTitle: 'Akta Zon Bebas 1990 (Akta 438)',
    welcomeLead: (n: number) =>
      `Layari Akta mengikut BAHAGIAN menggunakan bar sisi, atau cari merentasi semua ${n} seksyen. Zon perdagangan bebas dan zon perindustrian bebas, jadual zon yang diisytiharkan serta anotasi pindaan dikekalkan daripada dokumen sumber.`,
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
    scheduleTitle: 'Jadual & Senarai Pindaan',
    backToTop: 'Kembali ke atas',
    disclaimerTitle: 'Penafian',
    disclaimerP1:
      'Laman web ini adalah versi rujukan mudah sahaja, dan bukan penerbitan undang-undang rasmi.',
    disclaimerP2:
      'Versi rasmi dan sahih Akta Zon Bebas 1990 (Akta 438) diterbitkan oleh Jabatan Peguam Negara Malaysia.',
    disclaimerP3:
      'Bagi semua tujuan undang-undang, rasmi atau komersial, sila rujuk cetakan semula konsolidasi terkini daripada portal Jabatan Peguam Negara:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated:
      'Teks Bahasa Inggeris pada 15 Disember 2025 · Cetakan semula Bahasa Melayu pada 1 Mei 2013',
    printDisclaimer: 'Rujukan tidak rasmi — bagi tujuan undang-undang rujuk https://lom.agc.gov.my',
    previewOpenTitle: 'Klik untuk pratonton seksyen penuh',
    previewOpenFull: 'Buka seksyen penuh',
    previewClose: 'Tutup pratonton',
    prevSection: 'Seksyen sebelum',
    nextSection: 'Seksyen berikut',
    bookmarksTitle: 'Tanda Buku',
    bookmarksEmpty:
      'Belum ada tanda buku — tekan ☆ pada mana-mana seksyen untuk simpan di sini.',
    bookmarksClear: 'Kosongkan',
    bookmarksRemove: 'Buang tanda buku',
    starAdd: 'Tanda seksyen ini',
    starRemove: 'Buang tanda buku',
    startBtn: 'Mula di Seksyen 1',
    jumpBtn: 'Lompat ke seksyen akhir',
    partsStat: 'Bahagian',
    sectionsStat: 'Seksyen',
    scheduleStat: 'Jadual',
    langBtnTitle: 'Switch to English',
    translatedNote:
      'Teks Bahasa Melayu ialah cetakan semula rasmi 2013. Seksyen yang dipinda selepas 2013 (8A, 8B, 10A, 17A, 17B, 20A, 30B, 41A, 48A, 48B) dipaparkan dalam Bahasa Inggeris sehingga teks BM rasmi tersedia.',
  },
} as const

export type UiStrings = (typeof UI)['en']
