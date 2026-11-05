import { normalizePassphrase } from './wordlist';
export const MAX_CIPHERTEXT_CHARS = 131072;
export const MAX_PLAINTEXT_BYTES = 4_000_000;
const encoder = new TextEncoder();
export interface CloudKeys { accountId: string; writeToken: string; aesKey: CryptoKey }
export interface EncryptedProgress { iv: string; ciphertext: string; schemaVersion: number }
export class DecryptionError extends Error {
  constructor() { super('This backup could not be opened. Check your secret code; the file may be damaged.'); this.name = 'DecryptionError'; }
}
export class BackupTooLargeError extends Error {
  constructor() { super('This backup is too large for cloud save. Your work is still on this device. Download a backup file.'); this.name = 'BackupTooLargeError'; }
}
export function toBase64(bytes: Uint8Array): string {
  let s = ''; for (let i = 0; i < bytes.length; i += 8192) s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
export function fromBase64(s: string): Uint8Array<ArrayBuffer> { return Uint8Array.from(atob(s), c => c.charCodeAt(0)); }
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(n => n.toString(16).padStart(2, '0')).join('');
export async function deriveKeys(phrase: string): Promise<CloudKeys> {
  const base = await crypto.subtle.importKey('raw', encoder.encode(normalizePassphrase(phrase)), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
  const params = (domain: string) => ({ name: 'PBKDF2', salt: encoder.encode(`sg-primary-maths:${domain}:v1`), iterations: 150000, hash: 'SHA-256' });
  const [id, token, aesKey] = await Promise.all([
    crypto.subtle.deriveBits(params('account-id'), base, 256), crypto.subtle.deriveBits(params('write-auth'), base, 256),
    crypto.subtle.deriveKey(params('aes-gcm-key'), base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']),
  ]);
  return { accountId: hex(id), writeToken: hex(token), aesKey };
}
async function readBounded(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try { for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > limit) throw new BackupTooLargeError(); chunks.push(value); } }
  finally { await reader.cancel(); }
  const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; } return bytes;
}
/** Optional gzip is inside authenticated ciphertext. Readers also accept plain JSON v1 payloads. */
export async function encryptProgress(state: unknown, aesKey: CryptoKey, accountId: string, schemaVersion = 1, limit = MAX_CIPHERTEXT_CHARS): Promise<EncryptedProgress> {
  let bytes = encoder.encode(JSON.stringify(state)); if (bytes.length > MAX_PLAINTEXT_BYTES) throw new BackupTooLargeError();
  if (typeof CompressionStream !== 'undefined' && bytes.length > 1024) bytes = await readBounded(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip')), MAX_PLAINTEXT_BYTES);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(`${accountId}:v${schemaVersion}`), tagLength: 128 }, aesKey, bytes);
  const ciphertext = toBase64(new Uint8Array(encrypted)); if (ciphertext.length > limit) throw new BackupTooLargeError();
  return { iv: toBase64(iv), ciphertext, schemaVersion };
}
export async function decryptProgress(envelope: EncryptedProgress, aesKey: CryptoKey, accountId: string): Promise<unknown> {
  try {
    if (envelope.schemaVersion !== 1 || typeof envelope.ciphertext !== 'string' || envelope.ciphertext.length > MAX_PLAINTEXT_BYTES * 2) throw new Error();
    const iv = fromBase64(envelope.iv); if (iv.length !== 12) throw new Error();
    let bytes = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(`${accountId}:v${envelope.schemaVersion}`), tagLength: 128 }, aesKey, fromBase64(envelope.ciphertext)));
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) bytes = await readBounded(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')), MAX_PLAINTEXT_BYTES);
    if (bytes.length > MAX_PLAINTEXT_BYTES) throw new Error();
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes), (key, value) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error(); return value;
    });
  } catch { throw new DecryptionError(); }
}
