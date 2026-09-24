import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bm'

export interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const Ctx = createContext<LangCtx>({ lang: 'bm', setLang: () => {} })

const STORAGE_KEY = 'free-zones-reg-lang'

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(window.location.search).get('lang')
    if (q === 'bm' || q === 'en') return q
  } catch {
    /* ignore */
  }
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'bm'
  } catch {
    return 'bm'
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

/** UI chrome strings (the Regulations text itself is BM-only). */
export const UI = {
  en: {
    brandTitle: 'Free Zones Regulations 1991',
    brandSub: 'P.U. (B) 455/1991 · under the Free Zones Act 1990 (Act 438)',
    portalBtn: 'All Readers',
    portalBtnTitle: 'Back to Customs Law Readers landing page',
    signOutBtn: 'Sign Out',
    officerBadgeLabel: 'JKDM Officer',
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
    printFooter:
      'Printed from DrFendi’s · afandi.amin@customs.gov.my · Digital Free Zones Regulations 1991',
    welcomeTitle: 'Free Zones Regulations 1991 (P.U. (B) 455/1991)',
    welcomeLead: (n: number) =>
      `Browse the Regulations by PART using the sidebar, or search across all ${n} regulations. The gazette text is Bahasa Melayu (January 2011 print); definitions, itemised lists and the three schedules are preserved from the source document.`,
    bookmarksTab: '★',
    tocTabTitle: 'Browse by PART',
    highlightsTab: '🖍',
    highlightsTitle: 'Highlights',
    highlightsEmpty:
      'No highlights yet — select any text in a section and pick a color to save it here.',
    highlightsClear: 'Clear all',
    highlightsRemove: 'Remove highlight',
    highlightsJump: 'Open this section',
    highlightsBadge: (n: number) => String(n),
    textSizeLabel: 'Text size',
    textSizeSmaller: 'Smaller text',
    textSizeLarger: 'Larger text',
    copyLinkTitle: 'Copy link to this regulation',
    shortcutHint: '← → regulations · / search · Esc clear',
    continueReading: 'Continue reading',
    recentStat: 'Recently viewed',
    scheduleBtn: 'Schedules',
    scheduleCrumb: 'SCHEDULES',
    scheduleTitle: 'Schedules',
    backToTop: 'Back to top',
    disclaimerTitle: 'Disclaimer',
    disclaimerP1:
      'This website is a convenient reference version only, and is not an official legal publication.',
    disclaimerP2:
      'The official and authoritative version of the Free Zones Regulations 1991 (P.U. (B) 455/1991) is published by the Attorney General’s Chambers of Malaysia.',
    disclaimerP3:
      'For all legal, official, or commercial purposes, please refer to the latest consolidated reprint from the Attorney General’s Chambers portal:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Bahasa Melayu text as at the January 2011 print',
    printDisclaimer: 'Unofficial reference — for legal purposes refer to https://lom.agc.gov.my',
    previewOpenTitle: 'Click to preview the full regulation',
    previewOpenFull: 'Open full regulation',
    previewClose: 'Close preview',
    prevSection: 'Previous regulation',
    nextSection: 'Next regulation',
    bookmarksTitle: 'Bookmarks',
    bookmarksEmpty:
      'No bookmarks yet — tap the ☆ on any regulation to save it here for quick access.',
    bookmarksClear: 'Clear all',
    bookmarksRemove: 'Remove bookmark',
    starAdd: 'Bookmark this regulation',
    starRemove: 'Remove bookmark',
    startBtn: 'Start at Regulation 1',
    jumpBtn: 'Jump to last regulation',
    partsStat: 'Parts',
    sectionsStat: 'Regulations',
    scheduleStat: 'Schedules',
    langBtnTitle: 'Tukar ke Bahasa Melayu',
    bmOnlyNote:
      'The text of these Regulations is published in Bahasa Melayu only. The interface language is English; the statutory text remains in Bahasa Melayu.',
  },
  bm: {
    brandTitle: 'Peraturan-Peraturan Zon Bebas 1991',
    brandSub: 'P.U. (B) 455/1991 · di bawah Akta Zon Bebas 1990 (Akta 438)',
    portalBtn: 'Semua Pembaca',
    portalBtnTitle: 'Kembali ke laman utama Pembaca Undang-Undang Kastam',
    signOutBtn: 'Log Keluar',
    officerBadgeLabel: 'Pegawai JKDM',
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
    printFooter:
      'Dicetak daripada DrFendi’s · afandi.amin@customs.gov.my · Digital Free Zones Regulations 1991',
    welcomeTitle: 'Peraturan-Peraturan Zon Bebas 1991 (P.U. (B) 455/1991)',
    welcomeLead: (n: number) =>
      `Layari Peraturan-Peraturan mengikut BAHAGIAN menggunakan bar sisi, atau cari merentasi semua ${n} peraturan. Takrif, senarai berbutir dan tiga Jadual dikekalkan daripada dokumen sumber (cetakan Januari 2011).`,
    bookmarksTab: '★',
    tocTabTitle: 'Layari mengikut BAHAGIAN',
    highlightsTab: '🖍',
    highlightsTitle: 'Tanda Teks',
    highlightsEmpty:
      'Belum ada tanda teks — pilih mana-mana teks dalam seksyen dan pilih warna untuk simpan di sini.',
    highlightsClear: 'Kosongkan',
    highlightsRemove: 'Buang tanda',
    highlightsJump: 'Buka seksyen ini',
    highlightsBadge: (n: number) => String(n),
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
    disclaimerP1:
      'Laman web ini adalah versi rujukan mudah sahaja, dan bukan penerbitan undang-undang rasmi.',
    disclaimerP2:
      'Versi rasmi dan sahih Peraturan-Peraturan Zon Bebas 1991 (P.U. (B) 455/1991) diterbitkan oleh Jabatan Peguam Negara Malaysia.',
    disclaimerP3:
      'Bagi semua tujuan undang-undang, rasmi atau komersial, sila rujuk cetakan semula konsolidasi terkini daripada portal Jabatan Peguam Negara:',
    disclaimerPortal: 'https://lom.agc.gov.my',
    disclaimerUpdated: 'Teks Bahasa Melayu pada cetakan Januari 2011',
    printDisclaimer: 'Rujukan tidak rasmi — bagi tujuan undang-undang rujuk https://lom.agc.gov.my',
    previewOpenTitle: 'Klik untuk pratonton peraturan penuh',
    previewOpenFull: 'Buka peraturan penuh',
    previewClose: 'Tutup pratonton',
    prevSection: 'Peraturan sebelum',
    nextSection: 'Peraturan berikut',
    bookmarksTitle: 'Tanda Buku',
    bookmarksEmpty:
      'Belum ada tanda buku — tekan ☆ pada mana-mana peraturan untuk simpan di sini.',
    bookmarksClear: 'Kosongkan',
    bookmarksRemove: 'Buang tanda buku',
    starAdd: 'Tanda peraturan ini',
    starRemove: 'Buang tanda buku',
    startBtn: 'Mula di Peraturan 1',
    jumpBtn: 'Lompat ke peraturan akhir',
    partsStat: 'Bahagian',
    sectionsStat: 'Peraturan',
    scheduleStat: 'Jadual',
    langBtnTitle: 'Switch to English',
    bmOnlyNote:
      'Teks Peraturan-Peraturan ini diterbitkan dalam Bahasa Melayu sahaja. Bahasa antara muka ialah Bahasa Melayu; teks perundangan kekal dalam Bahasa Melayu.',
  },
} as const

export type UiStrings = (typeof UI)['en']
