let pending: string | null = null;
/** Called in bootstrap before importing React, routing, SEO, or any application code. */
export function scrubRestoreHash(location: Pick<Location, 'hash'>, history: Pick<History, 'replaceState'>): string | null {
  const q = location.hash.indexOf('?'); if (q === -1) return null;
  const params = new URLSearchParams(location.hash.slice(q + 1)); if (!params.has('restore')) return null;
  const phrase = params.get('restore') ?? '';
  history.replaceState(null, '', '#/guest');
  return phrase.length <= 128 ? phrase : '';
}
export function captureRestoreHash() { const value = scrubRestoreHash(window.location, window.history); if (value !== null) pending = value; }
export function takeRestoreHash() { const value = pending; pending = null; return value; }
