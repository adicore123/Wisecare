import { detectTypeAndSource } from '@/lib/contentHelpers';

export const RECOMMENDED_CONTENT_TYPES = ['video', 'post', 'article'] as const;
export type RecommendedContentType = (typeof RECOMMENDED_CONTENT_TYPES)[number];

/** סוג הפריט: מהטופס אם תקין, אחרת נגזר מהקישור, ואחרת פוסט */
export function normalizeRecommendedType(value: unknown, url: string): RecommendedContentType {
  const raw = String(value || '').trim();
  if ((RECOMMENDED_CONTENT_TYPES as readonly string[]).includes(raw)) {
    return raw as RecommendedContentType;
  }
  const derived = detectTypeAndSource(url).type;
  if ((RECOMMENDED_CONTENT_TYPES as readonly string[]).includes(derived)) {
    return derived as RecommendedContentType;
  }
  return 'post';
}
