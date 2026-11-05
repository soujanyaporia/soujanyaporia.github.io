import { decryptProgress, deriveKeys, encryptProgress, type CloudKeys, type EncryptedProgress } from './crypto';
import { maskedHint, normalizePassphrase } from './wordlist';
import { mergeCloudState, stableJson, validateCloudState, type CloudState } from './mergeProgress';
import { SESSION_KEY, type StorageLike } from './storage';
export type SyncStatus = 'guest' | 'syncing' | 'synced' | 'pending' | 'offline-saved-locally' | 'error';
export interface SavedSession { accountId: string; writeToken: string; exportedAesKeyJwk: JsonWebKey; maskedHint: string; lastRevision: number; lastSyncedAt: number; shared: boolean; dirty: boolean }
export interface SyncView { status: SyncStatus; error: string; connected: boolean; shared: boolean; lastSyncedAt: number; maskedHint: string }
interface Remote extends EncryptedProgress { accountId: string; revision: number; updatedAt: number }
export interface SyncOptions {
  endpoint: string; read: () => CloudState; apply: (state: CloudState) => void;
  local: StorageLike; tab: StorageLike; fetch?: typeof fetch; online?: () => boolean;
  changeMode?: (shared: boolean, state: CloudState) => void;
  wipe?: () => void; onChange?: (view: SyncView) => void;
}
class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
const HEX = /^[a-f0-9]{64}$/;
function endpointUrl(endpoint: string) {
  if (!endpoint.trim()) return '';
  const url = new URL(endpoint);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Cloud save needs a secure server address.');
  return url.href.replace(/\/$/, '');
}
export class SyncManager {
  readonly endpoint: string;
  private saved: SavedSession | null = null;
  private keys: CloudKeys | null = null;
  private phrase: string | null = null;
  private generation = 0;
  private inFlight: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private retry = 2000;
  private active = true;
  private connecting = false;
  private stopping = false;
  view: SyncView = { status: 'guest', error: '', connected: false, shared: false, lastSyncedAt: 0, maskedHint: '' };
  constructor(private options: SyncOptions) { this.endpoint = endpointUrl(options.endpoint); }
  private update(status: SyncStatus, error = '') {
    this.view = { status, error, connected: !!this.saved, shared: this.saved?.shared ?? false, lastSyncedAt: this.saved?.lastSyncedAt ?? 0, maskedHint: this.saved?.maskedHint ?? '' };
    this.options.onChange?.(this.view);
  }
  private persist() { if (this.saved) (this.saved.shared ? this.options.tab : this.options.local).setItem(SESSION_KEY, JSON.stringify(this.saved)); }
  matchesSession(raw: string | null): boolean { try { const s = JSON.parse(raw ?? 'null'); return !!this.saved && s?.accountId === this.saved.accountId && s?.writeToken === this.saved.writeToken; } catch { return false; } }
  async resume(): Promise<void> {
    try {
      const raw = this.options.tab.getItem(SESSION_KEY) ?? this.options.local.getItem(SESSION_KEY); if (!raw) return;
      const saved = JSON.parse(raw) as SavedSession;
      if (!HEX.test(saved.accountId) || !HEX.test(saved.writeToken) || !Number.isSafeInteger(saved.lastRevision) || saved.lastRevision < 1 || typeof saved.shared !== 'boolean' || !Number.isFinite(saved.lastSyncedAt) || typeof saved.maskedHint !== 'string') throw new Error();
      const aesKey = await crypto.subtle.importKey('jwk', saved.exportedAesKeyJwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
      if (!this.active) return;
      this.saved = { ...saved, dirty: true }; this.keys = { accountId: saved.accountId, writeToken: saved.writeToken, aesKey }; this.update('pending'); this.schedule(0);
    } catch { if (this.active) this.update('error', 'This device could not reopen its cloud pass. Enter your recovery code again.'); }
  }
  private schedule(delay: number) { clearTimeout(this.timer); if (this.active && !this.stopping) this.timer = setTimeout(() => { void this.syncNow(); }, delay); }
  markDirty(immediate = false) {
    this.generation++;
    if (!this.saved || this.stopping) return;
    this.saved.dirty = true;
    try { this.persist(); } catch { this.update('error', 'This browser could not save your cloud session. Keep your recovery code.'); }
    if (!this.inFlight) this.update('pending'); this.schedule(immediate ? 0 : 2000);
  }
  private async request(method: 'GET' | 'PUT' | 'DELETE', keys: CloudKeys, body?: unknown): Promise<Remote & { ok: boolean }> {
    if (!this.endpoint) throw new Error('Cloud save is not connected to a server yet. You can still download a device backup.');
    const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await (this.options.fetch ?? fetch)(`${this.endpoint}/api/v1/sync/${keys.accountId}`, {
        method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-Write-Token': keys.writeToken },
        body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal, credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', redirect: 'error',
      });
      const text = await response.text(); if (text.length > 140000) throw new Error('The cloud server returned an oversized response.');
      const data = JSON.parse(text);
      if (!response.ok) throw new ApiError(response.status, data.error ?? 'SERVER_ERROR');
      if (method !== 'DELETE' && (!Number.isSafeInteger(data.revision) || data.revision < 1 || !Number.isFinite(data.updatedAt))) throw new Error('The cloud server returned an invalid revision.');
      if (method === 'GET' && (data.accountId !== keys.accountId || data.schemaVersion !== 1 || typeof data.iv !== 'string' || typeof data.ciphertext !== 'string')) throw new Error('The cloud server returned an invalid backup.');
      return data;
    } finally { clearTimeout(timeout); }
  }
  private async open(remote: Remote, keys: CloudKeys) { return validateCloudState(await decryptProgress(remote, keys.aesKey, keys.accountId)); }
  async connect(input: string, mode: 'create' | 'restore', shared = false): Promise<void> {
    if (this.saved || this.connecting) throw new Error('Log out of the current cloud pass before opening another.');
    if (!this.endpoint) throw new Error('Cloud save is not connected to a server yet. Device backups are available below.');
    this.connecting = true; this.update('syncing');
    try {
      const phrase = normalizePassphrase(input), keys = await deriveKeys(phrase); if (!this.active) return; let remote: Remote | null = null;
      try { remote = await this.request('GET', keys); } catch (e) { if (!(e instanceof ApiError && e.status === 404 && mode === 'create')) throw e; }
      if (mode === 'create' && remote) throw new Error('That code already exists. Roll another code.');
      let result: Remote & { ok: boolean } | undefined, merged = this.options.read();
      for (let attempt = 0; attempt < 5; attempt++) {
        const remoteState = remote ? await this.open(remote, keys) : null;
        merged = remoteState ? mergeCloudState(this.options.read(), remoteState) : this.options.read();
        const generation = this.generation;
        const encrypted = await encryptProgress(merged, keys.aesKey, keys.accountId);
        try {
          result = await this.request('PUT', keys, { ...encrypted, baseRevision: remote?.revision ?? 0 });
          // Capture work done while key derivation/encryption/network requests were running.
          if (generation !== this.generation) merged = mergeCloudState(merged, this.options.read());
          break;
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 409)) throw e;
          if (mode === 'create') throw new Error('That code already exists. Roll another code.');
          remote = await this.request('GET', keys);
        }
      }
      if (!result) throw new Error('Another device is saving. Please try again in a moment.');
      if (!this.active) return;
      const exportedAesKeyJwk = await crypto.subtle.exportKey('jwk', keys.aesKey);
      if (!this.active) return; merged = mergeCloudState(merged, this.options.read());
      this.options.changeMode?.(shared, merged); this.options.apply(merged);
      this.keys = keys; this.phrase = phrase;
      this.saved = { accountId: keys.accountId, writeToken: keys.writeToken, exportedAesKeyJwk, maskedHint: maskedHint(phrase), lastRevision: result.revision, lastSyncedAt: result.updatedAt, shared, dirty: true };
      this.persist(); this.update('pending'); this.schedule(0);
    } catch (e) { this.fail(e); throw new Error(this.view.error); }
    finally { this.connecting = false; }
  }
  private fail(error: unknown) {
    let message = error instanceof Error ? error.message : 'Cloud save could not finish.';
    if (error instanceof ApiError) {
      message = error.status === 404 ? 'No cloud backup was found for this code. A deleted backup will not be recreated automatically.' : error.status === 403 ? 'This cloud pass could not write to the backup. Re-enter your recovery code.' : error.status === 413 ? 'This backup is too large for cloud save. Download a device backup.' : error.status === 429 ? 'Cloud save is busy. Your progress is saved on this device; we will try again.' : `Cloud save is unavailable (${error.status}). Your progress stays on this device.`;
    }
    const offline = this.options.online?.() === false || error instanceof TypeError || error instanceof DOMException && error.name === 'AbortError';
    this.update(offline ? 'offline-saved-locally' : 'error', offline ? 'Your progress is saved on this device. Cloud save will retry when connected.' : message);
    if (this.saved && (offline || error instanceof ApiError && (error.status === 429 || error.status >= 500))) { this.schedule(this.retry); this.retry = Math.min(60000, this.retry * 2); }
  }
  syncNow(): Promise<boolean> {
    if (this.inFlight) return this.inFlight;
    if (!this.saved || !this.keys || !this.active || this.stopping) return Promise.resolve(false);
    clearTimeout(this.timer);
    this.inFlight = this.performSync().finally(() => { this.inFlight = null; }); return this.inFlight;
  }
  private async performSync(): Promise<boolean> {
    const saved = this.saved!, keys = this.keys!; this.update('syncing');
    try {
      if (this.options.online?.() === false) throw new TypeError('offline');
      for (let attempt = 0; attempt < 5; attempt++) {
        const remote = await this.request('GET', keys), remoteState = await this.open(remote, keys);
        if (!this.active || this.saved !== saved) return false;
        const merged = mergeCloudState(this.options.read(), remoteState);
        this.options.apply(merged);
        const generation = this.generation;
        let result = remote;
        if (stableJson(merged) !== stableJson(remoteState)) {
          const encrypted = await encryptProgress(merged, keys.aesKey, keys.accountId);
          if (!this.active || this.saved !== saved) return false;
          try { result = await this.request('PUT', keys, { ...encrypted, baseRevision: remote.revision }); }
          catch (e) { if (e instanceof ApiError && e.status === 409) continue; throw e; }
        }
        if (!this.active || this.saved !== saved) return false;
        saved.lastRevision = result.revision; saved.lastSyncedAt = Date.now(); saved.dirty = generation !== this.generation;
        this.persist(); this.retry = 2000; this.update(saved.dirty ? 'pending' : 'synced'); if (saved.dirty) this.schedule(2000); return !saved.dirty;
      }
      throw new Error('Another device is saving. Your progress is still on this device. Try Sync Now.');
    } catch (e) { if (this.active) this.fail(e); return false; }
  }
  async revealCode(input?: string): Promise<string> {
    if (this.phrase) return this.phrase;
    if (!input || !this.saved) throw new Error('Re-enter your recovery code to make a new card. The full code is not stored on this device.');
    const keys = await deriveKeys(input); if (keys.accountId !== this.saved.accountId) throw new Error('That code belongs to a different cloud pass.');
    this.phrase = normalizePassphrase(input); return this.phrase;
  }
  async exportEncrypted(): Promise<string> {
    if (!this.keys) throw new Error('Open a cloud pass to export an encrypted backup.');
    return JSON.stringify({ kind: 'sg-maths-encrypted-backup', accountId: this.keys.accountId, ...await encryptProgress(this.options.read(), this.keys.aesKey, this.keys.accountId, 1, Infinity) });
  }
  exportJson(): string { return JSON.stringify(this.options.read()); }
  async importBackup(text: string, phrase?: string): Promise<void> {
    if (text.length > 8_000_000) throw new Error('This backup file is too large.');
    const data = JSON.parse(text, (key, value) => { if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid backup.'); return value; });
    let state: CloudState;
    if (data.kind === 'sg-maths-encrypted-backup') {
      const keys = phrase ? await deriveKeys(phrase) : this.keys;
      if (!keys || keys.accountId !== data.accountId) throw new Error('Enter the recovery code that was used to encrypt this file.');
      state = validateCloudState(await decryptProgress(data, keys.aesKey, keys.accountId));
    } else state = validateCloudState(data);
    this.options.apply(mergeCloudState(this.options.read(), state)); this.markDirty(true);
  }
  async logout(wipe = false): Promise<void> {
    if (this.connecting) throw new Error('Wait for the cloud pass to finish opening.');
    if (this.saved && (this.saved.shared || wipe) && !(await this.syncNow())) throw new Error('Finish saving before leaving this shared computer. Reconnect and try again, or export a backup first.');
    if (this.inFlight) await this.inFlight;
    const shared = this.saved?.shared; this.stopping = true; clearTimeout(this.timer);
    this.options.tab.removeItem(SESSION_KEY); this.options.local.removeItem(SESSION_KEY);
    this.saved = null; this.keys = null; this.phrase = null;
    if (wipe || shared) this.options.wipe?.(); this.stopping = false; this.update('guest');
  }
  async deleteCloud(): Promise<void> {
    if (this.inFlight) await this.inFlight;
    if (!this.keys) throw new Error('No cloud pass is open.');
    this.stopping = true; clearTimeout(this.timer);
    try { await this.request('DELETE', this.keys); }
    catch (e) { this.stopping = false; this.fail(e); throw new Error(this.view.error); }
    const shared = this.saved?.shared;
    this.options.tab.removeItem(SESSION_KEY); this.options.local.removeItem(SESSION_KEY);
    this.saved = null; this.keys = null; this.phrase = null; if (shared) this.options.wipe?.(); this.stopping = false; this.update('guest');
  }
  dispose() { this.active = false; this.phrase = null; clearTimeout(this.timer); }
}
