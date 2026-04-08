-- Sprint 5: Google Books enrichment columns on books table

-- Enrichment metadata
alter table books add column if not exists google_books_id text;
alter table books add column if not exists cover_url text;
alter table books add column if not exists thumbnail_url text;
alter table books add column if not exists subtitle text;
alter table books add column if not exists publisher text;
alter table books add column if not exists published_date text;
alter table books add column if not exists page_count int;
alter table books add column if not exists google_books_link text;
alter table books add column if not exists enrichment_status text default 'pending'
  check (enrichment_status in ('pending', 'found', 'not_found', 'error', 'skipped'));
alter table books add column if not exists enrichment_confidence text
  check (enrichment_confidence in ('high', 'medium', 'low') or enrichment_confidence is null);
alter table books add column if not exists enrichment_updated_at timestamptz;

-- Index for enrichment status (useful for backfill queries)
create index if not exists idx_books_enrichment_status on books (enrichment_status);

-- Index for cover_url existence (useful for bookshelf queries)
create index if not exists idx_books_has_cover on books (id) where cover_url is not null;
