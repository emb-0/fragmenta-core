# Fragmenta

A personal reading highlights app built around Kindle highlight exports. Import your highlights, browse your books, and search across everything you've ever marked, noted, and remembered.

## Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Postgres)
- **Vercel** (deployment)

## Design System

Sprint 3 introduced a dark, literary, journal-inspired design system mirroring the Fragmenta iOS app.

**Philosophy**: Quiet, intentional, premium. Content (passages, highlights, notes) takes center stage with UI that recedes behind it. Warm neutrals, serif quotations, soft depth layering, and ambient glow effects.

**Tokens** (from iOS design system):
- **Colors**: 5-level surface hierarchy (#07090C → #253040), muted blue-gray accent (#6D8AA8), warm taupe accent (#8E7D68)
- **Typography**: System rounded for UI, Georgia serif for highlight passages (narrative text)
- **Spacing**: 6pt base grid (6, 10, 16, 24, 32, 40)
- **Radius**: 14 (small), 22 (medium), 28 (large), 34 (hero)
- **Surfaces**: journal cards, section surfaces, inset surfaces, glass cards, field surfaces, chips

**Components**: `surface-journal`, `surface-section`, `surface-inset`, `surface-glass`, `surface-field`, `chip`, `btn-prominent`, `btn-secondary`, `btn-ghost`

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (Dashboard > Settings > API) |

### 3. Run database migrations

Apply migration files via the Supabase SQL Editor:

- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_sprint2_enhancements.sql`

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Run tests

```bash
npm test
```

### 6. Deploy to Vercel

1. Link repo to Vercel
2. Set environment variables in Vercel dashboard (same 3 as above)
3. Deploy — no special build config needed

## Supported formats

Fragmenta auto-detects two Kindle export formats:

| Format | Source | Separator |
|---|---|---|
| **My Clippings.txt** | Kindle device export | `==========` between entries |
| **Kindle Notebook** | read.amazon.com/notebook or Kindle app export | Double blank lines, `Title, Author` headers |

## Project structure

```
app/
  page.tsx                              # Home with stats + random highlight teaser
  layout.tsx                            # Root layout: sticky nav, ambient glows, footer
  import/page.tsx                       # Import with preview-first flow
  library/page.tsx                      # Book library with chip sort/filter
  books/[id]/page.tsx                   # Book detail: hero card, highlight cards
  search/page.tsx                       # Full search page with filters
  random/page.tsx                       # Random highlight discovery
  imports/page.tsx                      # Import history
  imports/[id]/page.tsx                 # Import detail with stat cards
  components/
    import-form.tsx                     # Client: preview → confirm import
    search-bar.tsx                      # Client: search field with icon
    copy-button.tsx                     # Client: copy with citation support
    highlight-editor.tsx                # Client: inline edit/delete highlights
    highlight-list.tsx                  # Client: highlight list with editing
    book-editor.tsx                     # Client: edit/delete/merge books
  api/
    imports/kindle/route.ts             # POST - import highlights
    imports/kindle/preview/route.ts     # POST - preview import (dry run)
    imports/route.ts                    # GET  - list imports
    imports/[id]/route.ts               # GET  - import detail
    books/route.ts                      # GET  - list books
    books/[id]/route.ts                 # GET, PATCH, DELETE - single book
    books/[id]/highlights/route.ts      # GET  - highlights for book
    books/merge/route.ts                # POST - merge duplicate books
    highlights/[id]/route.ts            # GET, PATCH, DELETE - single highlight
    search/route.ts                     # GET  - search highlights + books
    random/route.ts                     # GET  - random highlight
    exports/markdown/route.ts           # GET  - markdown export
    exports/csv/route.ts                # GET  - CSV export
    exports/json/route.ts               # GET  - JSON export
lib/
  types.ts                              # All TypeScript types
  parser/
    index.ts                            # Auto-detection + preview
    kindle.ts                           # My Clippings.txt parser
    kindle-notebook.ts                  # Kindle notebook parser
    canonicalize.ts                     # Title/author normalization
  supabase/
    client.ts                           # Supabase client factories
    db.ts                               # All database operations
supabase/migrations/
  001_initial_schema.sql                # Tables: imports, books, highlights
  002_sprint2_enhancements.sql          # note_count, kindle_notebook type
test/
  kindle-parser.test.ts                 # My Clippings parser tests (16)
  kindle-notebook-parser.test.ts        # Notebook parser tests (16)
  api-editing.test.ts                   # Editing API contract tests (22)
  fixtures/kindle-notebook-real.txt     # Real fixture file
sample/
  kindle-export.txt                     # Sample My Clippings export
```

## API Reference

All responses: `{ data: T | null, error: { message, code } | null }`.

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

### Highlights

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/highlights/[id]` | Single highlight with book info |
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

## Database schema

Three tables: `imports`, `books`, `highlights`.

- **Dedupe**: Books by `content_hash(title, author)`. Highlights by `(book_id, content_hash(text))`. Re-importing is safe.
- **Full-text search**: GIN indexes on title, author, highlight text, and notes.
- **Triggers**: `highlight_count` and `note_count` auto-update. `updated_at` auto-updates.
- **Raw preservation**: Every import stores full raw text. Every highlight stores its raw block.
- **Canonicalization**: Titles/authors are cleaned (whitespace, HTML entities, "and and" artifacts) while raw values are preserved.

## Sprint history

### Sprint 1: Foundation
Database schema, Kindle My Clippings.txt parser, API endpoints, web app scaffold, Supabase integration.

### Sprint 2: Daily usability
Kindle notebook format parser, auto-detection, preview-before-commit import flow, import history, search overhaul, exports, library sorting/filtering, book merge, canonicalization, 32 tests.

### Sprint 3: Visual polish + deployment
Complete UI overhaul mirroring the Fragmenta iOS design system. Dark journal-inspired aesthetic with 5-level surface hierarchy, ambient background glows, serif narrative text, chip-based filters, glass-effect cards. Added random highlight discovery feature. Git repo setup, GitHub push, Vercel deployment.

### Sprint 4: Editing + management
Inline editing of highlights (text + notes) and books (title, author) directly from the book detail page. PATCH/DELETE API endpoints for both highlights and books. Book management: rename, delete (with cascade), merge UI. Export improvements: better markdown formatting, per-book filenames, metadata headers. Responsive/mobile polish: touch targets, compact spacing, always-visible edit controls on touch devices. 54 tests (22 new for editing contracts).
