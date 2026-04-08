-- Sprint 2: Schema enhancements

-- Allow kindle_notebook source type
alter table imports drop constraint if exists imports_source_type_check;
alter table imports add constraint imports_source_type_check
  check (source_type in ('kindle_txt', 'kindle_notebook'));

-- Add note_count to books
alter table books add column if not exists note_count int not null default 0;

-- Update highlight_count trigger to also track note_count
create or replace function update_book_highlight_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update books set
      highlight_count = highlight_count + 1,
      note_count = note_count + (case when NEW.note_text is not null then 1 else 0 end),
      updated_at = now()
    where id = NEW.book_id;
  elsif TG_OP = 'DELETE' then
    update books set
      highlight_count = highlight_count - 1,
      note_count = note_count - (case when OLD.note_text is not null then 1 else 0 end),
      updated_at = now()
    where id = OLD.book_id;
  end if;
  return null;
end;
$$ language plpgsql;

-- Add combined FTS index for highlights (text + notes)
create index if not exists idx_highlights_combined_fts
  on highlights using gin (
    to_tsvector('english', text || ' ' || coalesce(note_text, ''))
  );
