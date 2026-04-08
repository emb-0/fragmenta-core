-- Sprint 6: Collections, AI features

-- =============================================================================
-- COLLECTIONS
-- =============================================================================
create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists collection_books (
  collection_id uuid not null references collections(id) on delete cascade,
  book_id       uuid not null references books(id) on delete cascade,
  added_at      timestamptz not null default now(),
  primary key (collection_id, book_id)
);

create index if not exists idx_collection_books_book on collection_books (book_id);

-- Auto-update updated_at on collections
create trigger trg_collections_updated_at
before update on collections
for each row execute function set_updated_at();

-- =============================================================================
-- AI: Book summaries cache
-- =============================================================================
create table if not exists book_summaries (
  book_id                     uuid primary key references books(id) on delete cascade,
  summary                     text not null,
  highlight_count_at_generation int not null,
  model                       text not null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create trigger trg_book_summaries_updated_at
before update on book_summaries
for each row execute function set_updated_at();
