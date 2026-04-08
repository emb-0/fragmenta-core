-- Fragmenta Core: Initial Schema
-- Tables: imports, books, highlights

-- =============================================================================
-- IMPORTS
-- =============================================================================
create table imports (
  id            uuid primary key default gen_random_uuid(),
  source_type   text not null default 'kindle_txt' check (source_type in ('kindle_txt')),
  filename      text,
  raw_text      text not null,
  parse_status  text not null default 'pending' check (parse_status in ('pending', 'processing', 'completed', 'failed')),
  import_summary jsonb default '{}'::jsonb,
  error_message text,
  created_at    timestamptz not null default now()
);

create index idx_imports_created_at on imports (created_at desc);
create index idx_imports_parse_status on imports (parse_status);

-- =============================================================================
-- BOOKS
-- =============================================================================
create table books (
  id                uuid primary key default gen_random_uuid(),
  canonical_title   text not null,
  canonical_author  text,
  source_title_raw  text not null,
  source_author_raw text,
  content_hash      text not null unique,
  highlight_count   int not null default 0,
  first_imported_at timestamptz not null default now(),
  last_imported_at  timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index idx_books_canonical_title on books (canonical_title);
create index idx_books_canonical_author on books (canonical_author);
create index idx_books_content_hash on books (content_hash);
create index idx_books_last_imported_at on books (last_imported_at desc);

-- Full text search on title and author
create index idx_books_title_fts on books using gin (to_tsvector('english', canonical_title));
create index idx_books_author_fts on books using gin (to_tsvector('english', coalesce(canonical_author, '')));

-- =============================================================================
-- HIGHLIGHTS
-- =============================================================================
create table highlights (
  id              uuid primary key default gen_random_uuid(),
  book_id         uuid not null references books(id) on delete cascade,
  import_id       uuid not null references imports(id) on delete cascade,
  sequence_number int not null,
  text            text not null,
  note_text       text,
  raw_block       text not null,
  content_hash    text not null,
  source_location text,
  source_type     text,
  highlighted_at  timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Dedupe: same book + same content = same highlight
  unique (book_id, content_hash)
);

create index idx_highlights_book_id on highlights (book_id);
create index idx_highlights_import_id on highlights (import_id);
create index idx_highlights_created_at on highlights (created_at desc);
create index idx_highlights_sequence on highlights (book_id, sequence_number);

-- Full text search on highlight text and notes
create index idx_highlights_text_fts on highlights using gin (to_tsvector('english', text));
create index idx_highlights_note_fts on highlights using gin (to_tsvector('english', coalesce(note_text, '')));

-- =============================================================================
-- FUNCTION: Update book highlight count
-- =============================================================================
create or replace function update_book_highlight_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update books set highlight_count = highlight_count + 1, updated_at = now() where id = NEW.book_id;
  elsif TG_OP = 'DELETE' then
    update books set highlight_count = highlight_count - 1, updated_at = now() where id = OLD.book_id;
  end if;
  return null;
end;
$$ language plpgsql;

create trigger trg_highlight_count
after insert or delete on highlights
for each row execute function update_book_highlight_count();

-- =============================================================================
-- FUNCTION: Auto-update updated_at
-- =============================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trg_books_updated_at
before update on books
for each row execute function set_updated_at();

create trigger trg_highlights_updated_at
before update on highlights
for each row execute function set_updated_at();
