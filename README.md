# Fragmenta

A personal reading highlights app built around Kindle highlight exports. Import your highlights, browse your books, and search across everything you've ever marked, noted, and remembered.

## Stack

- **Next.js 16** (App Router, Turbopack)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Postgres)
- **Vercel** (deployment)

---

## New-machine setup

### 1. Clone and install

```bash
git clone git@github.com:emb-0/fragmenta-core.git
cd fragmenta-core
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the values. See the [Environment variables](#environment-variables) section below for what each one does.

The three Supabase vars are **required** — the server will not start without them. The two API keys are optional; their features degrade gracefully when unset.

### 3. Apply database migrations

Run these SQL files in order via the Supabase SQL Editor (Dashboard > SQL Editor):

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_sprint2_enhancements.sql
supabase/migrations/003_sprint5_enrichment.sql
supabase/migrations/004_sprint6_collections_ai.sql
```

These are idempotent — safe to re-run.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test
```

### 6. Build check

```bash
npm run build
```

The build must pass cleanly before any deploy.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Supabase project URL — Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Required** | Supabase anon/public key — Dashboard > Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | Supabase service role key (server-side only) — Dashboard > Settings > API > service_role |
| `GOOGLE_BOOKS_API_KEY` | Optional | Google Books API key (server-side only). Without it, enrichment is silently skipped. |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key (server-side only). Without it, AI summary generation returns a clear error; rest of app unaffected. |

**Startup validation**: `instrumentation.ts` runs on server start and throws immediately with a clear message if any required variable is missing. Optional vars are not checked.

**Server-side-only keys**: `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_BOOKS_API_KEY`, and `ANTHROPIC_API_KEY` are never prefixed with `NEXT_PUBLIC_` and are never sent to the browser.

---

## Next.js workspace root warning

Next.js 16 (Turbopack) infers the workspace root by scanning for `package-lock.json` files. If a lockfile exists in a parent directory (e.g. `~/package-lock.json`), Next.js may infer the wrong root and emit a warning.

**Fix** (already applied in `next.config.ts`):

```ts
turbopack: {
  root: process.cwd(),
}
```

This explicitly sets Turbopack's root to the project directory, overriding the inference. The warning disappears.

---

## iOS client integration

### Production backend (default)

The iOS app should point to the production backend by default:

```
https://fragmenta-core.vercel.app
```

This is the canonical backend for both Simulator and physical-device testing. It is always running the latest `main` deploy and requires no local setup.

### Health check

Before any other calls, the iOS app should verify backend reachability:

```
GET https://fragmenta-core.vercel.app/api/health
```

Returns:
```json
{
  "data": {
    "ok": true,
    "environment": "production",
    "timestamp": "2026-04-08T22:30:39.820Z",
    "version": "23eb35d",
    "features": {
      "google_books_configured": true,
      "anthropic_configured": false,
      "supabase_configured": true
    }
  }
}
```

The `version` field is the deployed git commit SHA. The `features` object tells you which optional integrations are live.

### Local backend (optional, dev-only)

Only needed when developing backend changes locally. Not required for iOS testing.

| Scenario | Base URL |
|---|---|
| Simulator on same Mac | `http://localhost:3000` |
| Physical device on same Wi-Fi | `http://<your-mac-local-ip>:3000` |

To find your Mac's local IP: run `ipconfig getifaddr en0`. Ensure Mac firewall allows port 3000.

### Response envelope

All API responses use: `{ data: T | null, error: { message, code } | null }`.

List endpoints wrap data in: `{ data: { items/books/highlights/...: [...], pagination: { page, limit, total, has_more, next_page } } }`.

The iOS client uses `convertFromSnakeCase` decoding. All response keys are snake_case.

### iOS-specific routes (Sprint 8)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health + feature flags |
| `GET` | `/api/insights/reading` | Combined reading insights (totals, activity, top books, top passages) |
| `GET` | `/api/books/[id]/collections` | Collections containing a book |
| `GET` | `/api/books/[id]/related-highlights` | Related highlights from other books (stub — returns empty) |
| `GET` | `/api/highlights/[id]/share-card` | Primary share card endpoint (PNG download) |

### Field name compatibility

Book responses include both canonical and short field names:
- `canonical_title` + `title` — both present
- `canonical_author` + `author` — both present
- `cover` — object `{ cover_url, thumbnail_url }` or null
- `source` — always `"kindle_export"` for now

Collection responses include both:
- `name` + `title`
- `description` + `summary`

Highlight responses include:
- `note_text` + `note` — both present

### iOS testing against production

1. In the iOS app, set base URL to `https://fragmenta-core.vercel.app`
2. Call `GET /api/health` — confirm `ok: true` and check `version`
3. All `/api/*` routes are available — no local backend needed
4. To switch to local dev: change base URL to `http://localhost:3000` and run `npm run dev`

All API endpoints are under `/api/`. See the [API Reference](#api-reference) section below for exact contracts.

---

## Supported import formats

| Format | Source | Separator |
|---|---|---|
| **My Clippings.txt** | Kindle device export | `==========` between entries |
| **Kindle Notebook** | read.amazon.com/notebook or Kindle app export | Double blank lines, `Title, Author` headers |

---

## Design system

Sprint 3 introduced a dark, literary, journal-inspired design system mirroring the Fragmenta iOS app.

**Philosophy**: Quiet, intentional, premium. Content (passages, highlights, notes) takes center stage with UI that recedes behind it. Warm neutrals, serif quotations, soft depth layering, and ambient glow effects.

**Tokens** (from iOS design system):
- **Colors**: 5-level surface hierarchy (#07090C → #253040), muted blue-gray accent (#6D8AA8), warm taupe accent (#8E7D68)
- **Typography**: System rounded for UI, Georgia serif for highlight passages (narrative text)
- **Spacing**: 6pt base grid (6, 10, 16, 24, 32, 40)
- **Radius**: 14 (small), 22 (medium), 28 (large), 34 (hero)
- **Surfaces**: journal cards, section surfaces, inset surfaces, glass cards, field surfaces, chips

**Components**: `surface-journal`, `surface-section`, `surface-inset`, `surface-glass`, `surface-field`, `chip`, `btn-prominent`, `btn-secondary`, `btn-ghost`

---

## Project structure

```
app/
  page.tsx                              # Home with stats + random highlight teaser
  layout.tsx                            # Root layout: sticky nav, ambient glows, footer, SW register
  import/page.tsx                       # Import with preview-first flow
  library/page.tsx                      # Book library with chip sort/filter
  bookshelf/page.tsx                    # Cover-based visual bookshelf grid
  books/[id]/page.tsx                   # Book detail: hero card, cover, highlight cards
  search/page.tsx                       # Full search page with filters
  random/page.tsx                       # Random highlight discovery
  imports/page.tsx                      # Import history
  imports/[id]/page.tsx                 # Import detail with stat cards
  insights/page.tsx                     # Reading stats: counts, top books, recent highlights
  collections/page.tsx                  # Collection listing
  collections/[id]/page.tsx             # Collection detail with books
  offline/page.tsx                      # PWA offline fallback page
  share/highlight/[id]/page.tsx         # Share card preview page
  share/highlight/[id]/share-actions.tsx # Client: share/download actions
  components/
    import-form.tsx                     # Client: preview → confirm import
    search-bar.tsx                      # Client: search field with icon
    copy-button.tsx                     # Client: copy with citation support
    highlight-editor.tsx                # Client: inline edit/delete highlights
    highlight-list.tsx                  # Client: highlight list with editing
    book-editor.tsx                     # Client: edit/delete/merge books
    book-cover.tsx                      # Client: cover image with fallback
    enrich-button.tsx                   # Client: trigger Google Books lookup
    backfill-button.tsx                 # Client: batch enrich from bookshelf
    collection-manager.tsx              # Client: create/delete collections
    collection-detail.tsx               # Client: add/remove books from collection
    sw-register.tsx                     # Client: service worker registration
  api/
    imports/kindle/route.ts             # POST - import highlights
    imports/kindle/preview/route.ts     # POST - preview import (dry run)
    imports/route.ts                    # GET  - list imports
    imports/[id]/route.ts               # GET  - import detail
    books/route.ts                      # GET  - list books
    books/[id]/route.ts                 # GET, PATCH, DELETE - single book
    books/[id]/highlights/route.ts      # GET  - highlights for book
    books/[id]/summary/route.ts         # GET, POST - AI book summary (cached)
    books/merge/route.ts                # POST - merge duplicate books
    books/enrich/route.ts               # POST - enrich book(s) via Google Books
    highlights/[id]/route.ts            # GET, PATCH, DELETE - single highlight
    search/route.ts                     # GET  - search highlights + books
    random/route.ts                     # GET  - random highlight
    exports/markdown/route.ts           # GET  - markdown export
    exports/csv/route.ts                # GET  - CSV export
    exports/json/route.ts               # GET  - JSON export
    collections/route.ts                # GET, POST - list/create collections
    collections/[id]/route.ts           # GET, PATCH, DELETE - single collection
    collections/[id]/books/route.ts     # POST - add book to collection
    collections/[id]/books/[bookId]/route.ts  # DELETE - remove book
    stats/overview/route.ts             # GET  - stats overview
    stats/activity/route.ts             # GET  - activity timeline
    stats/books/route.ts                # GET  - top books by highlights
    share/highlight/[id]/route.tsx      # GET  - OG image share card
    health/route.ts                     # GET  - health check + feature flags (Sprint 8)
    insights/reading/route.ts           # GET  - combined reading insights (Sprint 8)
    books/[id]/collections/route.ts     # GET  - collections containing book (Sprint 8)
    books/[id]/related-highlights/route.ts # GET - related highlights stub (Sprint 8)
    highlights/[id]/share-card/route.ts # GET  - share card alias for iOS (Sprint 8)
lib/
  types.ts                              # All TypeScript types
  api/
    ios-compat.ts                       # iOS response compatibility transforms (Sprint 8)
  parser/
    index.ts                            # Auto-detection + preview
    kindle.ts                           # My Clippings.txt parser
    kindle-notebook.ts                  # Kindle notebook parser
    canonicalize.ts                     # Title/author normalization
  google-books/
    index.ts                            # Google Books module exports
    client.ts                           # API client + result extraction
    match.ts                            # Jaccard scoring + confidence
  ai/
    summarize.ts                        # Anthropic Claude API for book summaries
  supabase/
    client.ts                           # Supabase client factories
    db.ts                               # All database operations
instrumentation.ts                      # Server startup env validation
public/
  manifest.json                         # PWA web app manifest
  sw.js                                 # Service worker (cache-first static, network-first pages)
  icon-192.svg                          # PWA app icon
supabase/migrations/
  001_initial_schema.sql                # Tables: imports, books, highlights
  002_sprint2_enhancements.sql          # note_count, kindle_notebook type
  003_sprint5_enrichment.sql            # Google Books enrichment columns
  004_sprint6_collections_ai.sql        # Tables: collections, collection_books, book_summaries
test/
  kindle-parser.test.ts                 # My Clippings parser tests (16)
  kindle-notebook-parser.test.ts        # Notebook parser tests (16)
  api-editing.test.ts                   # Editing API contract tests (22)
  google-books.test.ts                  # Google Books matching + enrichment tests (24)
  sprint6.test.ts                       # Sprint 6: collections, stats, share, AI, PWA (20)
  sprint8-ios-compat.test.ts            # Sprint 8: iOS compat transforms + pagination (25)
  fixtures/kindle-notebook-real.txt     # Real fixture file
sample/
  kindle-export.txt                     # Sample My Clippings export
```

---

## API Reference

All responses use the envelope: `{ data: T | null, error: { message, code } | null }`.

List endpoints include pagination: `{ data: { items: [...], pagination: { page, limit, total, has_more, next_page } } }`.

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Backend health check, environment, feature flags |

### Import

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/imports/kindle` | Import highlights (JSON body or multipart file) |
| `POST` | `/api/imports/kindle/preview` | Preview import without persisting |
| `GET` | `/api/imports` | List all imports |
| `GET` | `/api/imports/[id]` | Import detail with summary |

**POST /api/imports/kindle** — JSON: `{ "text": "...", "filename": "..." }` or multipart `file` field.

**POST /api/imports/kindle/preview** — Same input, returns preview stats without importing:
```json
{
  "data": {
    "format": "notebook",
    "books_detected": 30,
    "highlights_detected": 523,
    "notes_detected": 2,
    "vocab_detected": 8,
    "parse_warnings_count": 0,
    "warnings": [],
    "books": [{ "title": "...", "author": "...", "highlight_count": 64, "note_count": 1, "vocab_count": 0 }]
  }
}
```

### Books

| Method | Endpoint | Params | Description |
|---|---|---|---|
| `GET` | `/api/books` | | List all books |
| `GET` | `/api/books/[id]` | | Single book |
| `PATCH` | `/api/books/[id]` | `{ "canonical_title": "...", "canonical_author": "..." }` | Update book |
| `DELETE` | `/api/books/[id]` | | Delete book + all highlights |
| `GET` | `/api/books/[id]/highlights` | `limit`, `offset`, `sort` (sequence\|recent), `has_notes` | Paginated highlights |
| `POST` | `/api/books/merge` | `{ "keep_id": "...", "merge_id": "..." }` | Merge duplicate books |
| `POST` | `/api/books/enrich` | `{ "book_id": "..." }` or `{ "backfill": true, "limit": 50 }` | Enrich via Google Books |
| `GET` | `/api/books/[id]/collections` | `page`, `limit` | Collections containing this book |
| `GET` | `/api/books/[id]/related-highlights` | `page`, `limit` | Related highlights (stub) |

### Highlights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/highlights/[id]` | Single highlight with book info |
| `GET` | `/api/highlights/[id]/share-card` | Download share card PNG (iOS primary) |
| `PATCH` | `/api/highlights/[id]` | Update highlight text/note (`{ "text": "...", "note_text": "..." }`) |
| `DELETE` | `/api/highlights/[id]` | Delete highlight (updates book counts) |
| `GET` | `/api/random` | Random highlight with book info |

### Search

| Method | Endpoint | Params |
|---|---|---|
| `GET` | `/api/search` | `q` (required), `limit`, `offset`, `book_id`, `has_notes`, `sort` (relevance\|recent\|book) |

Returns both matching highlights and matching books (by title/author).

### Export

| Method | Endpoint | Params | Format |
|---|---|---|---|
| `GET` | `/api/exports/markdown` | `book_id` (optional) | `.md` file download |
| `GET` | `/api/exports/csv` | `book_id` (optional) | `.csv` file download |
| `GET` | `/api/exports/json` | `book_id` (optional) | `.json` file download |

### Collections

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/collections` | List all collections |
| `POST` | `/api/collections` | Create collection (`{ "name": "...", "description": "..." }`) |
| `GET` | `/api/collections/[id]` | Collection detail with books |
| `PATCH` | `/api/collections/[id]` | Update name/description |
| `DELETE` | `/api/collections/[id]` | Delete collection (books are not deleted) |
| `POST` | `/api/collections/[id]/books` | Add book (`{ "book_id": "..." }`) |
| `DELETE` | `/api/collections/[id]/books/[bookId]` | Remove book from collection |

### Stats & Insights

| Method | Endpoint | Params | Description |
|---|---|---|---|
| `GET` | `/api/stats/overview` | | Book, highlight, note counts + avg per book |
| `GET` | `/api/stats/activity` | `months` (default 6) | Highlights per month timeline |
| `GET` | `/api/stats/books` | `limit` (default 10) | Top books by highlight count |
| `GET` | `/api/insights/reading` | | Combined insights for iOS (totals, activity, top books, passages) |

The `/insights` page renders stats via direct Supabase queries in a server component (no API round-trip). The `/api/insights/reading` endpoint combines all stats into a single iOS-friendly response.

### AI Book Summaries

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/books/[id]/summary` | Get cached summary (returns 404 if none) |
| `POST` | `/api/books/[id]/summary` | Generate or regenerate summary |

**Cache logic**: Summaries are cached by `highlight_count_at_generation`. If the highlight count hasn't changed, the cached summary is returned. POST forces regeneration.

**Model**: `claude-sonnet-4-20250514`, 500 max tokens, temperature 0.3.

**Graceful degradation**: If `ANTHROPIC_API_KEY` is not set, summary generation returns a clear error. The rest of the app is unaffected.

### Share Cards

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/share/highlight/[id]` | Returns 1200×630 PNG image (ImageResponse via next/og) |
| `GET` | `/api/share/highlight/[id]?download=1` | Returns image as attachment for download |

The `/share/highlight/[id]` page provides a preview with share/download actions.

---

## Google Books enrichment

Books can be enriched with cover art and metadata from the Google Books API. Enrichment is server-side only — the API key is never exposed to the client.

**Architecture**: Cache-first, backend-only. Once a book is enriched (`found` or `not_found`), it won't be re-queried unless forced. The app never depends on Google Books availability at runtime — enrichment is additive, not required.

**Matching**: Uses Jaccard token-overlap scoring to find the best match. High confidence requires ≥65% title similarity + ≥35% author similarity. Low-confidence matches are rejected.

**Enrichment fields on Book**:
| Field | Type | Description |
|---|---|---|
| `google_books_id` | string \| null | Google Books volume ID |
| `cover_url` | string \| null | Medium-resolution cover image URL |
| `thumbnail_url` | string \| null | Small cover image URL |
| `subtitle` | string \| null | Book subtitle |
| `publisher` | string \| null | Publisher name |
| `published_date` | string \| null | Publication date (raw, e.g. "1925") |
| `page_count` | number \| null | Page count |
| `google_books_link` | string \| null | Link to Google Books page |
| `enrichment_status` | string | `pending`, `found`, `not_found`, `error`, `skipped` |
| `enrichment_confidence` | string \| null | `high`, `medium`, `low` |
| `enrichment_updated_at` | string \| null | When enrichment was last attempted |

**Backfill**: POST `/api/books/enrich` with `{ "backfill": true }` to enrich up to 50 pending books. Throttled at 300ms between API calls.

---

## PWA / offline support

Fragmenta is installable as a Progressive Web App.

- **Manifest**: `public/manifest.json` — standalone display, dark theme (#07090C)
- **Service worker**: `public/sw.js` — cache-first for static assets (`_next/`), network-first for pages (falls back to cache, then `/offline`), network-first for API GETs
- **Offline page**: `/offline` — friendly message with retry button
- **Icon**: `public/icon-192.svg`

---

## Database schema

Six tables: `imports`, `books`, `highlights`, `collections`, `collection_books`, `book_summaries`.

- **Dedupe**: Books by `content_hash(title, author)`. Highlights by `(book_id, content_hash(text))`. Re-importing is safe.
- **Full-text search**: GIN indexes on title, author, highlight text, and notes.
- **Triggers**: `highlight_count` and `note_count` auto-update. `updated_at` auto-updates.
- **Raw preservation**: Every import stores full raw text. Every highlight stores its raw block.
- **Canonicalization**: Titles/authors are cleaned (whitespace, HTML entities, "and and" artifacts) while raw values are preserved.

---

## Sprint history

### Sprint 1: Foundation
Database schema, Kindle My Clippings.txt parser, API endpoints, web app scaffold, Supabase integration.

### Sprint 2: Daily usability
Kindle notebook format parser, auto-detection, preview-before-commit import flow, import history, search overhaul, exports, library sorting/filtering, book merge, canonicalization, 32 tests.

### Sprint 3: Visual polish + deployment
Complete UI overhaul mirroring the Fragmenta iOS design system. Dark journal-inspired aesthetic with 5-level surface hierarchy, ambient background glows, serif narrative text, chip-based filters, glass-effect cards. Added random highlight discovery feature. Git repo setup, GitHub push, Vercel deployment.

### Sprint 4: Editing + management
Inline editing of highlights (text + notes) and books (title, author) directly from the book detail page. PATCH/DELETE API endpoints for both highlights and books. Book management: rename, delete (with cascade), merge UI. Export improvements: better markdown formatting, per-book filenames, metadata headers. Responsive/mobile polish: touch targets, compact spacing, always-visible edit controls on touch devices. 54 tests (22 new for editing contracts).

### Sprint 5: Covers, bookshelf, enrichment
Google Books enrichment layer: server-side API integration with Jaccard confidence scoring, cache-first architecture, backfill support. New bookshelf route with visual cover grid, fallback typographic covers, hover animations. Cover art displayed on book detail pages with "Find cover" button. Enrichment API: single-book and batch backfill endpoints. `next/image` optimization for cover images. New migration adding 11 enrichment columns to books table. Nav updated with Shelf link. 78 tests (24 new for matching/enrichment).

### Sprint 6: Insights, collections, share cards, AI summaries, PWA
Reading stats/insights page with server-side parallel queries (book/highlight/note counts, top-10 most annotated, recent highlights). Collections system for user-defined book groupings (full CRUD + add/remove books). Share card generation for highlights via `next/og` ImageResponse (1200×630 dark literary design). AI-powered book summaries via Anthropic Claude API with cache invalidation by highlight count. PWA support: web app manifest, service worker (cache-first static, network-first pages with offline fallback), installable on mobile. Stats API endpoints. New migration adding 3 tables (collections, collection_books, book_summaries). Nav updated with Insights link. 98 tests (20 new for Sprint 6 features).

### Sprint 7: Stability, environment, and dev/prod parity
Local environment hardening for multi-machine development. Updated `.env.example` with all required and optional vars. Added `instrumentation.ts` for server-startup env validation (fails loudly on missing required vars, graceful degradation for optional vars). Fixed Next.js Turbopack workspace-root warning via `turbopack.root` in `next.config.ts`. README rewritten with new-machine setup guide, env var documentation, iOS base URL guidance, and consolidated API reference. Build and tests validated on Mac mini.

### Sprint 8: iOS runtime alignment
Backend contract reconciliation for the native iOS client. Deep audit of all 23 fragmenta-ios API endpoints against fragmenta-core route handlers revealed 16 contract mismatches. Added `lib/api/ios-compat.ts` with response transformation helpers (book, highlight, collection, search result, pagination). Added 5 new routes: `/api/health` (connectivity + feature flags), `/api/insights/reading` (combined insights), `/api/books/[id]/collections`, `/api/books/[id]/related-highlights` (stub), `/api/highlights/[id]/share-card`. Updated 12 existing routes with: pagination metadata (`{ page, limit, total, has_more, next_page }`), field name aliases (`title`/`author`/`note`/`cover` alongside canonical names), iOS request body compatibility (`raw_text` accepted alongside `text`), sort parameter mapping, page-based pagination alongside offset-based. 123 tests (25 new for iOS compatibility transforms).

### Sprint 9: Production-default backend for iOS
Verified all Sprint 8 iOS-compat routes live on production (`https://fragmenta-core.vercel.app`). Confirmed `/api/health` returns commit `23eb35d`, environment `production`, and correct feature flags. Verified `/api/books`, `/api/insights/reading`, `/api/search`, `/api/collections`, `/api/imports` all return Sprint 8 response shapes (pagination, field aliases) on production. Updated README to make production backend the default for iOS testing — local backend is now documented as optional/dev-only.
