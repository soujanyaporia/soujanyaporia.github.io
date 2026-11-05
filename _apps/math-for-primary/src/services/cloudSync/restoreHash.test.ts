import { describe, expect, it } from 'vitest';
import { scrubRestoreHash } from './restoreHash';
import { restoreUrl } from './recoveryCard';
describe('zero-network recovery links', () => {
  it('puts the code only in the URL fragment and scrubs it synchronously', () => {
    const code = 'sunny-otter-hexagon-mango-42', url = new URL(restoreUrl(code)); expect(url.search).toBe(''); expect(url.pathname).not.toContain(code); let scrubbed = false;
    const value = scrubRestoreHash(url, { replaceState(_data, _unused, path) { expect(path).toBe('#/guest'); scrubbed = true; } }); expect(scrubbed).toBe(true); expect(value).toBe(code);
  });
  it('scrubs invalid and oversized codes without rendering them', () => { for (const code of ['', 'a'.repeat(200), '%E0%A4%A']) { let path: string | URL | null | undefined; scrubRestoreHash({ hash: `#/guest?restore=${code}` }, { replaceState(_data, _unused, url) { path = url; } }); expect(path).toBe('#/guest'); } });
  it('leaves ordinary routes alone', () => { expect(scrubRestoreHash({ hash: '#/lab' }, { replaceState() { throw new Error('should not run'); } })).toBeNull(); });
});
