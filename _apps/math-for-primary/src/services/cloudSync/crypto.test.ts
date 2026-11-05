import { beforeAll, describe, expect, it } from 'vitest';
import { decryptProgress, DecryptionError, deriveKeys, encryptProgress, fromBase64, toBase64, type CloudKeys } from './crypto';
import { initialProgress } from '../../state/progress';
let keys: CloudKeys;
beforeAll(async () => { keys = await deriveKeys('sunny-otter-hexagon-mango-42'); });
describe('Web Crypto E2EE', () => {
  it('derives the same independent keys across formatting variations', async () => {
    const b = await deriveKeys(' SUNNY Otter_HEXAGON mango 42 '); expect(b.accountId).toBe(keys.accountId); expect(b.writeToken).toBe(keys.writeToken); expect(keys.accountId).toMatch(/^[a-f0-9]{64}$/); expect(keys.accountId).not.toBe(keys.writeToken);
    expect(await crypto.subtle.exportKey('jwk', b.aesKey)).toEqual(await crypto.subtle.exportKey('jwk', keys.aesKey));
  });
  it('round-trips full P1–P6 progress with fresh IVs and optional compression', async () => {
    const p = initialProgress(1); p.profile.name = 'Moon explorer';
    for (let level = 1; level <= 6; level++) for (const track of ['standard', 'foundation']) p.primary.activities[`p${level}.${track}.fractions`] = { attempts: 9, correct: 8, firstTry: 7, hints: 1, tries: 10, sessions: 1, stars: 3, lastAt: 1234, days: ['2026-11-05'], recent: [1, 1] };
    const a = await encryptProgress(p, keys.aesKey, keys.accountId), b = await encryptProgress(p, keys.aesKey, keys.accountId); expect(a.iv).not.toBe(b.iv); expect(fromBase64(a.iv)).toHaveLength(12); expect(await decryptProgress(a, keys.aesKey, keys.accountId)).toEqual(p); expect(JSON.stringify(a)).not.toContain(p.profile.name);
  });
  it('rejects ciphertext, IV, account and schema tampering', async () => {
    const e = await encryptProgress({ xp: 500 }, keys.aesKey, keys.accountId), bytes = fromBase64(e.ciphertext); bytes[0] ^= 1;
    const iv = fromBase64(e.iv); iv[0] ^= 1;
    for (const [envelope, id] of [[{ ...e, ciphertext: toBase64(bytes) }, keys.accountId], [{ ...e, iv: toBase64(iv) }, keys.accountId], [e, 'a'.repeat(64)], [{ ...e, schemaVersion: 2 }, keys.accountId]] as const) await expect(decryptProgress(envelope, keys.aesKey, id)).rejects.toBeInstanceOf(DecryptionError);
  });
  it('fails explicitly on payload limits without dropping progress', async () => { await expect(encryptProgress({ a: 'hello' }, keys.aesKey, keys.accountId, 1, 4)).rejects.toThrow('too large'); });
});
