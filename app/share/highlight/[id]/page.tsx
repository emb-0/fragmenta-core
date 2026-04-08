import Link from 'next/link';
import { getHighlight } from '@/lib/supabase/db';
import { notFound } from 'next/navigation';
import { ShareActions } from './share-actions';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const highlight = await getHighlight(id).catch(() => null);

  if (!highlight) {
    return { title: 'Highlight Not Found — Fragmenta' };
  }

  const description = highlight.text.length > 160
    ? highlight.text.slice(0, 157) + '...'
    : highlight.text;

  return {
    title: `Highlight — ${highlight.book.canonical_title} — Fragmenta`,
    description,
    openGraph: {
      title: `Highlight from ${highlight.book.canonical_title}`,
      description,
      images: [`/api/share/highlight/${id}`],
    },
    twitter: {
      card: 'summary_large_image',
      title: `Highlight from ${highlight.book.canonical_title}`,
      description,
      images: [`/api/share/highlight/${id}`],
    },
  };
}

export default async function ShareHighlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    notFound();
  }

  const highlight = await getHighlight(id).catch(() => null);

  if (!highlight) {
    notFound();
  }

  const imageUrl = `/api/share/highlight/${id}`;
  const downloadUrl = `/api/share/highlight/${id}?download=1`;

  return (
    <div className="page-container" style={{ paddingTop: 'var(--sp-2xl)' }}>
      <div className="section-header" style={{ marginBottom: 'var(--sp-xl)' }}>
        <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Share</p>
        <h1 className="text-large-title text-text-1">Share Highlight</h1>
      </div>

      {/* Share card preview */}
      <div className="surface-journal" style={{ marginBottom: 'var(--sp-xl)', padding: 0, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={`Share card for highlight from ${highlight.book.canonical_title}`}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            borderRadius: 'var(--radius-hero)',
          }}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 'var(--sp-xl)' }}>
        <a href={downloadUrl} className="btn-prominent" download>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2v9M4 8l4 4 4-4" />
            <path d="M2 13h12" />
          </svg>
          Download Image
        </a>
        <ShareActions highlightId={id} />
      </div>

      {/* Back link */}
      <div style={{ display: 'flex', gap: 'var(--sp-sm)' }}>
        <Link
          href={`/books/${highlight.book.id}`}
          className="btn-ghost"
          style={{ color: 'var(--accent)' }}
        >
          Back to {highlight.book.canonical_title}
        </Link>
      </div>
    </div>
  );
}
