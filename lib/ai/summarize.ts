const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function generateBookSummary(
  bookTitle: string,
  bookAuthor: string | null,
  highlights: Array<{ text: string; note_text: string | null }>,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (highlights.length === 0) {
    return null;
  }

  const bookLabel = bookAuthor
    ? `"${bookTitle}" by ${bookAuthor}`
    : `"${bookTitle}"`;

  const highlightTexts = highlights
    .map((h, i) => {
      let entry = `${i + 1}. "${h.text}"`;
      if (h.note_text) {
        entry += `\n   Reader's note: ${h.note_text}`;
      }
      return entry;
    })
    .join('\n\n');

  const prompt = `A reader highlighted the following passages from the book ${bookLabel}. These are the specific passages and notes the reader chose to save — they represent what resonated most with this particular reader, not a comprehensive summary of the book.

${highlightTexts}

Based on these highlights, write a 2-3 paragraph summary of the key themes and ideas this reader marked as important. Focus on the patterns and connections between the highlighted passages. Write in third person (e.g., "The reader highlighted..." or "Key themes include...").`;

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Anthropic API error:', response.status, errorBody);
    throw new Error(`Anthropic API request failed with status ${response.status}`);
  }

  const data = await response.json();

  // Extract text from the response content blocks
  const textBlock = data.content?.find(
    (block: { type: string; text?: string }) => block.type === 'text',
  );

  return textBlock?.text ?? null;
}

export { MODEL as SUMMARY_MODEL };
