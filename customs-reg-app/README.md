# Peraturan-Peraturan Kastam 2019 — Digital Customs Regulations 2019 (P.U. (A) 397)

A bilingual (English / Bahasa Melayu) reader for Malaysia's **Customs Regulations 2019 (P.U. (A) 397)**, made under section 142 of the Customs Act 1967 (Act 235) — all **60 regulations** across **14 parts**, plus the **six schedules**.

By **Dr.Fendi Ameen** · [afandi.amin@customs.gov.my](mailto:afandi.amin@customs.gov.my)

Companion app to the [Digital Customs Act 1967](../customs-act-app) (Act 235), sharing the same reader architecture and design.

## Screenshots

See the Customs Act app screenshots for the shared design language (light/dark themes).

## Features

- **Full text, both languages, from the official gazette** — the gazette PDF is bilingual: Bahasa Melayu first, then English. Both are extracted directly, so the BM text is the *official* text, not a translation.
- **Browse by PART** — collapsible sidebar groups all parts (PART I–XIV / BAHAGIAN I–XIV) with localized part titles.
- **Full-text search** — case-insensitive search across regulation numbers, headings, and body text **in both languages**, with instant results.
- **Shareable links** — every regulation has its own URL (`#r-23`); the schedules live at `#schedules`; browser back/forward works.
- **Bookmarks** — star any regulation (☆ → ★); persisted in `localStorage`.
- **Keyboard shortcuts** — `←`/`→` to page between regulations, `/` to focus search, `Esc` to clear.
- **Adjustable text size** — A− / A+ controls; persists like the theme.
- **Recently viewed / resume reading** — *Continue reading* card plus the most recent regulations on the welcome screen.
- **All six schedules** — browsable and shareable in one view, with the regulation each schedule is made under (`(Regulation 3)` / `(Peraturan 3)`). The Sixth Schedule is listed in the Arrangement of Regulations but not reproduced in the gazette, so it appears with a clearly-marked placeholder note.
- **Cross-reference links** — citations like "regulation 23" / "Peraturan 58" link to their regulation (hover shows a preview; click opens a browseable overlay). Citations like "First Schedule" / "Jadual Ketiga" link to the schedules view. Citations to other laws are left as plain text.
- **Light / dark theme** — respects OS preference on first visit; no flash on load.
- **Print support** — per-regulation print button with a clean print stylesheet and a footer crediting the source.
- **Disclaimer** — a prominent notice on the home page (and in every printout) clarifying this is an unofficial convenience reference and pointing to the authoritative text at [lom.agc.gov.my](https://lom.agc.gov.my).
- **Zero backend** — static SPA; all data is embedded JSON.

## Tech stack

React 19 · TypeScript · Vite 6 · plain CSS (no UI framework)

## Getting started

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally
```

## Data pipeline

```bash
npm run gen:data   # regenerate src/data/customs-reg.json from ../../reg_raw.txt
```

The single parser (`scripts/generate-data.mjs`) reads the extracted gazette text at the repository root (`reg_raw.txt`, produced from `reg.pdf`) and emits one JSON tree with:

| Key | Purpose |
|---|---|
| `parts` | 14 parts × 60 regulations; each block has an English form plus a parallel `bm` object |
| `schedules` | Six schedules (EN + BM blocks, regulation references, titles) |
| `preamble` | The "the Minister makes the following regulations:" enacting formula in both languages |
| `madeNote` | The "Made 31 December 2019 / Dibuat 31 Disember 2019" + Minister signature block |

The parser validates itself: it cross-checks every extracted heading against the official **Arrangement of Regulations** in both languages, verifies BM coverage is 60/60, and warns on any structural anomaly. (Some headings legitimately differ from the Arrangement — errata in the body text, e.g. reg 49 body says "Payment of customs duties" while the Arrangement says "Payment of duties" — the body text is kept.)

Note: gazette page furniture (`P.U. (A) 397` running heads, page numbers, `Regulation`/`Peraturan` markers) is stripped during preprocessing. The Third Schedule contains scanned customs **forms** rendered as dense text blocks — they are preserved as-is for completeness.

## Deployment

### Render (auto-deploy from GitHub)

Add a `render.yaml` analogous to the Customs Act app's, or provision a static site pointing at `dist/`.

### cPanel (static upload)

```bash
npm run deploy          # builds, then zips dist/ → customs-reg-dist.zip
```

Upload `customs-reg-dist.zip` via cPanel File Manager into `public_html/` (or any subfolder), **Extract**, delete the zip. The build uses relative asset paths (`base: './'`), so it works at a domain root or any subdirectory without rebuilding.

### Any other static host

`dist/` is plain static files — GitHub Pages, Netlify, Cloudflare Pages, S3, nginx all work as-is.

## Disclaimer

This is an unofficial convenience reference. For legal purposes, refer to the official text published by the Attorney General's Chambers at [lom.agc.gov.my](https://lom.agc.gov.my).
