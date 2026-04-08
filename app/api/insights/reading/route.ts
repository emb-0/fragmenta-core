/**
 * GET /api/insights/reading
 *
 * Combined reading insights endpoint for iOS.
 * Aggregates stats, activity, top books, and recent highlights
 * into the single shape ReadingInsights expects.
 */
import {
  getStatsOverview,
  getActivityTimeline,
  getTopBooks,
  getRecentHighlights,
} from '@/lib/supabase/db';
import { transformBook, transformHighlight, transformBookRef } from '@/lib/api/ios-compat';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [stats, activity, topBooks, recentHighlights] = await Promise.all([
      getStatsOverview(),
      getActivityTimeline(12),
      getTopBooks(10),
      getRecentHighlights(10),
    ]);

    return Response.json({
      data: {
        totals: {
          book_count: stats.bookCount,
          highlight_count: stats.highlightCount,
          note_count: stats.noteCount,
          current_streak_days: null,
          active_days: null,
          average_highlights_per_week: null,
          average_notes_per_week: null,
          pace_summary: null,
        },
        activity: activity.map((m) => ({
          date: `${m.month}-01T00:00:00Z`,
          highlight_count: m.highlights,
          note_count: m.notes,
        })),
        top_annotated_books: topBooks.map(transformBook),
        top_annotated_passages: recentHighlights.map((hl) => ({
          id: hl.id,
          highlight: transformHighlight(hl, hl.book),
          book: transformBookRef(hl.book),
          annotation_count: null,
          summary: null,
        })),
        generated_at: new Date().toISOString(),
      },
      error: null,
    });
  } catch (err) {
    console.error('Insights reading error:', err);
    return Response.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
