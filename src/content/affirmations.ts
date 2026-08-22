import corpus from '@/content/sebi_content_FINAL_v2_1609.json';
import { getCategory } from '@/content/categories';
import type { Affirmation, CategoryId, ContentCategoryId } from '@/models/types';

/**
 * The approved editorial corpus: 1,609 original Serbian Latin messages with
 * personalization metadata (`sebi_content_FINAL_v2_1609.json` — the
 * authoritative final content source; never edited by hand or at runtime).
 *
 * The JSON is parsed and indexed exactly once at module load. The only
 * normalization applied is the `premium` flag: entitlement in this app is
 * category-level (see categories.ts), so the imported per-message flag is
 * deliberately overridden — otherwise the dataset would silently reshuffle
 * what is free and what is Premium.
 */

/**
 * Bumped whenever a corpus revision reuses ids with different texts.
 * PreferencesContext clears id-based favorites/recents when the persisted
 * value differs — a favorite must never silently change its wording.
 */
export const CONTENT_SCHEMA_VERSION = 2;

interface CorpusFile {
  version: string;
  language: string;
  count: number;
  categoryDisplayNames: Record<string, string>;
  items: unknown[];
}

const file = corpus as unknown as CorpusFile;

export const CONTENT_VERSION = file.version;

export const AFFIRMATIONS: Affirmation[] = file.items.map((raw) => {
  const item = raw as Affirmation;
  return { ...item, premium: getCategory(item.category).premium };
});

// ── Indexes (built once — 1,460 items stay local and cheap) ──

const byId = new Map<string, Affirmation>();
const byCategory = new Map<ContentCategoryId, Affirmation[]>();

for (const affirmation of AFFIRMATIONS) {
  byId.set(affirmation.id, affirmation);
  const list = byCategory.get(affirmation.category);
  if (list) list.push(affirmation);
  else byCategory.set(affirmation.category, [affirmation]);
}

export function getAffirmation(id: string): Affirmation | undefined {
  return byId.get(id);
}

export function getAffirmationsByCategory(category: CategoryId): Affirmation[] {
  if (category === 'today') return AFFIRMATIONS;
  return byCategory.get(category) ?? [];
}
