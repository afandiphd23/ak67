# Akta Zon Bebas 1990 — Digital Free Zones Act 1990 (Act 438)

A bilingual (English / Bahasa Melayu) reader for Malaysia's **Free Zones Act 1990 (Act 438)** — free commercial zones, free industrial zones, permitted activities, enforcement powers, and the schedules of every gazetted zone.

By **Dr.Fendi Ameen** · [afandi.amin@customs.gov.my](mailto:afandi.amin@customs.gov.my)

Part of the **Customs Law Readers** suite alongside the Customs Act 1967 and Customs Regulations 2019 readers.

## Language model

Unlike the other two readers (English primary + BM working translation), this Act is presented the other way around:

| File | Role |
|---|---|
| `src/data/free-zones.json` | **English primary** — updated text as at **15 December 2025** (newest available), parsed from `../azbe.md` by `scripts/generate-data.mjs` |
| per-section `bm` overlay | **Official Bahasa Melayu** reprint as at **1 May 2013**, parsed from `../azb.md` |

Sections inserted after the 2013 BM reprint — **8A, 8B, 10A, 17A, 17B, 20A, 30B, 41A, 48A, 48B** — have `bm: null` and fall back to English with an explanatory note, until an official BM text is available.

## Features

Same full feature set as the other readers in the suite:

- Browse by PART (BAHAGIAN I–VI) with localized titles
- Full-text search in both languages (numbers, headings, body)
- Shareable deep links (`#s-42A`, `#schedules`) with browser back/forward
- Bookmarks, recently-viewed / resume reading
- Cross-reference links with hover preview + full-section modal
- Spotlight search (Ctrl+K / ⌘K)
- Text-to-speech, adjustable text size, officer notes (localStorage)
- Light / sepia / dark / midnight / forest themes (shared suite-wide)
- Google sign-in gate restricted to `@customs.gov.my` (shared suite-wide session)
- Print support with clean print stylesheet
- 3 Schedules (First: free commercial zones, Second: free industrial zones, Third: amendments & repeal) + List of Amendments + List of Sections Amended
- Zero backend — static SPA, all data embedded JSON

## Tech stack

React 19 · TypeScript · Vite 6 · plain CSS (no UI framework)

## Getting started

```bash
npm install
npm run dev        # dev server (http://localhost:5176)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
```

## Data pipeline

```bash
npm run gen:data   # regenerate free-zones.json from ../azbe.md + ../azb.md
```

The parser reads both markdown sources from the repo root, converts the markdown tables in the schedules into readable paragraphs, and matches BM sections to their EN counterparts by section number.

## Deployment

### Render (auto-deploy from GitHub)

Included in the suite's single static site — see the root `render.yaml`. The suite build (`npm run build` at the repo root) assembles `site/` with all three readers.

### cPanel (static upload)

```bash
npm run deploy     # builds, then zips dist/ → free-zones-dist.zip
```

Upload and extract into `public_html/free-zones-app/` (or any subfolder) — relative asset paths make it location-independent.

## Translation disclaimer

The English text is the Attorney General's Chambers updated text (15 December 2025) and is **NOT AN AUTHENTIC TEXT** until reprinted. The Bahasa Melayu text is the official 2013 reprint. For legal purposes, always refer to the latest consolidated text at [lom.agc.gov.my](https://lom.agc.gov.my).
